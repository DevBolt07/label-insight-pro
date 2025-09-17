import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Product = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];

// Types for product analysis
export interface Ingredient {
  name: string;
  percentage: number | null;
  is_harmful: boolean;
  category: string; // good, moderate, harmful
}

export interface HealthAlert {
  type: string;
  message: string;
  severity: string; // low, medium, high
}

export interface ProductAnalysis {
  product_name: string;
  brand: string;
  health_score: number;
  ingredients: Ingredient[];
  alerts: HealthAlert[];
  nutri_score: string;
  processing_level: string;
  personalized_recommendations: string[];
  barcode?: string;
}

// New method to analyze product using Open Food Facts API
export const analyzeProduct = async (barcode: string, healthConditions: string[] = []): Promise<ProductAnalysis> => {
  try {
    // First try to get from our database
    const existingProduct = await productService.getProductByBarcode(barcode);
    if (existingProduct) {
      // Convert our database product to the analysis format
      return {
        product_name: existingProduct.name,
        brand: existingProduct.brand,
        health_score: existingProduct.health_score,
        ingredients: existingProduct.ingredients as unknown as Ingredient[],
        alerts: existingProduct.alerts as unknown as HealthAlert[],
        nutri_score: existingProduct.nutri_score,
        processing_level: existingProduct.processing_level,
        personalized_recommendations: existingProduct.recommendations as string[],
        barcode: existingProduct.barcode
      };
    }

    // If not in our database, fetch from Open Food Facts API
    const response = await fetch('http://localhost:8000/analyze-product', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        barcode,
        health_conditions: healthConditions
      })
    });
    
    if (!response.ok) {
      throw new Error('Product not found');
    }
    
    const productData = await response.json();
    
    // Save to our database for future use
    try {
      await productService.createOrUpdateProduct({
        barcode: barcode,
        name: productData.product_name,
        brand: productData.brand,
        health_score: productData.health_score,
        ingredients: productData.ingredients,
        alerts: productData.alerts,
        nutri_score: productData.nutri_score,
        processing_level: productData.processing_level,
        recommendations: productData.personalized_recommendations,
        is_verified: false // Mark as not verified since it's from external API
      });
    } catch (dbError) {
      console.error('Error saving product to database:', dbError);
      // Continue even if saving fails
    }
    
    return productData;
  } catch (error) {
    console.error('Error analyzing product:', error);
    throw error;
  }
};

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
  },

  // Method to search products by name using Open Food Facts API
  async searchProduct(productName: string): Promise<any[]> {
    try {
      const response = await fetch(`http://localhost:8000/search-product/${encodeURIComponent(productName)}`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error searching product:', error);
      throw error;
    }
  }
};