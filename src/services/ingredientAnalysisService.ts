import { supabase } from "@/integrations/supabase/client";

export interface IngredientAnalysis {
  name: string;
  summary: string;
  healthEffects: string[];
  commonUses: string[];
  safetyInfo: string;
  personalizedWarnings: string[];
  alternatives: string[];
  category: 'natural' | 'processed' | 'artificial' | 'preservative' | 'additive';
}

class IngredientAnalysisService {
  private cache: Map<string, IngredientAnalysis> = new Map();

  async analyzeIngredient(ingredientName: string, userProfile?: any): Promise<IngredientAnalysis> {
    // Check cache first
    const cacheKey = `${ingredientName}-${JSON.stringify(userProfile || {})}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const { data, error } = await supabase.functions.invoke('analyze-ingredient', {
        body: { 
          ingredientName,
          userProfile
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Analysis failed: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data received from analysis');
      }

      // Cache the result
      this.cache.set(cacheKey, data);

      return data;
    } catch (error) {
      console.error('Ingredient analysis error:', error);
      
      // Return fallback data
      const fallback: IngredientAnalysis = {
        name: ingredientName,
        summary: `${ingredientName} is a food ingredient. Analysis temporarily unavailable.`,
        healthEffects: ['Effects vary by individual'],
        commonUses: ['Used in food products'],
        safetyInfo: 'Generally recognized as safe when consumed in normal amounts',
        personalizedWarnings: [],
        alternatives: ['Consult nutrition labels for alternatives'],
        category: 'processed'
      };

      return fallback;
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

export const ingredientAnalysisService = new IngredientAnalysisService();