# 🚀 ScanStock Pro - Supabase Setup Guide

**Project**: ScanStock Pro 4-Agent Mobile Inventory Management PWA  
**Database**: Supabase (PostgreSQL)  
**Status**: Ready for Setup  

---

## 📋 **Prerequisites**

- ✅ Supabase project created: `tbzjbmvklhdkvvcaansg`
- ✅ Database URL: `https://tbzjbmvklhdkvvcaansg.supabase.co`
- ✅ Anonymous Key: `wg0MDJeupB0KjNV4`
- ✅ Service Role Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- ✅ OpenAI API Key: `your_openai_api_key_here`

---

## 🗄️ **Database Setup**

### **Step 1: Access Supabase Dashboard**

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select project: `tbzjbmvklhdkvvcaansg`

### **Step 2: Run Database Schema**

1. Navigate to **SQL Editor** in the left sidebar
2. Click **New Query**
3. Copy and paste the entire content of `scripts/supabase-setup.sql`
4. Click **Run** to execute the script

**Expected Output**:
```
🎉 ScanStock Pro Database Setup Complete!
✅ All tables created with RLS enabled
✅ All functions and triggers created
✅ All indexes created for mobile optimization
✅ All security policies applied
✅ Real-time subscriptions enabled
```

### **Step 3: Verify Setup**

After running the script, you should see verification queries showing:
- ✅ 7 tables created
- ✅ RLS enabled on all tables
- ✅ 5 functions created
- ✅ All indexes created

---

## 🔐 **Authentication Setup**

### **Step 1: Configure Auth Settings**

1. Go to **Authentication** → **Settings**
2. Configure the following:

**Site URL**: `http://localhost:3000` (for development)  
**Redirect URLs**: 
- `http://localhost:3000/auth/callback`
- `http://localhost:3001/auth/callback`
- `http://localhost:3002/auth/callback`
- `http://localhost:3003/auth/callback`

**Email Templates**: Customize as needed for your business

### **Step 2: Enable Email Auth**

1. Go to **Authentication** → **Providers**
2. Ensure **Email** is enabled
3. Configure email settings if needed

### **Step 3: Set Up RLS Policies**

The setup script automatically creates RLS policies, but verify they're working:

```sql
-- Test RLS policies
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('businesses', 'products', 'inventory_counts');
```

---

## 📱 **Storage Setup (Mobile Images)**

### **Step 1: Create Storage Buckets**

1. Go to **Storage** → **Buckets**
2. Create the following buckets:

**Bucket Name**: `product-images`  
**Public**: ✅ Yes  
**File Size Limit**: 10MB  
**Allowed MIME Types**: `image/*`

**Bucket Name**: `inventory-evidence`  
**Public**: ✅ Yes  
**File Size Limit**: 5MB  
**Allowed MIME Types**: `image/*, audio/*`

### **Step 2: Configure Storage Policies**

Run these SQL commands to set up storage policies:

```sql
-- Product images bucket policy
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true);

-- Inventory evidence bucket policy
INSERT INTO storage.buckets (id, name, public) 
VALUES ('inventory-evidence', 'inventory-evidence', true);

-- Storage policies for authenticated users
CREATE POLICY "Users can upload product images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'product-images' AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Users can view product images" ON storage.objects
    FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Users can upload evidence" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'inventory-evidence' AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Users can view evidence" ON storage.objects
    FOR SELECT USING (bucket_id = 'inventory-evidence');
```

---

## 🔄 **Real-time Setup**

### **Step 1: Enable Realtime**

1. Go to **Database** → **Replication**
2. Ensure **Realtime** is enabled
3. Verify these tables are enabled for realtime:
   - `inventory_counts`
   - `products`
   - `counting_sessions`

### **Step 2: Test Real-time**

The setup script automatically enables realtime, but you can verify:

```sql
-- Check realtime publications
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

---

## 🧪 **Testing the Setup**

### **Step 1: Test Database Connection**

```sql
-- Test basic connectivity
SELECT version();

-- Test table creation
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Test function creation
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
ORDER BY routine_name;
```

### **Step 2: Test RLS Policies**

```sql
-- Test business creation (should work for authenticated users)
INSERT INTO businesses (name, owner_id) 
VALUES ('Test Business', auth.uid());

-- Test product creation
INSERT INTO products (business_id, name, current_quantity) 
VALUES (
    (SELECT id FROM businesses WHERE name = 'Test Business' LIMIT 1),
    'Test Product',
    100
);
```

### **Step 3: Test Mobile Functions**

```sql
-- Test mobile-optimized product query
SELECT * FROM get_products_mobile(
    (SELECT id FROM businesses WHERE name = 'Test Business' LIMIT 1),
    10, 0, NULL, NULL
);

-- Test sync batch processing
SELECT process_sync_batch(
    auth.uid(),
    'test-device-123',
    '[{"operation_type": "create", "table_name": "products", "data": {"name": "Test", "current_quantity": 50}}]'::jsonb
);
```

---

## 🔧 **Environment Configuration**

### **Step 1: Update Environment Variables**

Update your `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://tbzjbmvklhdkvvcaansg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=wg0MDJeupB0KjNV4
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiempibXZrbGhka3Z2Y2FhbnNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjMzNjgyOSwiZXhwIjoyMDcxOTEyODI5fQ.LIPvDInBO_qoJlcKL-8ccG3foZ9s_h-dLwGb-HjEpco

# OpenAI Configuration (Client Provided)
OPENAI_API_KEY=your_openai_api_key_here

# Mobile Configuration
NEXT_PUBLIC_MOBILE_FIRST=true
NEXT_PUBLIC_OFFLINE_SYNC_ENABLED=true
NEXT_PUBLIC_REALTIME_ENABLED=true
```

### **Step 2: Test Configuration**

Run the health check:

```typescript
import { checkSupabaseHealth } from './src/agent1-foundation/config/supabase-client';

const health = await checkSupabaseHealth();
console.log('Supabase Health:', health);
```

---

## 🚀 **Next Steps After Setup**

### **Immediate Actions**
1. ✅ **Database Schema**: Complete
2. ✅ **Authentication**: Configured
3. ✅ **Storage**: Set up buckets
4. ✅ **Real-time**: Enabled
5. 🔄 **Testing**: Run verification queries

### **Development Actions**
1. **Test Authentication Flow**
   - Sign up/sign in
   - Create test business
   - Add team members

2. **Test Mobile Features**
   - Product creation
   - Inventory counting
   - Real-time updates
   - Offline sync

3. **Test AI Integration**
   - OpenAI API connectivity
   - Product recognition
   - Image processing

---

## 🆘 **Troubleshooting**

### **Common Issues**

**RLS Policy Errors**:
```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

**Real-time Not Working**:
```sql
-- Verify realtime tables
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

**Storage Upload Failures**:
```sql
-- Check storage policies
SELECT * FROM storage.policies;
```

### **Support Resources**
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

## 📊 **Setup Verification Checklist**

- [ ] Database schema created successfully
- [ ] All 7 tables exist with correct structure
- [ ] RLS policies enabled on all tables
- [ ] All 5 functions created and working
- [ ] Real-time subscriptions enabled
- [ ] Storage buckets created
- [ ] Storage policies configured
- [ ] Authentication settings configured
- [ ] Environment variables set
- [ ] Health check passes
- [ ] Test data can be created
- [ ] Mobile functions work correctly

---

## 🎉 **Setup Complete!**

Once all items are checked, your Supabase backend is ready for ScanStock Pro development!

**Next**: Test the mobile app integration and begin development with all 4 agents.

---

*Last Updated: August 27, 2025*  
*ScanStock Pro 4-Agent Development Team*
