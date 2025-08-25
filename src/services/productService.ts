import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Product = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];

export const productService = {
  async getProductByBarcode(barcode: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .maybeSingle();

    if (error) {
      console.error('Error fetching product by barcode:', error);
      throw error;
    }

    return data;
  },

  async createOrUpdateProduct(product: ProductInsert): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .upsert(product, { onConflict: 'barcode' })
      .select()
      .single();

    if (error) {
      console.error('Error creating/updating product:', error);
      throw error;
    }

    return data;
  },

  async getProductById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching product by ID:', error);
      throw error;
    }

    return data;
  },

  async getFeaturedProducts(limit = 10): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_verified', true)
      .order('health_score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching featured products:', error);
      throw error;
    }

    return data || [];
  }
};