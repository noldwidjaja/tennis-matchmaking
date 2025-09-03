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

async function createSinglesTeams() {
  console.log('Creating test singles teams...');

  try {
    const client = await pool.connect();
    
    try {
      // Get all players
      const playersResult = await client.query('SELECT id, name, group_name, mmr FROM players ORDER BY id');
      const players = playersResult.rows;
      
      console.log(`Found ${players.length} players. Creating singles teams...`);
      
      // Create a singles "team" for each player (player paired with themselves)
      let createdCount = 0;
      for (const player of players) {
        try {
          await client.query(`
            INSERT INTO teams (player1_id, player2_id, team_mmr, active_status) 
            VALUES ($1, $1, $2, TRUE)
          `, [player.id, player.mmr]);
          
          console.log(`Created singles team for ${player.name} (MMR: ${player.mmr})`);
          createdCount++;
        } catch (error) {
          // Skip if team already exists (due to unique constraint)
          if (error.code === '23505') {
            console.log(`Singles team for ${player.name} already exists, skipping...`);
          } else {
            console.error(`Error creating team for ${player.name}:`, error.message);
          }
        }
      }
      
      console.log(`\n✅ Successfully created ${createdCount} singles teams!`);
      
      // Show summary
      const singlesTeamsResult = await client.query(`
        SELECT COUNT(*) as count FROM teams WHERE player1_id = player2_id
      `);
      const doublesTeamsResult = await client.query(`
        SELECT COUNT(*) as count FROM teams WHERE player1_id != player2_id
      `);
      
      console.log(`\n📊 Team Summary:`);
      console.log(`  - Singles teams: ${singlesTeamsResult.rows[0].count}`);
      console.log(`  - Doubles teams: ${doublesTeamsResult.rows[0].count}`);
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Failed to create singles teams:', error);
  } finally {
    await pool.end();
  }
}

// Run the creation
createSinglesTeams().catch(console.error);