import { createWorker } from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
}

export interface NutritionInfo {
  calories?: string;
  protein?: string;
  carbs?: string;
  fat?: string;
  sugar?: string;
  sodium?: string;
  fiber?: string;
  ingredients?: string[];
  servingSize?: string;
}

class OCRService {
  private worker: Tesseract.Worker | null = null;

  async initializeWorker() {
    if (!this.worker) {
      this.worker = await createWorker('eng');
    }
    return this.worker;
  }

  async extractTextFromImage(imageSource: string | File | Blob): Promise<OCRResult> {
    const worker = await this.initializeWorker();
    
    try {
      const { data: { text, confidence } } = await worker.recognize(imageSource);
      return {
        text: text.trim(),
        confidence: Math.round(confidence)
      };
    } catch (error) {
      console.error('OCR extraction failed:', error);
      throw new Error('Failed to extract text from image');
    }
  }

  parseNutritionInfo(text: string): NutritionInfo {
    const nutritionInfo: NutritionInfo = {};
    const lines = text.toLowerCase().split('\n');
    
    // Extract calories
    const caloriesMatch = text.match(/calories?\s*:?\s*(\d+)/i);
    if (caloriesMatch) {
      nutritionInfo.calories = caloriesMatch[1];
    }

    // Extract protein
    const proteinMatch = text.match(/protein\s*:?\s*(\d+\.?\d*)\s*g?/i);
    if (proteinMatch) {
      nutritionInfo.protein = proteinMatch[1] + 'g';
    }

    // Extract carbohydrates
    const carbsMatch = text.match(/carbohydrate[s]?\s*:?\s*(\d+\.?\d*)\s*g?/i);
    if (carbsMatch) {
      nutritionInfo.carbs = carbsMatch[1] + 'g';
    }

    // Extract fat
    const fatMatch = text.match(/(?:total\s+)?fat\s*:?\s*(\d+\.?\d*)\s*g?/i);
    if (fatMatch) {
      nutritionInfo.fat = fatMatch[1] + 'g';
    }

    // Extract sugar
    const sugarMatch = text.match(/sugar[s]?\s*:?\s*(\d+\.?\d*)\s*g?/i);
    if (sugarMatch) {
      nutritionInfo.sugar = sugarMatch[1] + 'g';
    }

    // Extract sodium
    const sodiumMatch = text.match(/sodium\s*:?\s*(\d+\.?\d*)\s*(?:mg|g)?/i);
    if (sodiumMatch) {
      nutritionInfo.sodium = sodiumMatch[1] + 'mg';
    }

    // Extract fiber
    const fiberMatch = text.match(/fiber\s*:?\s*(\d+\.?\d*)\s*g?/i);
    if (fiberMatch) {
      nutritionInfo.fiber = fiberMatch[1] + 'g';
    }

    // Extract serving size
    const servingMatch = text.match(/serving\s+size\s*:?\s*([^\n]+)/i);
    if (servingMatch) {
      nutritionInfo.servingSize = servingMatch[1].trim();
    }

    // Extract ingredients - look for ingredients list
    const ingredientsMatch = text.match(/ingredients?\s*:?\s*([^.]+(?:\.[^.]*)*)/i);
    if (ingredientsMatch) {
      const ingredientsList = ingredientsMatch[1]
        .split(/[,;]/)
        .map(ingredient => ingredient.trim())
        .filter(ingredient => ingredient.length > 2)
        .slice(0, 20); // Limit to first 20 ingredients
      
      nutritionInfo.ingredients = ingredientsList;
    }

    return nutritionInfo;
  }

  generateHealthScore(nutritionInfo: NutritionInfo): number {
    let score = 50; // Base score

    // Positive factors
    if (nutritionInfo.protein) {
      const protein = parseFloat(nutritionInfo.protein);
      if (protein > 10) score += 15;
      else if (protein > 5) score += 10;
    }

    if (nutritionInfo.fiber) {
      const fiber = parseFloat(nutritionInfo.fiber);
      if (fiber > 5) score += 15;
      else if (fiber > 3) score += 10;
    }

    // Negative factors
    if (nutritionInfo.sugar) {
      const sugar = parseFloat(nutritionInfo.sugar);
      if (sugar > 15) score -= 20;
      else if (sugar > 10) score -= 15;
      else if (sugar > 5) score -= 10;
    }

    if (nutritionInfo.sodium) {
      const sodium = parseFloat(nutritionInfo.sodium);
      if (sodium > 800) score -= 20;
      else if (sodium > 500) score -= 15;
      else if (sodium > 300) score -= 10;
    }

    if (nutritionInfo.fat) {
      const fat = parseFloat(nutritionInfo.fat);
      if (fat > 20) score -= 15;
      else if (fat > 15) score -= 10;
    }

    // Check for problematic ingredients
    if (nutritionInfo.ingredients) {
      const problematicIngredients = [
        'high fructose corn syrup',
        'partially hydrogenated',
        'artificial colors',
        'artificial flavors',
        'preservatives',
        'msg',
        'sodium nitrate'
      ];

      const ingredientsText = nutritionInfo.ingredients.join(' ').toLowerCase();
      problematicIngredients.forEach(ingredient => {
        if (ingredientsText.includes(ingredient)) {
          score -= 10;
        }
      });
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

export const ocrService = new OCRService();