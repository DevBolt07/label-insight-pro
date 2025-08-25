import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Favorite = Database['public']['Tables']['favorites']['Row'];
type FavoriteInsert = Database['public']['Tables']['favorites']['Insert'];

export const favoritesService = {
  async getUserFavorites(userId: string): Promise<Favorite[]> {
    const { data, error } = await supabase
      .from('favorites')
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
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching favorites:', error);
      throw error;
    }

    return data || [];
  },

  async addToFavorites(userId: string, productId: string): Promise<Favorite> {
    const { data, error } = await supabase
      .from('favorites')
      .insert({ user_id: userId, product_id: productId })
      .select()
      .single();

    if (error) {
      console.error('Error adding to favorites:', error);
      throw error;
    }

    return data;
  },

  async removeFromFavorites(userId: string, productId: string): Promise<void> {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (error) {
      console.error('Error removing from favorites:', error);
      throw error;
    }
  },

  async isFavorite(userId: string, productId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .maybeSingle();

    if (error) {
      console.error('Error checking favorite status:', error);
      return false;
    }

    return !!data;
  }
};