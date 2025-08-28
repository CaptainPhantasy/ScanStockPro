-- ScanStock Pro Database Schema
-- Mobile-first inventory management system
-- Agent 1: Foundation & Infrastructure

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- =============================================
-- CORE BUSINESS TABLES
-- =============================================

-- Businesses table with subscription management
CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_tier VARCHAR(50) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
    openai_api_key_encrypted TEXT, -- Client's encrypted API key
    settings JSONB DEFAULT '{"mobile_first": true, "auto_sync": true, "batch_size": 50}',
    billing_info JSONB DEFAULT '{}',
    usage_metrics JSONB DEFAULT '{"api_calls": 0, "storage_mb": 0}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members and roles
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
    permissions JSONB DEFAULT '{"count": true, "edit": false, "admin": false}',
    invited_by UUID REFERENCES auth.users(id),
    invited_email VARCHAR(255), -- For pending invitations
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
    UNIQUE(business_id, user_id)
);

-- =============================================
-- PRODUCT MANAGEMENT
-- =============================================

-- Products with mobile-optimized structure
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    barcode VARCHAR(50),
    sku VARCHAR(100),
    category VARCHAR(100),
    description TEXT,
    current_quantity INTEGER DEFAULT 0,
    min_quantity INTEGER DEFAULT 0,
    max_quantity INTEGER,
    unit_cost DECIMAL(10,2),
    sell_price DECIMAL(10,2),
    
    -- Image storage (Supabase Storage URLs)
    images JSONB DEFAULT '[]',
    
    -- AI recognition and metadata
    ai_metadata JSONB DEFAULT '{}',
    ai_confidence DECIMAL(3,2),
    ai_last_scanned TIMESTAMPTZ,
    
    -- Mobile optimization fields
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    access_count INTEGER DEFAULT 0,
    
    -- Location tracking
    locations JSONB DEFAULT '[]', -- Array of warehouse locations
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_quantity CHECK (current_quantity >= 0),
    CONSTRAINT valid_min_max CHECK (min_quantity <= max_quantity OR max_quantity IS NULL)
);

-- Product categories for efficient filtering
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    parent_id UUID REFERENCES product_categories(id),
    color VARCHAR(7), -- Hex color for mobile UI
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, name)
);

-- =============================================
-- INVENTORY TRACKING & REAL-TIME SYNC
-- =============================================

-- Real-time inventory counts (core table for mobile sync)
CREATE TABLE IF NOT EXISTS inventory_counts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    session_id UUID, -- Links to counting sessions
    
    -- Count details
    quantity INTEGER NOT NULL,
    previous_quantity INTEGER,
    quantity_difference INTEGER GENERATED ALWAYS AS (quantity - COALESCE(previous_quantity, 0)) STORED,
    
    -- Location and user tracking
    location VARCHAR(100),
    counted_by UUID REFERENCES auth.users(id),
    device_info JSONB DEFAULT '{}', -- Mobile device metadata
    gps_coordinates JSONB, -- For warehouse location tracking
    
    -- Mobile sync management
    offline_synced BOOLEAN DEFAULT false,
    sync_batch_id UUID,
    conflict_resolved BOOLEAN DEFAULT false,
    conflict_data JSONB,
    
    -- Timestamps
    counted_at TIMESTAMPTZ DEFAULT NOW(),
    synced_at TIMESTAMPTZ,
    
    -- Audit trail
    notes TEXT,
    images JSONB DEFAULT '[]', -- Evidence photos
    voice_notes JSONB DEFAULT '[]', -- Voice recordings
    
    -- Mobile performance
    network_quality VARCHAR(20), -- 'excellent', 'good', 'poor', 'offline'
    sync_priority INTEGER DEFAULT 1, -- Higher number = higher priority
    
    CONSTRAINT positive_count CHECK (quantity >= 0)
);

-- Counting sessions for collaboration
CREATE TABLE IF NOT EXISTS counting_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Session management
    created_by UUID REFERENCES auth.users(id),
    participants JSONB DEFAULT '[]', -- Array of user IDs
    
    -- Status and settings
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    settings JSONB DEFAULT '{"allow_negative": false, "require_photos": false, "voice_enabled": true}',
    
    -- Location constraints
    allowed_locations JSONB DEFAULT '[]',
    gps_fence JSONB, -- Geofencing data
    
    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Statistics
    total_counts INTEGER DEFAULT 0,
    unique_products INTEGER DEFAULT 0,
    total_participants INTEGER DEFAULT 0
);

-- =============================================
-- OFFLINE SYNC & CONFLICT RESOLUTION
-- =============================================

-- Offline sync queue for mobile devices
CREATE TABLE IF NOT EXISTS sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    device_id VARCHAR(255) NOT NULL,
    
    -- Operation details
    operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('create', 'update', 'delete')),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID,
    
    -- Data payload
    operation_data JSONB NOT NULL,
    original_data JSONB, -- For conflict resolution
    
    -- Sync management
    priority INTEGER DEFAULT 1,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'conflict')),
    error_message TEXT,
    conflict_resolution VARCHAR(20) CHECK (conflict_resolution IN ('server_wins', 'client_wins', 'merge', 'manual')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    
    -- Network context
    network_info JSONB DEFAULT '{}',
    
    INDEX idx_sync_queue_pending ON sync_queue(status, priority DESC, scheduled_at ASC),
    INDEX idx_sync_queue_user_device ON sync_queue(user_id, device_id)
);

-- =============================================
-- MOBILE PERFORMANCE OPTIMIZATION
-- =============================================

-- Mobile-specific indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_products_business_barcode ON products(business_id, barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_business_sku ON products(business_id, sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_business_name ON products(business_id, name);
CREATE INDEX IF NOT EXISTS idx_products_business_category ON products(business_id, category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_last_accessed ON products(business_id, last_accessed DESC);

-- Real-time sync indexes
CREATE INDEX IF NOT EXISTS idx_counts_sync ON inventory_counts(offline_synced, sync_priority DESC, counted_at ASC);
CREATE INDEX IF NOT EXISTS idx_counts_product_recent ON inventory_counts(product_id, counted_at DESC);
CREATE INDEX IF NOT EXISTS idx_counts_session ON inventory_counts(session_id, counted_at DESC) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_counts_user_device ON inventory_counts(counted_by, device_info) WHERE offline_synced = false;

-- Business and team indexes
CREATE INDEX IF NOT EXISTS idx_team_members_business ON team_members(business_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id, status) WHERE status = 'active';

-- Session management indexes
CREATE INDEX IF NOT EXISTS idx_sessions_business_active ON counting_sessions(business_id, status, started_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_sessions_participant ON counting_sessions USING GIN(participants);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE counting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- Businesses policies
CREATE POLICY "Users can view their own businesses" ON businesses
    FOR SELECT USING (
        owner_id = auth.uid() OR 
        id IN (SELECT business_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
    );

CREATE POLICY "Business owners can update their businesses" ON businesses
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create businesses" ON businesses
    FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Team members policies
CREATE POLICY "Team members can view their team" ON team_members
    FOR SELECT USING (
        user_id = auth.uid() OR 
        business_id IN (
            SELECT business_id FROM team_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Admins can manage team members" ON team_members
    FOR ALL USING (
        business_id IN (
            SELECT business_id FROM team_members 
            WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
        )
    );

-- Products policies
CREATE POLICY "Team members can view business products" ON products
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM team_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Users with edit permissions can modify products" ON products
    FOR ALL USING (
        business_id IN (
            SELECT business_id FROM team_members 
            WHERE user_id = auth.uid() 
            AND status = 'active'
            AND (permissions->>'edit')::boolean = true
        )
    );

-- Product categories policies
CREATE POLICY "Team members can view categories" ON product_categories
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM team_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Inventory counts policies
CREATE POLICY "Team members can view inventory counts" ON inventory_counts
    FOR SELECT USING (
        product_id IN (
            SELECT id FROM products 
            WHERE business_id IN (
                SELECT business_id FROM team_members 
                WHERE user_id = auth.uid() AND status = 'active'
            )
        )
    );

CREATE POLICY "Users with count permissions can create counts" ON inventory_counts
    FOR INSERT WITH CHECK (
        counted_by = auth.uid() AND
        product_id IN (
            SELECT id FROM products 
            WHERE business_id IN (
                SELECT business_id FROM team_members 
                WHERE user_id = auth.uid() 
                AND status = 'active'
                AND (permissions->>'count')::boolean = true
            )
        )
    );

-- Counting sessions policies
CREATE POLICY "Team members can view sessions" ON counting_sessions
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM team_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Sync queue policies (users can only access their own sync queue)
CREATE POLICY "Users can manage their own sync queue" ON sync_queue
    FOR ALL USING (user_id = auth.uid());

-- =============================================
-- REAL-TIME SUBSCRIPTIONS
-- =============================================

-- Enable real-time for inventory counts (critical for mobile sync)
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_counts;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE counting_sessions;

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update product quantity on inventory count
CREATE OR REPLACE FUNCTION update_product_quantity()
RETURNS TRIGGER AS $$
BEGIN
    -- Store previous quantity for audit
    NEW.previous_quantity = (
        SELECT current_quantity FROM products 
        WHERE id = NEW.product_id
    );
    
    -- Update product's current quantity
    UPDATE products 
    SET current_quantity = NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.product_id;
    
    -- Update session statistics
    IF NEW.session_id IS NOT NULL THEN
        UPDATE counting_sessions
        SET total_counts = total_counts + 1,
            updated_at = NOW()
        WHERE id = NEW.session_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_product_quantity_trigger
    BEFORE INSERT ON inventory_counts
    FOR EACH ROW EXECUTE FUNCTION update_product_quantity();

-- Mobile access tracking for products
CREATE OR REPLACE FUNCTION track_product_access()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_accessed = NOW();
    NEW.access_count = OLD.access_count + 1;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER track_product_access_trigger
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION track_product_access();

-- =============================================
-- MOBILE OPTIMIZATION FUNCTIONS
-- =============================================

-- Function to get mobile-optimized product list
CREATE OR REPLACE FUNCTION get_products_mobile(
    p_business_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_search TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    barcode VARCHAR(50),
    sku VARCHAR(100),
    current_quantity INTEGER,
    category VARCHAR(100),
    last_counted TIMESTAMPTZ,
    images JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.barcode,
        p.sku,
        p.current_quantity,
        p.category,
        (
            SELECT MAX(counted_at) 
            FROM inventory_counts ic 
            WHERE ic.product_id = p.id
        ) as last_counted,
        CASE 
            WHEN jsonb_array_length(COALESCE(p.images, '[]'::jsonb)) > 0 
            THEN jsonb_build_array(p.images->0) -- Only first image for mobile
            ELSE '[]'::jsonb
        END as images
    FROM products p
    WHERE p.business_id = p_business_id
    AND (p_search IS NULL OR p.name ILIKE '%' || p_search || '%' OR p.sku ILIKE '%' || p_search || '%')
    AND (p_category IS NULL OR p.category = p_category)
    ORDER BY p.last_accessed DESC, p.name ASC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for batch sync operations (mobile offline sync)
CREATE OR REPLACE FUNCTION process_sync_batch(
    p_user_id UUID,
    p_device_id VARCHAR(255),
    p_operations JSONB
)
RETURNS JSONB AS $$
DECLARE
    result JSONB := '{"processed": 0, "failed": 0, "conflicts": 0, "errors": []}'::jsonb;
    operation JSONB;
    op_result JSONB;
BEGIN
    -- Process each operation in the batch
    FOR operation IN SELECT jsonb_array_elements(p_operations)
    LOOP
        BEGIN
            -- Insert into sync queue for processing
            INSERT INTO sync_queue (
                user_id,
                device_id,
                operation_type,
                table_name,
                record_id,
                operation_data,
                priority
            ) VALUES (
                p_user_id,
                p_device_id,
                operation->>'operation_type',
                operation->>'table_name',
                (operation->>'record_id')::UUID,
                operation->'data',
                COALESCE((operation->>'priority')::INTEGER, 1)
            );
            
            result := jsonb_set(result, '{processed}', 
                ((result->>'processed')::INTEGER + 1)::TEXT::jsonb);
                
        EXCEPTION WHEN OTHERS THEN
            result := jsonb_set(result, '{failed}', 
                ((result->>'failed')::INTEGER + 1)::TEXT::jsonb);
            result := jsonb_set(result, '{errors}', 
                result->'errors' || jsonb_build_array(SQLERRM));
        END;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SCHEDULED MAINTENANCE (using pg_cron)
-- =============================================

-- Clean up old sync queue entries (run daily at 2 AM)
SELECT cron.schedule('cleanup-sync-queue', '0 2 * * *', $$
    DELETE FROM sync_queue 
    WHERE status IN ('completed', 'failed') 
    AND processed_at < NOW() - INTERVAL '7 days';
$$);

-- Update business usage metrics (run hourly)
SELECT cron.schedule('update-usage-metrics', '0 * * * *', $$
    UPDATE businesses SET 
        usage_metrics = jsonb_set(
            usage_metrics,
            '{last_updated}',
            to_jsonb(NOW())
        );
$$);

-- =============================================
-- INITIAL DATA SEEDING
-- =============================================

-- Create default product categories
INSERT INTO product_categories (id, business_id, name, color, sort_order) 
VALUES 
    (uuid_generate_v4(), NULL, 'Electronics', '#3B82F6', 1),
    (uuid_generate_v4(), NULL, 'Clothing', '#EF4444', 2),
    (uuid_generate_v4(), NULL, 'Food & Beverage', '#10B981', 3),
    (uuid_generate_v4(), NULL, 'Office Supplies', '#8B5CF6', 4),
    (uuid_generate_v4(), NULL, 'Tools', '#F59E0B', 5)
ON CONFLICT DO NOTHING;

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;