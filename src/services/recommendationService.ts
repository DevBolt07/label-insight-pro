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
      
      // Default healthy recommendations for Indian market
      const defaultRecommendations: SmartRecommendation[] = [
        {
          id: "rec_1",
          name: "Organic Tulsi Green Tea",
          description: "Premium Indian Tulsi green tea with natural antioxidants and immunity boosters",
          image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop",
          category: "Beverages",
          score: 95,
          grade: "A",
          price: "₹299",
          trending: true,
          reason: "High in antioxidants, supports immunity",
          amazonLink: "https://www.amazon.in/s?k=organic+tulsi+green+tea"
        },
        {
          id: "rec_2",
          name: "Quinoa & Oats Mix",
          description: "Protein-rich breakfast blend with ancient grains and modern nutrition",
          image: "https://images.unsplash.com/photo-1549741072-aae3d327526b?w=400&h=300&fit=crop",
          category: "Breakfast",
          score: 92,
          grade: "A",
          price: "₹349",
          reason: "High protein, gluten-free option",
          amazonLink: "https://www.amazon.in/s?k=quinoa+oats+breakfast"
        },
        {
          id: "rec_3",
          name: "Fresh Coconut Water",
          description: "Pure coconut water from Kerala, rich in electrolytes and potassium",
          image: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=300&fit=crop",
          category: "Beverages",
          score: 93,
          grade: "A",
          price: "₹45",
          trending: true,
          reason: "Natural electrolytes, no added sugar",
          amazonLink: "https://www.amazon.in/s?k=fresh+coconut+water"
        },
        {
          id: "rec_4",
          name: "Millet Energy Bars",
          description: "Traditional millets with dates and nuts for sustained energy",
          image: "https://images.unsplash.com/photo-1448043552756-e747b7a2b2b8?w=400&h=300&fit=crop",
          category: "Snacks",
          score: 89,
          grade: "A",
          price: "₹249",
          reason: "Low glycemic index, high fiber",
          amazonLink: "https://www.amazon.in/s?k=millet+energy+bars"
        }
      ];

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
      
      // Return fallback recommendations
      return [
        {
          id: "fallback_1",
          name: "Organic Green Tea",
          description: "Pure organic green tea with natural antioxidants",
          image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop",
          category: "Beverages",
          score: 95,
          grade: "A",
          price: "₹250",
          reason: "Recommended for overall health",
          amazonLink: "https://www.amazon.in/s?k=organic+green+tea"
        }
      ];
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
