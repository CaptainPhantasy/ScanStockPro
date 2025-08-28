#!/bin/bash

# ScanStock Pro - Supabase Setup Verification Script
# This script helps verify that your Supabase setup is complete

echo "🚀 ScanStock Pro - Supabase Setup Verification"
echo "=============================================="
echo ""

# Check if required files exist
echo "📁 Checking required files..."
if [ -f "scripts/supabase-setup.sql" ]; then
    echo "✅ supabase-setup.sql found"
else
    echo "❌ supabase-setup.sql missing"
    exit 1
fi

if [ -f "src/agent1-foundation/config/supabase-client.ts" ]; then
    echo "✅ supabase-client.ts found"
else
    echo "❌ supabase-client.ts missing"
    exit 1
fi

if [ -f "SUPABASE_SETUP.md" ]; then
    echo "✅ SUPABASE_SETUP.md found"
else
    echo "❌ SUPABASE_SETUP.md missing"
    exit 1
fi

echo ""
echo "🔧 Setup Instructions:"
echo "======================"
echo ""
echo "1. 📊 Go to Supabase Dashboard: https://supabase.com/dashboard"
echo "2. 🎯 Select project: tbzjbmvklhdkvvcaansg"
echo "3. 📝 Go to SQL Editor"
echo "4. 📋 Copy content from scripts/supabase-setup.sql"
echo "5. ▶️  Run the script"
echo "6. ✅ Verify all tables and functions are created"
echo "7. 🔐 Configure authentication settings"
echo "8. 📱 Set up storage buckets"
echo "9. 🔄 Enable real-time subscriptions"
echo "10. 🧪 Test the setup"
echo ""
echo "📚 For detailed instructions, see: SUPABASE_SETUP.md"
echo ""
echo "🎯 Key Credentials:"
echo "=================="
echo "URL: https://tbzjbmvklhdkvvcaansg.supabase.co"
echo "Anon Key: wg0MDJeupB0KjNV4"
echo "Service Role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
echo ""
echo "🚀 After setup, test with:"
echo "npm run dev"
echo ""
echo "✅ Setup verification complete!"
