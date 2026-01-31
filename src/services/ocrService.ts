import { supabase } from "@/integrations/supabase/client";

export interface CategorizedText {
  brand_name?: string;
  slogans: string[];
  marketing_text: string[];
  nutrition_facts: Record<string, string>;
  miscellaneous: string[];
}

export interface NutritionData {
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  sugar?: number;
  sodium?: number;
  fiber?: number;
  servingSize?: string;
}

export interface HealthAnalysis {
  healthScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
  warnings: string[];
  recommendations: string[];
}

export interface OCRResult {
  text: string;
  confidence: number;
  nutritionData: NutritionData | null;
  healthAnalysis: HealthAnalysis;
  ingredients: string[];
  claims: string[];
  contradictions: string[];
  categorizedText?: CategorizedText;
  rawText?: string;
  structuredText?: string;
  ocrSource?: string;
}

class OCRService {
  async processImage(imageFile: File): Promise<OCRResult> {
    try {
      console.log('Processing image with Supabase Edge Function (Gemini)...');
      const base64Image = await this.fileToBase64(imageFile);

      // Call the new Edge Function
      const { data, error } = await supabase.functions.invoke('analyze-nutrition-label', {
        body: { image: base64Image }
      });

      if (error) throw new Error(`Analysis failed: ${error.message}`);
      if (!data) throw new Error('No data received from analysis');

      console.log('Gemini Analysis successful:', data);

      // Map Gemini JSON response to your App's OCRResult format
      const rawNutritionFacts = data.nutrition_facts || data.nutritional_info || {};
      const nutritionData = this.normalizeNutrition(rawNutritionFacts);

      const baseIngredients: string[] = Array.isArray(data.ingredients) ? data.ingredients : [];
      const allergens: string[] = Array.isArray(data.allergens) ? data.allergens : [];

      const formatLabel = (label: string) =>
        label
          .replace(/_/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .replace(/\b\w/g, (c) => c.toUpperCase());

      const nutritionLabels: string[] = Object.keys(rawNutritionFacts || {})
        .map((key) => formatLabel(key))
        .filter((label) => label.length > 0);

      const ingredients: string[] = [...baseIngredients, ...nutritionLabels, ...allergens].filter(
        (item, index, arr) =>
          item &&
          arr.findIndex((other) => other.toLowerCase() === item.toLowerCase()) === index
      );

      // Calculate a basic health score based on findings
      const healthScore = this.calculateHealthScore(ingredients, nutritionData);
      const grade = this.getGradeFromScore(healthScore);

      return {
        text: data.raw_text || '',
        confidence: 100, // Gemini is confident
        nutritionData: nutritionData,
        healthAnalysis: {
          healthScore,
          grade,
          warnings: data.health_analysis?.warnings || data.alerts || [],
          recommendations: data.health_analysis?.positives || data.suggestions || []
        },
        ingredients: ingredients,
        claims: data.claims || [],
        contradictions: [],
        categorizedText: {
          brand_name: data.brand_name,
          slogans: [],
          marketing_text: data.claims || [],
          nutrition_facts: rawNutritionFacts,
          miscellaneous: []
        },
        rawText: data.raw_text,
        structuredText: data.meta?.structured_text,
        ocrSource: data.meta?.ocr_source || 'Unknown'
      };
    } catch (error) {
      console.error('OCR processing error:', error);
      throw error;
    }
  }

  // Helper to normalize nutrition keys from Gemini
  private normalizeNutrition(facts: any): NutritionData {
    if (!facts) return {};

    // Helper to safely parse numbers
    const parseVal = (val: any) => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') return parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
      return undefined;
    };

    return {
      calories: parseVal(facts.calories || facts.Energy || facts.energy),
      protein: parseVal(facts.protein || facts.Protein),
      carbohydrates: parseVal(facts.carbohydrates || facts.Carbs || facts.total_carbohydrate),
      fat: parseVal(facts.fat || facts.Fat || facts.total_fat),
      sugar: parseVal(facts.sugar || facts.Sugars || facts.sugars),
      sodium: parseVal(facts.sodium || facts.Sodium),
      fiber: parseVal(facts.fiber || facts.Fiber)
    };
  }

  private calculateHealthScore(ingredients: string[], nutrition: NutritionData): number {
    let score = 80;

    // Deduct for sugar
    if (nutrition.sugar && nutrition.sugar > 10) score -= 15;

    // Deduct for harmful ingredients
    const harmfulIngredients = [
      'high fructose corn syrup', 'hydrogenated', 'aspartame', 'sodium nitrite'
    ];

    ingredients.forEach(ingredient => {
      const lower = ingredient.toLowerCase();
      if (harmfulIngredients.some(h => lower.includes(h))) {
        score -= 10;
      }
    });

    return Math.max(0, Math.min(100, score));
  }

  private getGradeFromScore(score: number): 'A' | 'B' | 'C' | 'D' | 'E' {
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    if (score >= 20) return 'D';
    return 'E';
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result as string;
        // Remove the data:image/...;base64, prefix
        const base64Data = base64String.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = error => reject(error);
    });
  }
}

export const ocrService = new OCRService();