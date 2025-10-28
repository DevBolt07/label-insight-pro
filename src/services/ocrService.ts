// OCR Service using PaddleOCR backend

export interface CategorizedText {
  brand_name?: string;
  slogans: string[];
  marketing_text: string[];
  nutrition_facts: Record<string, string>;
  miscellaneous: string[];
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
      
      console.log('Starting PaddleOCR analysis...');
      const backendResponse = await fetch('http://localhost:8000/analyze-image-base64', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64Image }),
      });

      if (!backendResponse.ok) {
        const errorText = await backendResponse.text();
        throw new Error(`PaddleOCR backend error: ${backendResponse.status} - ${errorText}`);
      }

      const backendData = await backendResponse.json();
      console.log('PaddleOCR analysis successful:', backendData);
      
      // Calculate health score based on ingredients
      const healthScore = this.calculateHealthScore(backendData.ingredients);
      const grade = this.getGradeFromScore(healthScore);
      
      return {
        text: backendData.raw_text || '',
        confidence: backendData.confidence || 0,
        nutritionData: this.extractNutritionFromFacts(backendData.categorized_text.nutrition_facts),
        healthAnalysis: {
          healthScore,
          grade,
          warnings: this.generateWarnings(backendData.ingredients),
          recommendations: this.generateRecommendations(backendData.ingredients)
        },
        ingredients: backendData.ingredients || [],
        claims: backendData.categorized_text.marketing_text || [],
        contradictions: [],
        categorizedText: backendData.categorized_text,
        rawText: backendData.raw_text
      };
    } catch (error) {
      console.error('OCR processing error:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to process image: ${error.message}. Make sure the Python backend is running on http://localhost:8000`);
      }
      throw new Error('Failed to process image with PaddleOCR. Please ensure the backend server is running.');
    }
  }

  private extractNutritionFromFacts(facts: Record<string, string>): NutritionData | null {
    if (!facts || Object.keys(facts).length === 0) return null;
    
    const nutrition: NutritionData = {};
    
    // Parse nutrition facts from the dictionary
    Object.entries(facts).forEach(([key, value]) => {
      const keyLower = key.toLowerCase();
      const numValue = parseFloat(value.replace(/[^\d.]/g, ''));
      
      if (keyLower.includes('calor')) nutrition.calories = numValue;
      else if (keyLower.includes('protein')) nutrition.protein = numValue;
      else if (keyLower.includes('carb')) nutrition.carbohydrates = numValue;
      else if (keyLower.includes('fat') && !keyLower.includes('saturated')) nutrition.fat = numValue;
      else if (keyLower.includes('sugar')) nutrition.sugar = numValue;
      else if (keyLower.includes('sodium') || keyLower.includes('salt')) nutrition.sodium = numValue;
      else if (keyLower.includes('fiber') || keyLower.includes('fibre')) nutrition.fiber = numValue;
      else if (keyLower.includes('serving')) nutrition.servingSize = value;
    });
    
    return nutrition;
  }

  private calculateHealthScore(ingredients: string[]): number {
    let score = 80; // Base score
    
    const harmfulIngredients = [
      'high fructose corn syrup', 'artificial', 'hydrogenated', 'trans fat',
      'sodium nitrite', 'msg', 'aspartame', 'food coloring'
    ];
    
    ingredients.forEach(ingredient => {
      const ingredientLower = ingredient.toLowerCase();
      if (harmfulIngredients.some(harmful => ingredientLower.includes(harmful))) {
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

  private generateWarnings(ingredients: string[]): string[] {
    const warnings: string[] = [];
    
    ingredients.forEach(ingredient => {
      const ingredientLower = ingredient.toLowerCase();
      if (ingredientLower.includes('sugar') || ingredientLower.includes('syrup')) {
        warnings.push('Contains added sugars');
      }
      if (ingredientLower.includes('artificial')) {
        warnings.push('Contains artificial ingredients');
      }
      if (ingredientLower.includes('sodium') || ingredientLower.includes('salt')) {
        warnings.push('May be high in sodium');
      }
    });
    
    return [...new Set(warnings)]; // Remove duplicates
  }

  private generateRecommendations(ingredients: string[]): string[] {
    const recommendations: string[] = [];
    
    if (ingredients.some(i => i.toLowerCase().includes('sugar'))) {
      recommendations.push('Consider products with less added sugar');
    }
    if (ingredients.some(i => i.toLowerCase().includes('artificial'))) {
      recommendations.push('Look for products with natural ingredients');
    }
    if (ingredients.length > 10) {
      recommendations.push('Simpler ingredient lists are often healthier');
    }
    
    return recommendations;
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
    // No cleanup needed for PaddleOCR
  }
}

export const ocrService = new OCRService();