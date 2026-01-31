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
  barcode?: string;
}

export interface HealthProfile {
  user_id: string;
  health_conditions: string[];
  allergies: string[];
  dietary_restrictions: string[];
}

export const recommendationService = {
  async getPersonalizedRecommendations(userId: string): Promise<SmartRecommendation[]> {
    try {
      // Get user profile to understand their health needs
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return [];
      }

      // Get user's scan history to understand preferences
      const { data: scanHistory, error: historyError } = await supabase
        .from('scan_history')
        .select('*, products(*)')
        .eq('user_id', userId)
        .order('scanned_at', { ascending: false })
        .limit(10);

      if (historyError) {
        console.error('Error fetching scan history:', historyError);
      }

      // Get high-rated products from database
      const healthyProducts = await productService.getFeaturedProducts(20);

      // Generate personalized recommendations based on health profile
      return this.generatePersonalizedRecommendations(healthyProducts, profile, scanHistory || []);
      
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return [];
    }
  },

  async generatePersonalizedRecommendations(
    products: any[], 
    profile: HealthProfile | null, 
    scanHistory: any[]
  ): Promise<SmartRecommendation[]> {
    if (!products.length) return [];

    let filteredProducts = [...products];

    // Filter based on health conditions and allergies
    if (profile) {
      const conditions = profile.health_conditions || [];
      const allergies = profile.allergies || [];
      const restrictions = profile.dietary_restrictions || [];

      // Filter out allergens
      if (allergies.length > 0) {
        filteredProducts = filteredProducts.filter(product => 
          !this.containsAllergens(product, allergies)
        );
      }

      // Apply dietary restrictions
      if (restrictions.length > 0) {
        filteredProducts = filteredProducts.filter(product =>
          this.matchesDietaryRestrictions(product, restrictions)
        );
      }

      // Apply health condition filters
      filteredProducts = filteredProducts.map(product => 
        this.applyHealthConditionScoring(product, conditions)
      ).sort((a, b) => b.score - a.score);
    }

    // Convert to SmartRecommendation format
    return filteredProducts.slice(0, 8).map(product => ({
      id: product.id || product.barcode,
      name: product.product_name || product.name,
      description: product.description || this.generateProductDescription(product, profile),
      image: product.image_url || product.image_front_url || '/placeholder-product.jpg',
      category: product.categories || product.category || 'General',
      score: product.health_score || product.nutriscore || 75,
      grade: this.calculateGrade(product.health_score || product.nutriscore || 75),
      price: this.estimatePrice(product),
      trending: Math.random() > 0.7, // Random trending flag for demo
      reason: this.generateRecommendationReason(product, profile),
      amazonLink: this.generateAmazonLink(product),
      barcode: product.barcode
    }));
  },

  containsAllergens(product: any, allergies: string[]): boolean {
    const productText = JSON.stringify(product).toLowerCase();
    const allergenKeywords = this.getAllergenKeywords(allergies);
    
    return allergenKeywords.some(allergen => 
      productText.includes(allergen)
    );
  },

  getAllergenKeywords(allergies: string[]): string[] {
    const allergenMap: { [key: string]: string[] } = {
      'gluten': ['wheat', 'barley', 'rye', 'gluten'],
      'dairy': ['milk', 'cheese', 'cream', 'butter', 'yogurt', 'lactose'],
      'nuts': ['almond', 'cashew', 'walnut', 'peanut', 'hazelnut', 'pistachio'],
      'soy': ['soy', 'soya', 'tofu'],
      'eggs': ['egg', 'albumin'],
      'shellfish': ['shrimp', 'prawn', 'crab', 'lobster'],
      'fish': ['fish', 'tuna', 'salmon'],
      'sesame': ['sesame']
    };

    const keywords: string[] = [];
    allergies.forEach(allergy => {
      const allergyLower = allergy.toLowerCase();
      if (allergenMap[allergyLower]) {
        keywords.push(...allergenMap[allergyLower]);
      } else {
        keywords.push(allergyLower);
      }
    });
    
    return [...new Set(keywords)]; // Remove duplicates
  },

  matchesDietaryRestrictions(product: any, restrictions: string[]): boolean {
    const productText = JSON.stringify(product).toLowerCase();
    const restrictionMap: { [key: string]: string[] } = {
      'vegetarian': ['meat', 'chicken', 'fish', 'pork', 'beef', 'gelatin'],
      'vegan': ['milk', 'cheese', 'egg', 'honey', 'butter', 'cream'],
      'halal': ['pork', 'alcohol'],
      'kosher': [], // Complex rules - simplified
      'low sodium': ['salt', 'sodium'],
      'sugar free': ['sugar', 'fructose', 'sucrose']
    };

    return restrictions.every(restriction => {
      const restrictionLower = restriction.toLowerCase();
      const forbiddenItems = restrictionMap[restrictionLower] || [];
      return !forbiddenItems.some(item => productText.includes(item));
    });
  },

  applyHealthConditionScoring(product: any, conditions: string[]): any {
    let score = product.health_score || product.nutriscore || 75;
    const nutriments = product.nutriments || {};
    
    conditions.forEach(condition => {
      const conditionLower = condition.toLowerCase();
      
      switch (conditionLower) {
        case 'diabetes':
        case 'sugar':
          const sugars = nutriments.sugars_100g || 0;
          if (sugars < 5) score += 15;
          else if (sugars > 15) score -= 20;
          break;
          
        case 'hypertension':
        case 'high bp':
          const salt = nutriments.salt_100g || 0;
          if (salt < 0.5) score += 15;
          else if (salt > 1.5) score -= 20;
          break;
          
        case 'heart disease':
        case 'cholesterol':
          const saturatedFat = nutriments['saturated-fat_100g'] || 0;
          if (saturatedFat < 2) score += 15;
          else if (saturatedFat > 5) score -= 20;
          break;
          
        case 'obesity':
        case 'weight loss':
          const calories = nutriments.energy_100g || 0;
          if (calories < 300) score += 10;
          else if (calories > 500) score -= 15;
          break;
          
        case 'kidney disease':
          const potassium = nutriments.potassium_100g || 0;
          const phosphorus = nutriments.phosphorus_100g || 0;
          if (potassium < 100 && phosphorus < 100) score += 10;
          break;
      }
    });
    
    return { ...product, score: Math.max(0, Math.min(100, score)) };
  },

  generateProductDescription(product: any, profile: HealthProfile | null): string {
    const nutriments = product.nutriments || {};
    const features = [];
    
    if (nutriments.sugars_100g < 5) features.push('low sugar');
    if (nutriments.salt_100g < 0.5) features.push('low sodium');
    if (nutriments['saturated-fat_100g'] < 2) features.push('low saturated fat');
    if (nutriments.fiber_100g > 3) features.push('high fiber');
    if (nutriments.proteins_100g > 5) features.push('protein rich');
    
    if (features.length === 0) {
      return 'A balanced food product with moderate nutritional values.';
    }
    
    return `A ${features.join(', ')} product suitable for health-conscious consumers.`;
  },

  generateRecommendationReason(product: any, profile: HealthProfile | null): string {
    const reasons: string[] = [];
    const nutriments = product.nutriments || {};
    
    if (!profile) {
      return 'Popular healthy choice with good nutritional balance';
    }

    const conditions = profile.health_conditions || [];
    
    // Health condition specific reasons
    conditions.forEach(condition => {
      const conditionLower = condition.toLowerCase();
      
      if (conditionLower.includes('diabetes') || conditionLower.includes('sugar')) {
        if (nutriments.sugars_100g < 5) {
          reasons.push('Low sugar for diabetes management');
        }
      }
      
      if (conditionLower.includes('hypertension') || conditionLower.includes('blood pressure')) {
        if (nutriments.salt_100g < 0.5) {
          reasons.push('Low sodium for blood pressure control');
        }
      }
      
      if (conditionLower.includes('heart') || conditionLower.includes('cholesterol')) {
        if (nutriments['saturated-fat_100g'] < 2) {
          reasons.push('Heart-healthy fat profile');
        }
      }
    });

    // General health reasons
    if (nutriments.sugars_100g < 5) reasons.push('Low sugar content');
    if (nutriments.salt_100g < 0.5) reasons.push('Low sodium');
    if (nutriments.fiber_100g > 3) reasons.push('Good fiber source');
    if (product.nova_group === 1) reasons.push('Minimally processed');

    return reasons.length > 0 ? reasons.join(' • ') : 'Well-balanced nutritional profile';
  },

  calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'E' {
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    if (score >= 40) return 'D';
    return 'E';
  },

  estimatePrice(product: any): string {
    // Simple price estimation based on product type
    const categories = product.categories || '';
    if (categories.includes('organic') || categories.includes('premium')) {
      return '₹399 - ₹599';
    }
    if (categories.includes('imported') || categories.includes('specialty')) {
      return '₹299 - ₹499';
    }
    return '₹149 - ₹349';
  },

  generateAmazonLink(product: any): string {
    const searchTerm = product.product_name || product.name || 'healthy food';
    return `https://www.amazon.in/s?k=${encodeURIComponent(searchTerm)}&i=hpc`;
  },

  async getAlternativeProducts(productId: string, userId?: string): Promise<SmartRecommendation[]> {
    try {
      // Get the original product
      const product = await productService.getProductById(productId);
      if (!product) return [];

      // Get user profile for personalization
      let profile: HealthProfile | null = null;
      if (userId) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single();
        profile = data;
      }

      // Find healthier alternatives
      const alternatives = await productService.getFeaturedProducts(15);
      
      const personalizedAlternatives = alternatives
        .filter(alt => {
          // Ensure it's a different product
          if (alt.id === productId || alt.barcode === product.barcode) return false;
          
          // Filter by health score improvement
          const currentScore = typeof product.health_score === 'number' ? product.health_score : (typeof product.nutriscore === 'number' ? product.nutriscore : 50);
          const altScore = typeof alt.health_score === 'number' ? alt.health_score : (typeof alt.nutriscore === 'number' ? alt.nutriscore : 50);
          
          return altScore > currentScore + 10; // At least 10 points better
        })
        .map(alt => this.applyHealthConditionScoring(alt, profile?.health_conditions || []))
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);

      return personalizedAlternatives.map(alt => ({
        id: alt.id,
        name: alt.product_name || alt.name,
        description: `Healthier alternative - ${this.getImprovementDescription(product, alt)}`,
        image: alt.image_url || alt.image_front_url || '/placeholder-product.jpg',
        category: alt.categories || 'General',
        score: alt.score || alt.health_score || 0,
        grade: this.calculateGrade(alt.score || alt.health_score || 0),
        price: this.estimatePrice(alt),
        reason: this.getAlternativeReason(product, alt, profile),
        amazonLink: this.generateAmazonLink(alt),
        barcode: alt.barcode
      }));

    } catch (error) {
      console.error('Error getting alternative products:', error);
      return [];
    }
  },

  getImprovementDescription(original: any, alternative: any): string {
    const originalScore = original.health_score || original.nutriscore || 50;
    const altScore = alternative.health_score || alternative.nutriscore || 50;
    const improvement = altScore - originalScore;
    
    if (improvement > 30) return 'Significantly healthier';
    if (improvement > 20) return 'Much healthier';
    if (improvement > 10) return 'Healthier';
    return 'Better nutritional profile';
  },

  getAlternativeReason(original: any, alternative: any, profile: HealthProfile | null): string {
    const reasons: string[] = [];
    const origNutriments = original.nutriments || {};
    const altNutriments = alternative.nutriments || {};
    
    // Compare nutritional improvements
    if (altNutriments.sugars_100g < (origNutriments.sugars_100g || 0)) {
      reasons.push('Lower sugar');
    }
    if (altNutriments.salt_100g < (origNutriments.salt_100g || 0)) {
      reasons.push('Lower sodium');
    }
    if (altNutriments['saturated-fat_100g'] < (origNutriments['saturated-fat_100g'] || 0)) {
      reasons.push('Less saturated fat');
    }
    if (altNutriments.fiber_100g > (origNutriments.fiber_100g || 0)) {
      reasons.push('More fiber');
    }
    
    // Add profile-specific reasons
    if (profile) {
      const conditions = profile.health_conditions || [];
      if (conditions.some(c => c.toLowerCase().includes('diabetes')) && 
          altNutriments.sugars_100g < (origNutriments.sugars_100g || 0)) {
        reasons.push('Better for diabetes');
      }
    }

    return reasons.length > 0 ? reasons.join(' • ') : 'Improved nutritional profile';
  }
};