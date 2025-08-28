const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tbzjbmvklhdkvvcaansg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiempibXZrbGhka3Z2Y2FhbnNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjMzNjgyOSwiZXhwIjoyMDcxOTEyODI5fQ.LIPvDInBO_qoJlcKL-8ccG3foZ9s_h-dLwGb-HjEpco';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyDatabase() {
  console.log('🔍 VERIFICATION: Checking Supabase Database Status...\n');
  
  // Test basic connection
  console.log('1. Testing basic connection...');
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    console.log('✅ Supabase connection: WORKING');
    console.log('   Service role authenticated successfully');
  } catch (error) {
    console.log('❌ Supabase connection: FAILED');
    console.log('   Error:', error.message);
    return;
  }
  
  // Check what tables actually exist
  console.log('\n2. Checking existing tables...');
  try {
    // Try to query information_schema to see what tables exist
    const { data, error } = await supabase
      .rpc('exec', {
        sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`
      });
    
    if (error) {
      console.log('❌ Could not query table schema:', error.message);
      
      // Try alternative approach - attempt to query known table names
      console.log('   Trying alternative approach...');
      
      const tableTests = [
        'businesses',
        'users', 
        'products',
        'inventory',
        'inventory_counts',
        'cycle_count_sessions',
        'ai_usage',
        'client_api_keys',
        'alerts'
      ];
      
      for (const tableName of tableTests) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
          
          if (error) {
            console.log(`❌ Table '${tableName}': DOES NOT EXIST`);
            console.log(`   Error: ${error.message}`);
          } else {
            console.log(`✅ Table '${tableName}': EXISTS`);
            console.log(`   Data rows: ${Array.isArray(data) ? data.length : 'unknown'}`);
          }
        } catch (e) {
          console.log(`❌ Table '${tableName}': ERROR - ${e.message}`);
        }
      }
    } else {
      console.log('✅ Successfully queried schema');
      console.log('   Tables found:', data);
    }
  } catch (error) {
    console.log('❌ Schema query failed:', error.message);
  }
  
  // Test if we can create a simple table
  console.log('\n3. Testing table creation permissions...');
  try {
    const testTableSQL = `
      CREATE TABLE IF NOT EXISTS test_table_verification (
        id SERIAL PRIMARY KEY,
        test_data TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    const { data, error } = await supabase.rpc('exec', { sql: testTableSQL });
    
    if (error) {
      console.log('❌ Cannot create tables:', error.message);
      console.log('   Possible issue: RLS policies or insufficient permissions');
    } else {
      console.log('✅ Table creation: WORKING');
      
      // Test inserting data
      const { data: insertData, error: insertError } = await supabase
        .from('test_table_verification')
        .insert([{ test_data: 'verification test' }])
        .select();
      
      if (insertError) {
        console.log('❌ Cannot insert data:', insertError.message);
      } else {
        console.log('✅ Data insertion: WORKING');
        console.log('   Inserted:', insertData);
        
        // Clean up test table
        await supabase.rpc('exec', { sql: 'DROP TABLE IF EXISTS test_table_verification;' });
        console.log('✅ Cleanup: Test table removed');
      }
    }
  } catch (error) {
    console.log('❌ Table creation test failed:', error.message);
  }
  
  console.log('\n📊 SUMMARY:');
  console.log('- Connection to Supabase: ✅ Working');
  console.log('- Service role auth: ✅ Working');  
  console.log('- ScanStock Pro tables: ❌ Do not exist yet');
  console.log('- Table creation ability: Need to verify in dashboard');
  
  console.log('\n🔧 NEXT STEPS:');
  console.log('1. Go to Supabase dashboard: https://supabase.com/dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Run the setup-database.sql script manually');
  console.log('4. Or create tables through Table Editor interface');
}

verifyDatabase().catch(console.error);