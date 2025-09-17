import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { ProductAnalysis } from './productService';

type ScanHistory = Database['public']['Tables']['scan_history']['Row'];
type ScanHistoryInsert = Database['public']['Tables']['scan_history']['Insert'];

export const scanHistoryService = {
  async getUserScanHistory(userId: string, limit = 50): Promise<ScanHistory[]> {
    const { data, error } = await supabase
      .from('scan_history')
      .select(`
        *,
        products (
          name,
          brand,
          image_url,
          grade,
          health_score,
          nutriscore,
          nova_group,
          categories,
          health_warnings,
          ingredients,
          allergens,
          additives,
          nutrition_facts
        )
      `)
      .eq('user_id', userId)
      .order('scanned_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching scan history:', error);
      throw error;
    }

    return data || [];
  },

  async addScanToHistory(scan: ScanHistoryInsert): Promise<ScanHistory> {
    const { data, error } = await supabase
      .from('scan_history')
      .insert(scan)
      .select()
      .single();

    if (error) {
      console.error('Error adding scan to history:', error);
      throw error;
    }

    return data;
  },

  async addScanWithProductData(
    user_id: string, 
    product_id: string, 
    scan_method: string,
    product_data: ProductAnalysis
  ): Promise<ScanHistory> {
    const { data, error } = await supabase
      .from('scan_history')
      .insert({
        user_id,
        product_id,
        scan_method,
        product_data // This stores the complete product analysis
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding scan to history:', error);
      throw error;
    }

    return data;
  },

  async deleteScanFromHistory(scanId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('scan_history')
      .delete()
      .eq('id', scanId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting scan from history:', error);
      throw error;
    }
  },

  async getRecentScans(userId: string, limit = 5): Promise<ScanHistory[]> {
    const { data, error } = await supabase
      .from('scan_history')
      .select(`
        *,
        products (
          name,
          brand,
          image_url,
          grade,
          health_score,
          categories
        )
      `)
      .eq('user_id', userId)
      .order('scanned_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent scans:', error);
      throw error;
    }

    return data || [];
  },

  async getScanHistoryWithProductData(userId: string): Promise<(ScanHistory & { product_data: ProductAnalysis })[]> {
    const { data, error } = await supabase
      .from('scan_history')
      .select('*')
      .eq('user_id', userId)
      .order('scanned_at', { ascending: false });

    if (error) {
      console.error('Error fetching scan history:', error);
      throw error;
    }

    // Cast the product_data to our ProductAnalysis type
    return (data || []).map(item => ({
      ...item,
      product_data: item.product_data as unknown as ProductAnalysis
    }));
  }
};