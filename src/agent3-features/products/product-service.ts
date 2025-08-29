import { supabase } from '@/agent1-foundation/config/supabase-client';
import type { Database } from '@/agent1-foundation/config/supabase-client';

type Product = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

export class ProductService {
  /**
   * Get all products for a business
   */
  static async getProducts(businessId: string): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        throw new Error(`Failed to fetch products: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('ProductService.getProducts error:', error);
      throw error;
    }
  }

  /**
   * Get a single product by ID
   */
  static async getProduct(productId: string): Promise<Product | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Product not found
        }
        console.error('Error fetching product:', error);
        throw new Error(`Failed to fetch product: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('ProductService.getProduct error:', error);
      throw error;
    }
  }

  /**
   * Create a new product
   */
  static async createProduct(product: ProductInsert): Promise<Product> {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single();

      if (error) {
        console.error('Error creating product:', error);
        throw new Error(`Failed to create product: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('ProductService.createProduct error:', error);
      throw error;
    }
  }

  /**
   * Update an existing product
   */
  static async updateProduct(productId: string, updates: ProductUpdate): Promise<Product> {
    try {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', productId)
        .select()
        .single();

      if (error) {
        console.error('Error updating product:', error);
        throw new Error(`Failed to update product: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('ProductService.updateProduct error:', error);
      throw error;
    }
  }

  /**
   * Delete a product
   */
  static async deleteProduct(productId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) {
        console.error('Error deleting product:', error);
        throw new Error(`Failed to delete product: ${error.message}`);
      }
    } catch (error) {
      console.error('ProductService.deleteProduct error:', error);
      throw error;
    }
  }

  /**
   * Search products by name, SKU, or barcode
   */
  static async searchProducts(businessId: string, searchTerm: string): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,barcode.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error searching products:', error);
        throw new Error(`Failed to search products: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('ProductService.searchProducts error:', error);
      throw error;
    }
  }

  /**
   * Get products by category
   */
  static async getProductsByCategory(businessId: string, category: string): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .eq('category', category)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching products by category:', error);
        throw new Error(`Failed to fetch products by category: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('ProductService.getProductsByCategory error:', error);
      throw error;
    }
  }

  /**
   * Get low stock products (below minimum quantity)
   */
  static async getLowStockProducts(businessId: string): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .lt('current_quantity', 'min_quantity')
        .order('current_quantity', { ascending: true });

      if (error) {
        console.error('Error fetching low stock products:', error);
        throw new Error(`Failed to fetch low stock products: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('ProductService.getLowStockProducts error:', error);
      throw error;
    }
  }

  /**
   * Update product quantity (for inventory counts)
   */
  static async updateProductQuantity(productId: string, newQuantity: number): Promise<Product> {
    try {
      const { data, error } = await supabase
        .from('products')
        .update({ 
          current_quantity: newQuantity,
          last_accessed: new Date().toISOString(),
          access_count: supabase.rpc('increment', { row_id: productId, column_name: 'access_count' })
        })
        .eq('id', productId)
        .select()
        .single();

      if (error) {
        console.error('Error updating product quantity:', error);
        throw new Error(`Failed to update product quantity: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('ProductService.updateProductQuantity error:', error);
      throw error;
    }
  }
}