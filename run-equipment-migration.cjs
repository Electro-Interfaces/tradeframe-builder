/**
 * Equipment Migration Runner
 * Runs the equipment database migrations in sequence
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Starting Equipment Migration...\n');

  try {
    // Step 1: Run schema migration
    console.log('📊 Step 1: Creating equipment database schema...');
    const schemaSQL = fs.readFileSync(path.join(__dirname, 'migrations', '006_equipment_schema.sql'), 'utf8');
    
    const { error: schemaError } = await supabase.rpc('exec_sql', { sql: schemaSQL });
    if (schemaError) {
      console.error('❌ Schema migration failed:', schemaError);
      throw schemaError;
    }
    console.log('✅ Equipment schema created successfully');

    // Step 2: Seed data
    console.log('📊 Step 2: Seeding equipment data...');
    const seedSQL = fs.readFileSync(path.join(__dirname, 'migrations', '007_equipment_seed_data.sql'), 'utf8');
    
    const { error: seedError } = await supabase.rpc('exec_sql', { sql: seedSQL });
    if (seedError) {
      console.error('❌ Seed data migration failed:', seedError);
      throw seedError;
    }
    console.log('✅ Equipment seed data created successfully');

    // Step 3: Verify installation
    console.log('📊 Step 3: Verifying installation...');
    
    // Check tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .in('table_name', ['equipment_templates', 'equipment', 'equipment_events', 'equipment_components'])
      .eq('table_schema', 'public');

    if (tablesError) {
      console.error('❌ Table verification failed:', tablesError);
      throw tablesError;
    }

    const tableNames = tables.map(t => t.table_name);
    const expectedTables = ['equipment_templates', 'equipment', 'equipment_events', 'equipment_components'];
    
    console.log('📋 Tables created:', tableNames);
    
    for (const table of expectedTables) {
      if (!tableNames.includes(table)) {
        throw new Error(`Missing table: ${table}`);
      }
    }

    // Check data
    const { data: templatesCount, error: templatesError } = await supabase
      .from('equipment_templates')
      .select('count()', { count: 'exact' });
      
    if (templatesError) {
      console.error('❌ Templates count check failed:', templatesError);
      throw templatesError;
    }

    const { data: equipmentCount, error: equipmentError } = await supabase
      .from('equipment')
      .select('count()', { count: 'exact' });
      
    if (equipmentError) {
      console.error('❌ Equipment count check failed:', equipmentError);
      throw equipmentError;
    }

    console.log(`📊 Equipment templates: ${templatesCount[0].count}`);
    console.log(`📊 Equipment instances: ${equipmentCount[0].count}`);

    // Step 4: Test API endpoints
    console.log('📊 Step 4: Testing basic queries...');
    
    // Test template query
    const { data: sampleTemplates, error: sampleTemplatesError } = await supabase
      .from('equipment_templates')
      .select('id, name, system_type, status')
      .limit(3);
      
    if (sampleTemplatesError) {
      console.error('❌ Template query failed:', sampleTemplatesError);
      throw sampleTemplatesError;
    }

    console.log('✅ Sample templates:', sampleTemplates.map(t => `${t.name} (${t.system_type})`));

    // Test equipment query
    const { data: sampleEquipment, error: sampleEquipmentError } = await supabase
      .from('equipment')
      .select(`
        id, 
        display_name, 
        system_type, 
        status,
        trading_point:trading_points(name)
      `)
      .limit(3);
      
    if (sampleEquipmentError) {
      console.error('❌ Equipment query failed:', sampleEquipmentError);
      throw sampleEquipmentError;
    }

    console.log('✅ Sample equipment:', sampleEquipment.map(e => `${e.display_name} (${e.status})`));

    console.log('\n🎉 Equipment Migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • Equipment Templates: ${templatesCount[0].count}`);
    console.log(`   • Equipment Instances: ${equipmentCount[0].count}`);
    console.log(`   • Tables: ${tableNames.length}/4 created`);
    console.log(`   • API Ready: ✅`);
    console.log('\n🚀 Equipment section is ready for production use!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Helper function for SQL execution (if not available as RPC)
async function executeSQLFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const statements = sql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

  for (const statement of statements) {
    if (statement.trim()) {
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      if (error) {
        console.error('SQL Error:', error);
        console.error('Statement:', statement.substring(0, 100) + '...');
        throw error;
      }
    }
  }
}

// Run migration
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };