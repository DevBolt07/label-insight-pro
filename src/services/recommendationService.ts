import { supabase } from '@/integrations/supabase/client';
import { productService } from './productService';

export interface SmartRecommendation {
  id: string;
  name: string;
  description: string;
  image: string;
  category: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
  price: string;
  trending?: boolean;
  reason: string; // Why this is recommended
  amazonLink: string;
}

export const recommendationService = {
  async getPersonalizedRecommendations(userId: string): Promise<SmartRecommendation[]> {
    try {
      // Get user profile to understand their health needs
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Get user's scan history to understand preferences
      const { data: scanHistory } = await supabase
        .from('scan_history')
        .select('*, products(*)')
        .eq('user_id', userId)
        .order('scanned_at', { ascending: false })
        .limit(10);

      // Get high-rated products from database
      const healthyProducts = await productService.getFeaturedProducts(20);

      // Filter and personalize recommendations based on user profile
      const recommendations: SmartRecommendation[] = [];
      
      // No default recommendations - only show real scanned products
      const defaultRecommendations: SmartRecommendation[] = [];

      // Personalize based on health conditions
      if (profile) {
        const healthConditions = profile.health_conditions || [];
        const allergies = profile.allergies || [];
        
        // Filter out products with allergens
        const safeRecommendations = defaultRecommendations.filter(rec => {
          // Basic allergen check (you can enhance this)
          const hasAllergen = allergies.some((allergen: string) => 
            rec.name.toLowerCase().includes(allergen.toLowerCase()) ||
            rec.description.toLowerCase().includes(allergen.toLowerCase())
          );
          return !hasAllergen;
        });

        // Add health-specific reasons
        return safeRecommendations.map(rec => {
          let personalizedReason = rec.reason;
          
          if (healthConditions.includes('diabetes')) {
            if (rec.name.includes('Millet') || rec.name.includes('Quinoa')) {
              personalizedReason += " • Great for blood sugar management";
            }
          }
          
          if (healthConditions.includes('hypertension')) {
            if (rec.name.includes('Coconut Water')) {
              personalizedReason += " • Helps maintain healthy blood pressure";
            }
          }

          return {
            ...rec,
            reason: personalizedReason
          };
        });
      }

      return defaultRecommendations;
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      
      // Return empty array - no fallback recommendations
      return [];
    }
  },

  async getAlternativeProducts(productId: string): Promise<SmartRecommendation[]> {
    // Get healthier alternatives to a scanned product
    try {
      const product = await productService.getProductById(productId);
      if (!product) return [];

      // Find products in same category with better health scores
      const alternatives = await productService.getFeaturedProducts(10);
      
      return alternatives
        .filter(alt => alt.health_score > (product.health_score || 0))
        .slice(0, 3)
        .map(alt => ({
          id: alt.id,
          name: alt.name,
          description: `Healthier alternative with ${alt.health_score - (product.health_score || 0)} points higher health score`,
          image: alt.image_url || '',
          category: alt.categories || 'General',
          score: alt.health_score || 0,
          grade: alt.grade as 'A' | 'B' | 'C' | 'D' | 'E',
          price: '₹299', // Default price
          reason: 'Better nutritional profile',
          amazonLink: `https://www.amazon.in/s?k=${encodeURIComponent(alt.name)}`
        }));
    } catch (error) {
      console.error('Error getting alternative products:', error);
      return [];
    }
  }
};
