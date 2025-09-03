const fs = require('fs');
const csv = require('csv-parser');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: 'switchyard.proxy.rlwy.net',
  port: 16205,
  user: 'postgres',
  password: 'htjBSAYnRFRuNITNdyaMNLiDXzQXqbWL',
  database: 'tennis-matchmaking',
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

async function migrateData() {
  console.log('Starting PostgreSQL migration...');

  try {
    // First, ensure tables are created
    const client = await pool.connect();
    
    try {
      // Players table
      await client.query(`
        CREATE TABLE IF NOT EXISTS players (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          group_name TEXT CHECK(group_name IN ('A', 'B')) NOT NULL,
          mmr INTEGER NOT NULL DEFAULT 1200,
          wins INTEGER NOT NULL DEFAULT 0,
          losses INTEGER NOT NULL DEFAULT 0,
          matches_played INTEGER NOT NULL DEFAULT 0
        )
      `);

      // Teams table
      await client.query(`
        CREATE TABLE IF NOT EXISTS teams (
          id SERIAL PRIMARY KEY,
          player1_id INTEGER NOT NULL REFERENCES players(id),
          player2_id INTEGER NOT NULL REFERENCES players(id),
          team_mmr INTEGER NOT NULL,
          active_status BOOLEAN NOT NULL DEFAULT TRUE,
          UNIQUE(player1_id, player2_id)
        )
      `);

      // Matches table
      await client.query(`
        CREATE TABLE IF NOT EXISTS matches (
          id SERIAL PRIMARY KEY,
          team1_id INTEGER NOT NULL REFERENCES teams(id),
          team2_id INTEGER NOT NULL REFERENCES teams(id),
          winner_team_id INTEGER REFERENCES teams(id),
          mmr_change INTEGER NOT NULL DEFAULT 0,
          date TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      
      console.log('Tables created successfully');

      // Clear existing data and import fresh
      console.log('Clearing existing data...');
      await client.query('TRUNCATE TABLE matches, teams, players RESTART IDENTITY CASCADE');
      console.log('Existing data cleared.');

      // Import players from CSV
      console.log('Importing players from CSV...');
      const players = [];
      
      await new Promise((resolve, reject) => {
        let isFirstRow = true;
        fs.createReadStream('./data.csv')
          .pipe(csv(['A', 'B'])) // Specify column names since CSV doesn't have proper headers
          .on('data', (row) => {
            if (isFirstRow) {
              // Skip the header row (A,B)
              isFirstRow = false;
              return;
            }
            
            // Add players from both columns
            if (row.A?.trim()) {
              players.push({
                name: row.A.trim(),
                group: 'A'
              });
            }
            if (row.B?.trim()) {
              players.push({
                name: row.B.trim(),
                group: 'B'
              });
            }
          })
          .on('end', resolve)
          .on('error', reject);
      });

      // Insert players
      let importedCount = 0;
      for (const player of players) {
        if (player.name && player.group) {
          await client.query(
            'INSERT INTO players (name, group_name) VALUES ($1, $2)',
            [player.name, player.group]
          );
          console.log(`Imported player: ${player.name} (Group ${player.group})`);
          importedCount++;
        }
      }

      console.log(`Successfully imported ${importedCount} players`);
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }

  console.log('Migration completed successfully!');
}

// Run migration
migrateData().catch(console.error);