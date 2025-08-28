import { SupabaseClient } from '@supabase/supabase-js'
import { supabaseServerClient, Database } from '../config/supabase'
import { 
  ProductRepository, 
  InventoryRepository, 
  BusinessRepository,
  ProductSchema,
  InventorySchema,
  BusinessSchema,
  User
} from '../../shared/contracts/agent-interfaces'

// Base repository with common functionality
abstract class BaseRepository {
  protected supabase: SupabaseClient<Database>

  constructor(supabaseClient?: SupabaseClient<Database>) {
    this.supabase = supabaseClient || supabaseServerClient!
    
    if (!this.supabase) {
      throw new Error('Supabase client not available')
    }
  }

  protected handleError(error: any, operation: string): never {
    console.error(`Repository error in ${operation}:`, error)
    throw new Error(`Database operation failed: ${operation}`)
  }
}

// Product Repository Implementation
export class SupabaseProductRepository extends BaseRepository implements ProductRepository {
  async create(data: Partial<ProductSchema>): Promise<ProductSchema> {
    try {
      const { data: product, error } = await this.supabase
        .from('products')
        .insert({
          name: data.name!,
          sku: data.sku || null,
          barcode: data.barcode || null,
          category: data.category || null,
          business_id: data.businessId!,
          current_quantity: data.currentQuantity || 0,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      return this.transformProduct(product)
    } catch (error) {
      this.handleError(error, 'create product')
    }
  }

  async findById(id: string): Promise<ProductSchema | null> {
    try {
      const { data: product, error } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null // Not found
        throw error
      }

      return this.transformProduct(product)
    } catch (error) {
      this.handleError(error, 'find product by id')
    }
  }

  async findByBarcode(barcode: string): Promise<ProductSchema | null> {
    try {
      const { data: product, error } = await this.supabase
        .from('products')
        .select('*')
        .eq('barcode', barcode)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null // Not found
        throw error
      }

      return this.transformProduct(product)
    } catch (error) {
      this.handleError(error, 'find product by barcode')
    }
  }

  async update(id: string, data: Partial<ProductSchema>): Promise<ProductSchema> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      if (data.name) updateData.name = data.name
      if (data.sku !== undefined) updateData.sku = data.sku
      if (data.barcode !== undefined) updateData.barcode = data.barcode
      if (data.category !== undefined) updateData.category = data.category

      const { data: product, error } = await this.supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return this.transformProduct(product)
    } catch (error) {
      this.handleError(error, 'update product')
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Delete product error:', error)
      return false
    }
  }

  async search(query: string): Promise<ProductSchema[]> {
    try {
      const { data: products, error } = await this.supabase
        .from('products')
        .select('*')
        .or(`name.ilike.%${query}%,sku.ilike.%${query}%,barcode.ilike.%${query}%`)
        .order('name')
        .limit(50) // Mobile optimization

      if (error) throw error

      return products?.map(p => this.transformProduct(p)) || []
    } catch (error) {
      this.handleError(error, 'search products')
    }
  }

  async list(
    businessId: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<{ data: ProductSchema[]; total: number }> {
    try {
      const offset = (page - 1) * limit

      const [productsResult, countResult] = await Promise.all([
        this.supabase
          .from('products')
          .select('*')
          .eq('business_id', businessId)
          .order('name')
          .range(offset, offset + limit - 1),
        
        this.supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', businessId)
      ])

      if (productsResult.error) throw productsResult.error
      if (countResult.error) throw countResult.error

      return {
        data: productsResult.data?.map(p => this.transformProduct(p)) || [],
        total: countResult.count || 0
      }
    } catch (error) {
      this.handleError(error, 'list products')
    }
  }

  private transformProduct(product: any): ProductSchema {
    return {
      id: product.id,
      name: product.name,
      sku: product.sku || '',
      barcode: product.barcode || '',
      category: product.category || '',
      businessId: product.business_id,
      createdAt: new Date(product.created_at),
      updatedAt: new Date(product.updated_at)
    }
  }
}

// Inventory Repository Implementation
export class SupabaseInventoryRepository extends BaseRepository implements InventoryRepository {
  async create(data: Partial<InventorySchema>): Promise<InventorySchema> {
    try {
      const { data: inventory, error } = await this.supabase
        .from('inventory_counts')
        .insert({
          product_id: data.productId!,
          quantity: data.quantity!,
          location: data.location || null,
          counted_at: new Date().toISOString()
        })
        .select(`
          id,
          product_id,
          quantity,
          location,
          counted_at,
          products:product_id (business_id)
        `)
        .single()

      if (error) throw error

      return this.transformInventory(inventory)
    } catch (error) {
      this.handleError(error, 'create inventory record')
    }
  }

  async findByProduct(productId: string): Promise<InventorySchema[]> {
    try {
      const { data: inventory, error } = await this.supabase
        .from('inventory_counts')
        .select(`
          id,
          product_id,
          quantity,
          location,
          counted_at,
          products:product_id (business_id)
        `)
        .eq('product_id', productId)
        .order('counted_at', { ascending: false })
        .limit(100)

      if (error) throw error

      return inventory?.map(i => this.transformInventory(i)) || []
    } catch (error) {
      this.handleError(error, 'find inventory by product')
    }
  }

  async update(id: string, data: Partial<InventorySchema>): Promise<InventorySchema> {
    try {
      const updateData: any = {}
      if (data.quantity !== undefined) updateData.quantity = data.quantity
      if (data.location !== undefined) updateData.location = data.location

      const { data: inventory, error } = await this.supabase
        .from('inventory_counts')
        .update(updateData)
        .eq('id', id)
        .select(`
          id,
          product_id,
          quantity,
          location,
          counted_at,
          products:product_id (business_id)
        `)
        .single()

      if (error) throw error

      return this.transformInventory(inventory)
    } catch (error) {
      this.handleError(error, 'update inventory')
    }
  }

  async getHistory(productId: string, days: number = 30): Promise<InventorySchema[]> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)

      const { data: inventory, error } = await this.supabase
        .from('inventory_counts')
        .select(`
          id,
          product_id,
          quantity,
          location,
          counted_at,
          products:product_id (business_id)
        `)
        .eq('product_id', productId)
        .gte('counted_at', cutoffDate.toISOString())
        .order('counted_at', { ascending: false })

      if (error) throw error

      return inventory?.map(i => this.transformInventory(i)) || []
    } catch (error) {
      this.handleError(error, 'get inventory history')
    }
  }

  async bulkUpdate(updates: Array<{ id: string; quantity: number }>): Promise<InventorySchema[]> {
    try {
      const results: InventorySchema[] = []

      // Process in batches for mobile optimization
      const batchSize = 10
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize)
        
        const batchPromises = batch.map(async update => {
          const { data, error } = await this.supabase
            .from('inventory_counts')
            .update({ quantity: update.quantity })
            .eq('id', update.id)
            .select(`
              id,
              product_id,
              quantity,
              location,
              counted_at,
              products:product_id (business_id)
            `)
            .single()

          if (error) throw error
          return this.transformInventory(data)
        })

        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults)
      }

      return results
    } catch (error) {
      this.handleError(error, 'bulk update inventory')
    }
  }

  private transformInventory(inventory: any): InventorySchema {
    return {
      id: inventory.id,
      productId: inventory.product_id,
      quantity: inventory.quantity,
      location: inventory.location || '',
      lastCounted: new Date(inventory.counted_at),
      businessId: inventory.products.business_id
    }
  }
}

// Business Repository Implementation
export class SupabaseBusinessRepository extends BaseRepository implements BusinessRepository {
  async findById(id: string): Promise<BusinessSchema | null> {
    try {
      const { data: business, error } = await this.supabase
        .from('businesses')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null // Not found
        throw error
      }

      return this.transformBusiness(business)
    } catch (error) {
      this.handleError(error, 'find business by id')
    }
  }

  async update(id: string, data: Partial<BusinessSchema>): Promise<BusinessSchema> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      if (data.name) updateData.name = data.name
      if (data.subscription) updateData.subscription_tier = data.subscription
      if (data.settings) updateData.settings = data.settings

      const { data: business, error } = await this.supabase
        .from('businesses')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return this.transformBusiness(business)
    } catch (error) {
      this.handleError(error, 'update business')
    }
  }

  async getUsers(businessId: string): Promise<User[]> {
    try {
      // Get team members first
      const { data: teamMembers, error } = await this.supabase
        .from('team_members')
        .select('user_id, role, permissions, status')
        .eq('business_id', businessId)
        .eq('status', 'active')

      if (error) throw error

      // Get user details from auth admin (requires service key)
      const users: User[] = []
      if (teamMembers) {
        for (const tm of teamMembers) {
          try {
            const { data: { user }, error: userError } = await this.supabase.auth.admin.getUserById(tm.user_id)
            if (!userError && user) {
              users.push({
                id: user.id,
                email: user.email || '',
                businessId: businessId,
                role: tm.role as 'admin' | 'user' | 'viewer',
                sessionId: undefined
              })
            }
          } catch (userError) {
            console.warn(`Failed to get user ${tm.user_id}:`, userError)
            // Add user with minimal info
            users.push({
              id: tm.user_id,
              email: 'Unknown',
              businessId: businessId,
              role: tm.role as 'admin' | 'user' | 'viewer',
              sessionId: undefined
            })
          }
        }
      }

      return users
    } catch (error) {
      this.handleError(error, 'get business users')
    }
  }

  async getSettings(businessId: string): Promise<Record<string, any>> {
    try {
      const { data: business, error } = await this.supabase
        .from('businesses')
        .select('settings')
        .eq('id', businessId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return {} // Not found
        throw error
      }

      return business.settings || {}
    } catch (error) {
      this.handleError(error, 'get business settings')
    }
  }

  private transformBusiness(business: any): BusinessSchema {
    return {
      id: business.id,
      name: business.name,
      subscription: business.subscription_tier,
      settings: business.settings || {}
    }
  }
}

// Repository factory for dependency injection
export class RepositoryFactory {
  private static instance: RepositoryFactory
  private repositories: Map<string, any> = new Map()

  static getInstance(): RepositoryFactory {
    if (!RepositoryFactory.instance) {
      RepositoryFactory.instance = new RepositoryFactory()
    }
    return RepositoryFactory.instance
  }

  getProductRepository(supabaseClient?: SupabaseClient<Database>): ProductRepository {
    const key = 'products'
    if (!this.repositories.has(key)) {
      this.repositories.set(key, new SupabaseProductRepository(supabaseClient))
    }
    return this.repositories.get(key)
  }

  getInventoryRepository(supabaseClient?: SupabaseClient<Database>): InventoryRepository {
    const key = 'inventory'
    if (!this.repositories.has(key)) {
      this.repositories.set(key, new SupabaseInventoryRepository(supabaseClient))
    }
    return this.repositories.get(key)
  }

  getBusinessRepository(supabaseClient?: SupabaseClient<Database>): BusinessRepository {
    const key = 'business'
    if (!this.repositories.has(key)) {
      this.repositories.set(key, new SupabaseBusinessRepository(supabaseClient))
    }
    return this.repositories.get(key)
  }

  clearCache(): void {
    this.repositories.clear()
  }
}

// Export singleton factory
export const repositoryFactory = RepositoryFactory.getInstance()

// Export individual repositories for direct use
export const productRepository = repositoryFactory.getProductRepository()
export const inventoryRepository = repositoryFactory.getInventoryRepository()
export const businessRepository = repositoryFactory.getBusinessRepository()