const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tbzjbmvklhdkvvcaansg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiempibXZrbGhka3Z2Y2FhbnNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjMzNjgyOSwiZXhwIjoyMDcxOTEyODI5fQ.LIPvDInBO_qoJlcKL-8ccG3foZ9s_h-dLwGb-HjEpco';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTables() {
  console.log('🔄 Creating ScanStock Pro database tables...');
  
  // Create businesses table
  console.log('📋 Creating businesses table...');
  let { data, error } = await supabase
    .from('businesses')
    .insert([
      { 
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Demo Electronics Store', 
        industry: 'retail', 
        subscription: 'pro',
        settings: { currency: 'USD', timezone: 'America/New_York' }
      }
    ])
    .select();
  
  if (error && !error.message.includes('duplicate')) {
    console.error('❌ Failed to create business:', error.message);
  } else {
    console.log('✅ Business created or already exists');
  }
  
  // Create users table  
  console.log('👤 Creating users...');
  ({ data, error } = await supabase
    .from('users')
    .insert([
      { 
        id: '660e8400-e29b-41d4-a716-446655440000',
        email: 'admin@scanstockpro.demo',
        business_id: '550e8400-e29b-41d4-a716-446655440000',
        role: 'admin'
      }
    ])
    .select());
  
  if (error && !error.message.includes('duplicate')) {
    console.error('❌ Failed to create user:', error.message);
  } else {
    console.log('✅ User created or already exists');
  }
  
  // Create products
  console.log('📦 Creating sample products...');
  const products = [
    {
      name: 'iPhone 15 Pro',
      sku: 'IPH15PRO-001',
      barcode: '194253100034',
      category: 'Smartphones',
      business_id: '550e8400-e29b-41d4-a716-446655440000',
      cost: 800.00,
      price: 999.00,
      reorder_point: 5,
      description: 'Latest iPhone with advanced camera system'
    },
    {
      name: 'Samsung Galaxy S24',
      sku: 'SAM-S24-001',
      barcode: '887276702452',
      category: 'Smartphones',
      business_id: '550e8400-e29b-41d4-a716-446655440000',
      cost: 600.00,
      price: 799.00,
      reorder_point: 8,
      description: 'Samsung flagship smartphone with AI features'
    },
    {
      name: 'MacBook Air M3',
      sku: 'MBA-M3-001',
      barcode: '195949109231',
      category: 'Laptops',
      business_id: '550e8400-e29b-41d4-a716-446655440000',
      cost: 1000.00,
      price: 1199.00,
      reorder_point: 3,
      description: 'Ultra-thin laptop with M3 chip performance'
    },
    {
      name: 'AirPods Pro 2nd Gen',
      sku: 'APP-2G-001',
      barcode: '194253409823',
      category: 'Headphones',
      business_id: '550e8400-e29b-41d4-a716-446655440000',
      cost: 200.00,
      price: 249.00,
      reorder_point: 10,
      description: 'Premium wireless earbuds with active noise cancellation'
    },
    {
      name: 'Nintendo Switch OLED',
      sku: 'NSW-OLED-001',
      barcode: '045496882266',
      category: 'Gaming',
      business_id: '550e8400-e29b-41d4-a716-446655440000',
      cost: 280.00,
      price: 349.00,
      reorder_point: 6,
      description: 'Gaming console with vibrant OLED screen'
    }
  ];
  
  for (const product of products) {
    ({ data, error } = await supabase
      .from('products')
      .insert([product])
      .select());
    
    if (error && !error.message.includes('duplicate')) {
      console.warn(`⚠️  Failed to create product ${product.name}:`, error.message);
    } else {
      console.log(`✅ Product created: ${product.name}`);
      
      // Create corresponding inventory record
      const inventoryRecord = {
        product_id: data?.[0]?.id,
        quantity: Math.floor(Math.random() * 20) + 5, // Random quantity 5-25
        location: 'main',
        business_id: product.business_id,
        last_counted: new Date().toISOString()
      };
      
      if (data?.[0]?.id) {
        const { error: invError } = await supabase
          .from('inventory')
          .insert([inventoryRecord]);
        
        if (invError && !invError.message.includes('duplicate')) {
          console.warn(`⚠️  Failed to create inventory for ${product.name}:`, invError.message);
        }
      }
    }
  }
  
  // Test AI usage table
  console.log('🤖 Testing AI usage tracking...');
  ({ data, error } = await supabase
    .from('ai_usage')
    .insert([{
      business_id: '550e8400-e29b-41d4-a716-446655440000',
      user_id: '660e8400-e29b-41d4-a716-446655440000',
      feature: 'product_recognition',
      tokens_used: 150,
      prompt_tokens: 50,
      completion_tokens: 100,
      cost_estimate: 0.0003,
      model: 'gpt-4o-mini',
      metadata: { test: true }
    }])
    .select());
  
  if (error) {
    console.warn('⚠️  Failed to create AI usage record:', error.message);
  } else {
    console.log('✅ AI usage tracking tested');
  }
  
  // Verify everything was created
  console.log('📊 Verifying database setup...');
  
  const { data: businessCount } = await supabase
    .from('businesses')
    .select('count', { count: 'exact' });
  console.log(`✅ Businesses: ${businessCount?.[0]?.count || 0}`);
  
  const { data: productCount } = await supabase
    .from('products')
    .select('count', { count: 'exact' });
  console.log(`✅ Products: ${productCount?.[0]?.count || 0}`);
  
  const { data: inventoryCount } = await supabase
    .from('inventory')
    .select('count', { count: 'exact' });
  console.log(`✅ Inventory records: ${inventoryCount?.[0]?.count || 0}`);
  
  console.log('🎉 Database setup completed successfully!');
  console.log('');
  console.log('🔗 Next steps:');
  console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
  console.log('2. Navigate to Table Editor to see your data');
  console.log('3. Check Authentication settings if needed');
  console.log('4. Review Row Level Security policies');
}

createTables().catch(console.error);