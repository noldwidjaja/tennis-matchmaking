const { Pool } = require('pg');

// Connect to the default postgres database to create our new database
const pool = new Pool({
  host: 'switchyard.proxy.rlwy.net',
  port: 16205,
  user: 'postgres',
  password: 'htjBSAYnRFRuNITNdyaMNLiDXzQXqbWL',
  database: 'postgres', // Connect to default postgres database
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

async function createDatabase() {
  console.log('Creating tennis-matchmaking database...');

  try {
    const client = await pool.connect();
    
    try {
      // Check if database exists
      const dbExists = await client.query(`
        SELECT 1 FROM pg_database WHERE datname = 'tennis-matchmaking'
      `);
      
      if (dbExists.rows.length > 0) {
        console.log('Database tennis-matchmaking already exists');
      } else {
        // Create the database
        await client.query('CREATE DATABASE "tennis-matchmaking"');
        console.log('Database tennis-matchmaking created successfully');
      }
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Failed to create database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run database creation
createDatabase().catch(console.error);