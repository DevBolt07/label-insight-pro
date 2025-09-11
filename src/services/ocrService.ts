import { supabase } from "@/integrations/supabase/client";

export interface OCRResult {
  text: string;
  confidence: number;
  nutritionData: NutritionData | null;
  healthAnalysis: HealthAnalysis;
  ingredients: string[];
  claims: string[];
  contradictions: string[];
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

class OCRService {
  async processImage(imageFile: File): Promise<OCRResult> {
    try {
      // Convert image to base64
      const base64Image = await this.fileToBase64(imageFile);
      
      // Call the edge function for analysis
      const { data, error } = await supabase.functions.invoke('analyze-nutrition-label', {
        body: { imageBase64: base64Image }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Analysis failed: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data received from analysis');
      }

      return {
        text: data.text || '',
        confidence: data.confidence || 95,
        nutritionData: data.nutritionData || null,
        healthAnalysis: data.healthAnalysis || {
          healthScore: 50,
          grade: 'C' as const,
          warnings: ['Analysis incomplete'],
          recommendations: ['Please try again with a clearer image']
        },
        ingredients: data.ingredients || [],
        claims: data.claims || [],
        contradictions: data.contradictions || []
      };
    } catch (error) {
      console.error('OCR processing error:', error);
      throw new Error('Failed to process image with AI vision analysis');
    }
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

  async cleanup() {
    // No cleanup needed for GPT-4 Vision API
  }
}

export const ocrService = new OCRService();