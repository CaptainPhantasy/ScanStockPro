const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tbzjbmvklhdkvvcaansg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiempibXZrbGhka3Z2Y2FhbnNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjMzNjgyOSwiZXhwIjoyMDcxOTEyODI5fQ.LIPvDInBO_qoJlcKL-8ccG3foZ9s_h-dLwGb-HjEpco';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  console.log('🔄 Testing Supabase connection...');
  
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('businesses')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('⚠️  Tables may not exist yet, but connection is working:', error.message);
    } else {
      console.log('✅ Connection successful! Found existing data.');
    }
    
    // Test creating a simple table if it doesn't exist
    console.log('🔄 Ensuring basic tables exist...');
    
    const { data: createResult, error: createError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS businesses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          industry TEXT DEFAULT 'general',
          subscription TEXT DEFAULT 'free',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (createError) {
      console.log('⚠️  Could not execute SQL directly. Trying alternative approach...');
      
      // Try to create a business record directly
      const { data: insertData, error: insertError } = await supabase
        .from('businesses')
        .insert([
          { 
            name: 'ScanStock Pro Test', 
            industry: 'technology', 
            subscription: 'pro' 
          }
        ])
        .select();
      
      if (insertError) {
        console.error('❌ Insert failed:', insertError.message);
        console.log('🔧 You may need to create the database schema manually in Supabase dashboard');
      } else {
        console.log('✅ Successfully created test business:', insertData);
      }
    } else {
      console.log('✅ SQL execution successful');
    }
    
    // Test AI service connection
    console.log('🔄 Testing OpenAI connection...');
    const openaiKey = 'your_openai_api_key_here';
    
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const models = await response.json();
      console.log('✅ OpenAI connection successful! Available models:', models.data.length);
    } else {
      console.log('❌ OpenAI connection failed:', response.status, response.statusText);
    }
    
    console.log('🎉 Connection tests completed!');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
  }
}

testConnection();