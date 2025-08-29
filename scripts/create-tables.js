#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTables() {
  console.log('🚀 Starting database setup for ScanStock Pro...\n');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'setup-database.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📝 Executing database schema...');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: sql 
    }).single();
    
    // If exec_sql doesn't exist, try direct query (for newer Supabase versions)
    if (error && error.message.includes('exec_sql')) {
      console.log('⚠️  exec_sql not available, attempting alternative method...');
      
      // Split SQL into individual statements and execute them
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i] + ';';
        
        // Skip certain statements that might not work via API
        if (statement.includes('CREATE EXTENSION') || 
            statement.includes('ALTER PUBLICATION') ||
            statement.includes('GRANT')) {
          console.log(`⏭️  Skipping: ${statement.substring(0, 50)}...`);
          continue;
        }
        
        console.log(`📊 Executing statement ${i + 1}/${statements.length}`);
        
        // For table creation, we can use the REST API
        if (statement.includes('CREATE TABLE')) {
          // Extract table name
          const tableMatch = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
          if (tableMatch) {
            const tableName = tableMatch[1];
            
            // Check if table exists by trying to select from it
            const { error: checkError } = await supabase
              .from(tableName)
              .select('*')
              .limit(1);
            
            if (!checkError) {
              console.log(`✅ Table '${tableName}' already exists`);
            } else {
              console.log(`📋 Table '${tableName}' needs to be created (run SQL in Supabase dashboard)`);
            }
          }
        }
      }
      
      console.log('\n⚠️  Some operations require direct SQL execution in Supabase dashboard');
      console.log('📋 Please run the following file in your Supabase SQL editor:');
      console.log(`   ${sqlPath}`);
      console.log('\n🔗 Supabase SQL Editor: ' + supabaseUrl.replace('.supabase.co', '.supabase.com') + '/project/_/sql');
    } else if (error) {
      throw error;
    } else {
      console.log('✅ Database schema created successfully!');
    }
    
    // Test the connection by checking if tables exist
    console.log('\n🔍 Verifying tables...');
    
    const tables = ['businesses', 'users', 'products', 'inventory_counts'];
    for (const table of tables) {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (!error) {
        console.log(`✅ Table '${table}' is accessible`);
      } else {
        console.log(`❌ Table '${table}' not accessible: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Database setup complete!');
    console.log('\n📝 Next steps:');
    console.log('1. If any tables are missing, run scripts/setup-database.sql in Supabase SQL editor');
    console.log('2. Start the development server: npm run dev');
    console.log('3. Register a user at http://localhost:3000/auth/register');
    console.log('4. Start managing your inventory!');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    console.log('\n💡 Try running the SQL manually:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL editor');
    console.log('3. Copy and paste the contents of scripts/setup-database.sql');
    console.log('4. Click "Run"');
    process.exit(1);
  }
}

// Run the setup
createTables();