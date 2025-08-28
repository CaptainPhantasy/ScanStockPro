const OpenAI = require('openai');

// Real OpenAI API key
const openaiKey = 'your_openai_api_key_here';

const openai = new OpenAI({
  apiKey: openaiKey,
  maxRetries: 3,
  timeout: 30000
});

async function testOpenAI() {
  console.log('🔄 Testing OpenAI integration...');
  
  try {
    // Test 1: List available models
    console.log('📋 Fetching available models...');
    const models = await openai.models.list();
    const gptModels = models.data.filter(m => m.id.includes('gpt')).slice(0, 5);
    console.log('✅ Available GPT models:', gptModels.map(m => m.id));
    
    // Test 2: Simple text generation
    console.log('💬 Testing text generation...');
    const textResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "List 5 common inventory management challenges in JSON format" }],
      max_tokens: 300,
      temperature: 0.1,
      response_format: { type: "json_object" }
    });
    
    console.log('✅ Text generation successful:');
    console.log(JSON.parse(textResponse.choices[0].message.content));
    console.log('📊 Usage:', textResponse.usage);
    
    // Test 3: Product categorization example
    console.log('🏷️  Testing product categorization...');
    const categorizationResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{
        role: "user",
        content: `Categorize these products for a retail electronics store:

Products: iPhone 15, MacBook Air, Samsung TV, Nintendo Switch, AirPods Pro

Return a JSON object with product names as keys and categories as values:
{
  "iPhone 15": "Smartphones",
  "MacBook Air": "Laptops"
}

Use logical, consistent categories appropriate for inventory management.`
      }],
      max_tokens: 200,
      temperature: 0.1,
      response_format: { type: "json_object" }
    });
    
    console.log('✅ Product categorization successful:');
    console.log(JSON.parse(categorizationResponse.choices[0].message.content));
    
    // Test 4: Description generation
    console.log('📝 Testing product description generation...');
    const descriptionResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{
        role: "user",
        content: `Generate professional product descriptions for an electronics store.
      
Products: iPhone 15, MacBook Air

Return a JSON object with product names as keys and descriptions as values:
{
  "iPhone 15": "Professional description highlighting key features and benefits",
  "MacBook Air": "Another engaging description..."
}

Make descriptions:
- Professional and informative
- 50-100 words each
- Include key features and benefits`
      }],
      max_tokens: 400,
      temperature: 0.3,
      response_format: { type: "json_object" }
    });
    
    console.log('✅ Description generation successful:');
    const descriptions = JSON.parse(descriptionResponse.choices[0].message.content);
    Object.entries(descriptions).forEach(([product, desc]) => {
      console.log(`${product}: ${desc}`);
    });
    
    // Calculate total cost
    const totalTokens = (textResponse.usage?.total_tokens || 0) + 
                       (categorizationResponse.usage?.total_tokens || 0) + 
                       (descriptionResponse.usage?.total_tokens || 0);
    
    const estimatedCost = totalTokens * 0.000002; // Rough estimate for gpt-3.5-turbo
    
    console.log('💰 Test completed successfully!');
    console.log(`📊 Total tokens used: ${totalTokens}`);
    console.log(`💲 Estimated cost: $${estimatedCost.toFixed(6)}`);
    
  } catch (error) {
    console.error('❌ OpenAI test failed:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
    }
  }
}

testOpenAI();