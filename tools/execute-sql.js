import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function executeSQL() {
  try {
    console.log('🔧 Reading SQL file...');
    const sqlContent = readFileSync('./tools/create-tanks-table.sql', 'utf-8');
    
    console.log('📝 Executing SQL commands...');
    
    // Разделяем SQL на отдельные команды
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    for (const command of commands) {
      if (command.length > 0) {
        console.log('➤ Executing:', command.substring(0, 50) + '...');
        
        const { data, error } = await supabase.rpc('execute_sql', {
          query: command
        });
        
        if (error) {
          console.error('❌ Error:', error);
        } else {
          console.log('✅ Success');
        }
      }
    }
    
    console.log('🎉 All SQL commands executed');
    
  } catch (error) {
    console.error('❌ Failed to execute SQL:', error);
  }
}

executeSQL();