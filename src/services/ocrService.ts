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

export interface HealthAlert {
  id: string;
  ingredient: string;
  alias?: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
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
    const cleanText = this.cleanExtractedText(text);
    
    // Extract calories
    const caloriesMatch = cleanText.match(/calories?\s*:?\s*(\d+)/i);
    if (caloriesMatch) {
      nutritionInfo.calories = caloriesMatch[1];
    }

    // Extract protein
    const proteinMatch = cleanText.match(/protein\s*:?\s*(\d+\.?\d*)\s*g?/i);
    if (proteinMatch) {
      nutritionInfo.protein = proteinMatch[1] + 'g';
    }

    // Extract carbohydrates
    const carbsMatch = cleanText.match(/(?:total\s+)?carbohydrate[s]?\s*:?\s*(\d+\.?\d*)\s*g?/i);
    if (carbsMatch) {
      nutritionInfo.carbs = carbsMatch[1] + 'g';
    }

    // Extract fat
    const fatMatch = cleanText.match(/(?:total\s+)?fat\s*:?\s*(\d+\.?\d*)\s*g?/i);
    if (fatMatch) {
      nutritionInfo.fat = fatMatch[1] + 'g';
    }

    // Extract sugar
    const sugarMatch = cleanText.match(/(?:total\s+)?sugar[s]?\s*:?\s*(\d+\.?\d*)\s*g?/i);
    if (sugarMatch) {
      nutritionInfo.sugar = sugarMatch[1] + 'g';
    }

    // Extract sodium/salt
    const sodiumMatch = cleanText.match(/(?:sodium|salt)\s*:?\s*(\d+\.?\d*)\s*(?:mg|g)?/i);
    if (sodiumMatch) {
      nutritionInfo.sodium = sodiumMatch[1] + 'mg';
    }

    // Extract fiber
    const fiberMatch = cleanText.match(/(?:dietary\s+)?fiber\s*:?\s*(\d+\.?\d*)\s*g?/i);
    if (fiberMatch) {
      nutritionInfo.fiber = fiberMatch[1] + 'g';
    }

    // Extract serving size
    const servingMatch = cleanText.match(/serving\s+size\s*:?\s*([^\n]+)/i);
    if (servingMatch) {
      nutritionInfo.servingSize = servingMatch[1].trim();
    }

    // Extract ingredients - enhanced parsing
    nutritionInfo.ingredients = this.extractIngredients(cleanText);

    return nutritionInfo;
  }

  private cleanExtractedText(text: string): string {
    return text
      .replace(/[^\w\s:.,;()-]/g, ' ') // Remove special characters except common punctuation
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/(\d)\s*([a-zA-Z])/g, '$1$2') // Remove spaces between numbers and units (e.g., "5 g" -> "5g")
      .trim();
  }

  private extractIngredients(text: string): string[] {
    // Look for ingredients section with various patterns
    const ingredientPatterns = [
      /ingredients?\s*:?\s*([^.]+(?:\.[^.]*)*)/i,
      /contains?\s*:?\s*([^.]+)/i,
      /made\s+with\s*:?\s*([^.]+)/i
    ];

    let ingredientsList: string[] = [];

    for (const pattern of ingredientPatterns) {
      const match = text.match(pattern);
      if (match) {
        ingredientsList = match[1]
          .split(/[,;]/)
          .map(ingredient => ingredient.trim())
          .filter(ingredient => ingredient.length > 2)
          .slice(0, 30); // Increased limit for better ingredient detection
        break;
      }
    }

    return ingredientsList;
  }

  analyzeHealthRisks(nutritionInfo: NutritionInfo): HealthAlert[] {
    const alerts: HealthAlert[] = [];

    // Check sugar content
    if (nutritionInfo.sugar) {
      const sugarAmount = parseFloat(nutritionInfo.sugar);
      if (sugarAmount > 15) {
        alerts.push({
          id: 'high-sugar',
          ingredient: 'Sugar',
          alias: nutritionInfo.sugar,
          reason: 'High sugar content may contribute to obesity, diabetes, and tooth decay',
          severity: 'high'
        });
      } else if (sugarAmount > 10) {
        alerts.push({
          id: 'medium-sugar',
          ingredient: 'Sugar',
          alias: nutritionInfo.sugar,
          reason: 'Moderate sugar content - consume in moderation',
          severity: 'medium'
        });
      }
    }

    // Check sodium/salt content
    if (nutritionInfo.sodium) {
      const sodiumAmount = parseFloat(nutritionInfo.sodium);
      if (sodiumAmount > 800) {
        alerts.push({
          id: 'high-sodium',
          ingredient: 'Sodium',
          alias: nutritionInfo.sodium,
          reason: 'Excessive sodium intake may lead to high blood pressure and heart disease',
          severity: 'high'
        });
      } else if (sodiumAmount > 500) {
        alerts.push({
          id: 'medium-sodium',
          ingredient: 'Sodium',
          alias: nutritionInfo.sodium,
          reason: 'High sodium content - monitor your daily intake',
          severity: 'medium'
        });
      }
    }

    // Check ingredients for harmful additives
    if (nutritionInfo.ingredients) {
      const harmfulAdditives = [
        { name: 'High Fructose Corn Syrup', keywords: ['high fructose corn syrup', 'hfcs'], severity: 'high' as const },
        { name: 'Trans Fat', keywords: ['partially hydrogenated', 'trans fat'], severity: 'high' as const },
        { name: 'Artificial Colors', keywords: ['artificial color', 'fd&c', 'yellow 5', 'red 40', 'blue 1'], severity: 'medium' as const },
        { name: 'Artificial Flavors', keywords: ['artificial flavor', 'artificial flavoring'], severity: 'medium' as const },
        { name: 'Preservatives', keywords: ['bha', 'bht', 'sodium benzoate', 'potassium sorbate'], severity: 'medium' as const },
        { name: 'MSG', keywords: ['monosodium glutamate', 'msg'], severity: 'medium' as const },
        { name: 'Sodium Nitrate', keywords: ['sodium nitrate', 'sodium nitrite'], severity: 'high' as const },
        { name: 'Aspartame', keywords: ['aspartame'], severity: 'medium' as const }
      ];

      const ingredientsText = nutritionInfo.ingredients.join(' ').toLowerCase();
      
      harmfulAdditives.forEach(additive => {
        additive.keywords.forEach(keyword => {
          if (ingredientsText.includes(keyword)) {
            alerts.push({
              id: `additive-${keyword.replace(/\s+/g, '-')}`,
              ingredient: additive.name,
              alias: keyword,
              reason: this.getAdditiveReason(additive.name),
              severity: additive.severity
            });
          }
        });
      });
    }

    return alerts;
  }

  private getAdditiveReason(additiveName: string): string {
    const reasons: Record<string, string> = {
      'High Fructose Corn Syrup': 'Linked to obesity, diabetes, and metabolic disorders',
      'Trans Fat': 'Increases bad cholesterol and risk of heart disease',
      'Artificial Colors': 'May cause hyperactivity in children and allergic reactions',
      'Artificial Flavors': 'Chemical compounds that may have unknown long-term effects',
      'Preservatives': 'Some preservatives may cause allergic reactions or health issues',
      'MSG': 'May cause headaches, nausea, and other symptoms in sensitive individuals',
      'Sodium Nitrate': 'Linked to increased cancer risk and cardiovascular problems',
      'Aspartame': 'Artificial sweetener with potential neurological effects'
    };
    return reasons[additiveName] || 'May have potential health concerns';
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