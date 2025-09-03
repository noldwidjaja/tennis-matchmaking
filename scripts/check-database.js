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

async function checkDatabase() {
  console.log('Checking tennis-matchmaking database contents...');

  try {
    const client = await pool.connect();
    
    try {
      // Check if tables exist
      const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      console.log('\n📊 Tables in database:');
      tables.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
      
      if (tables.rows.length === 0) {
        console.log('  ❌ No tables found!');
        return;
      }
      
      // Check players table
      try {
        const playersCount = await client.query('SELECT COUNT(*) FROM players');
        console.log(`\n👥 Players table: ${playersCount.rows[0].count} records`);
        
        if (parseInt(playersCount.rows[0].count) > 0) {
          const playersSample = await client.query('SELECT id, name, group_name FROM players LIMIT 5');
          console.log('Sample players:');
          playersSample.rows.forEach(player => {
            console.log(`  - ${player.id}: ${player.name} (Group ${player.group_name})`);
          });
        }
      } catch (error) {
        console.log('❌ Players table error:', error.message);
      }
      
      // Check teams table
      try {
        const teamsCount = await client.query('SELECT COUNT(*) FROM teams');
        console.log(`\n🏆 Teams table: ${teamsCount.rows[0].count} records`);
      } catch (error) {
        console.log('❌ Teams table error:', error.message);
      }
      
      // Check matches table
      try {
        const matchesCount = await client.query('SELECT COUNT(*) FROM matches');
        console.log(`\n🎾 Matches table: ${matchesCount.rows[0].count} records`);
      } catch (error) {
        console.log('❌ Matches table error:', error.message);
      }
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Failed to check database:', error);
  } finally {
    await pool.end();
  }
}

// Run database check
checkDatabase().catch(console.error);