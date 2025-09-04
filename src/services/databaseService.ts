import { Pool } from 'pg';

// PostgreSQL connection configuration using Supabase DATABASE_URL
const getDatabaseConfig = () => {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (databaseUrl) {
    // Use DATABASE_URL if available (Supabase connection string)
    return {
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false
      }
    };
  }
  
  // Fallback to individual environment variables for local PostgreSQL
  return {
    user: process.env.POSTGRES_USER || 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    database: process.env.POSTGRES_DB || 'tradeframe',
    password: process.env.POSTGRES_PASSWORD || 'password',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
  };
};

// Create a connection pool
const pool = new Pool(getDatabaseConfig());

// Database service class
export class DatabaseService {
  static async query(text: string, params?: any[]) {
    const client = await pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  static async getClient() {
    return await pool.connect();
  }

  static async testConnection() {
    try {
      const result = await this.query('SELECT NOW()');
      console.log('PostgreSQL connection successful:', result.rows[0]);
      return true;
    } catch (error) {
      console.error('PostgreSQL connection failed:', error);
      return false;
    }
  }

  // Helper method to list all tables
  static async getTables() {
    try {
      const result = await this.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      return result.rows.map(row => row.table_name);
    } catch (error) {
      console.error('Error fetching tables:', error);
      return [];
    }
  }

  // Helper method to describe table structure
  static async describeTable(tableName: string) {
    try {
      const result = await this.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [tableName]);
      return result.rows;
    } catch (error) {
      console.error(`Error describing table ${tableName}:`, error);
      return [];
    }
  }
}

export default DatabaseService;