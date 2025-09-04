// Test database connection and list tables
const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection configuration using Supabase DATABASE_URL
const getDatabaseConfig = () => {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (databaseUrl) {
    return {
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false
      }
    };
  }
  
  return {
    user: process.env.POSTGRES_USER || 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    database: process.env.POSTGRES_DB || 'tradeframe',
    password: process.env.POSTGRES_PASSWORD || 'password',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
  };
};

const pool = new Pool(getDatabaseConfig());

async function testDatabase() {
  console.log('🔍 Testing database connection...');
  
  try {
    // Test connection
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful:', result.rows[0]);
    
    // List all tables
    console.log('\n📋 Listing all tables:');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    
    if (tables.length === 0) {
      console.log('No tables found');
      return;
    }
    
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table}`);
    });
    
    console.log(`\nTotal tables: ${tables.length}`);
    
    // Show structure of first few tables
    console.log('\n📊 Table structures (first 3 tables):');
    for (let i = 0; i < Math.min(3, tables.length); i++) {
      const tableName = tables[i];
      console.log(`\n--- ${tableName} ---`);
      const columnsResult = await pool.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [tableName]);
      
      columnsResult.rows.forEach(col => {
        console.log(`  ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await pool.end();
  }
}

testDatabase().catch(console.error);