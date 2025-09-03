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

async function createDoublesTeams() {
  console.log('Creating test doubles teams...');

  try {
    const client = await pool.connect();
    
    try {
      // Get players by group
      const groupAResult = await client.query(`
        SELECT id, name, mmr FROM players WHERE group_name = 'A' ORDER BY id LIMIT 8
      `);
      const groupBResult = await client.query(`
        SELECT id, name, mmr FROM players WHERE group_name = 'B' ORDER BY id LIMIT 8
      `);
      
      const groupAPlayers = groupAResult.rows;
      const groupBPlayers = groupBResult.rows;
      
      console.log(`Found ${groupAPlayers.length} Group A players, ${groupBPlayers.length} Group B players`);
      
      let createdCount = 0;
      
      // Create some doubles teams for Group A
      for (let i = 0; i < groupAPlayers.length - 1; i += 2) {
        const player1 = groupAPlayers[i];
        const player2 = groupAPlayers[i + 1];
        const teamMmr = Math.round((player1.mmr + player2.mmr) / 2);
        
        try {
          await client.query(`
            INSERT INTO teams (player1_id, player2_id, team_mmr, active_status) 
            VALUES ($1, $2, $3, TRUE)
          `, [player1.id, player2.id, teamMmr]);
          
          console.log(`Created doubles team: ${player1.name} & ${player2.name} (Group A, MMR: ${teamMmr})`);
          createdCount++;
        } catch (error) {
          if (error.code === '23505') {
            console.log(`Doubles team ${player1.name} & ${player2.name} already exists, skipping...`);
          } else {
            console.error(`Error creating team ${player1.name} & ${player2.name}:`, error.message);
          }
        }
      }
      
      // Create some doubles teams for Group B
      for (let i = 0; i < groupBPlayers.length - 1; i += 2) {
        const player1 = groupBPlayers[i];
        const player2 = groupBPlayers[i + 1];
        const teamMmr = Math.round((player1.mmr + player2.mmr) / 2);
        
        try {
          await client.query(`
            INSERT INTO teams (player1_id, player2_id, team_mmr, active_status) 
            VALUES ($1, $2, $3, TRUE)
          `, [player1.id, player2.id, teamMmr]);
          
          console.log(`Created doubles team: ${player1.name} & ${player2.name} (Group B, MMR: ${teamMmr})`);
          createdCount++;
        } catch (error) {
          if (error.code === '23505') {
            console.log(`Doubles team ${player1.name} & ${player2.name} already exists, skipping...`);
          } else {
            console.error(`Error creating team ${player1.name} & ${player2.name}:`, error.message);
          }
        }
      }
      
      console.log(`\n✅ Successfully created ${createdCount} doubles teams!`);
      
      // Show final summary
      const singlesTeamsResult = await client.query(`
        SELECT COUNT(*) as count FROM teams WHERE player1_id = player2_id
      `);
      const doublesTeamsResult = await client.query(`
        SELECT COUNT(*) as count FROM teams WHERE player1_id != player2_id
      `);
      
      console.log(`\n📊 Final Team Summary:`);
      console.log(`  - Singles teams: ${singlesTeamsResult.rows[0].count}`);
      console.log(`  - Doubles teams: ${doublesTeamsResult.rows[0].count}`);
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Failed to create doubles teams:', error);
  } finally {
    await pool.end();
  }
}

// Run the creation
createDoublesTeams().catch(console.error);