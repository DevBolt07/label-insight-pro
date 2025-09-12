import Tesseract from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
  nutritionData: NutritionData | null;
  healthAnalysis: HealthAnalysis;
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
  private worker: Tesseract.Worker | null = null;

  async initialize() {
    if (!this.worker) {
      this.worker = await Tesseract.createWorker('eng');
      await this.worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,%-: ',
      });
    }
  }

  async processImage(imageFile: File): Promise<OCRResult> {
    try {
      await this.initialize();
      
      if (!this.worker) {
        throw new Error('OCR worker not initialized');
      }

      const result = await this.worker.recognize(imageFile);
      const extractedText = result.data.text;
      const confidence = result.data.confidence;

      // Extract nutrition data from text
      const nutritionData = this.extractNutritionData(extractedText);
      
      // Analyze health implications
      const healthAnalysis = this.analyzeHealth(nutritionData, extractedText);

      return {
        text: extractedText,
        confidence,
        nutritionData,
        healthAnalysis
      };
    } catch (error) {
      console.error('OCR processing error:', error);
      throw new Error('Failed to process image with OCR');
    }
  }

  private extractNutritionData(text: string): NutritionData | null {
    const nutritionData: NutritionData = {};
    const normalizedText = text.toLowerCase();

    // Extract calories
    const caloriesMatch = normalizedText.match(/calories?[\s:]*(\d+)/i);
    if (caloriesMatch) {
      nutritionData.calories = parseInt(caloriesMatch[1]);
    }

    // Extract protein
    const proteinMatch = normalizedText.match(/protein[\s:]*(\d+(?:\.\d+)?)[\s]*g?/i);
    if (proteinMatch) {
      nutritionData.protein = parseFloat(proteinMatch[1]);
    }

    // Extract carbohydrates
    const carbsMatch = normalizedText.match(/carbohydrate[s]?[\s:]*(\d+(?:\.\d+)?)[\s]*g?/i);
    if (carbsMatch) {
      nutritionData.carbohydrates = parseFloat(carbsMatch[1]);
    }

    // Extract fat
    const fatMatch = normalizedText.match(/(?:total\s+)?fat[\s:]*(\d+(?:\.\d+)?)[\s]*g?/i);
    if (fatMatch) {
      nutritionData.fat = parseFloat(fatMatch[1]);
    }

    // Extract sugar
    const sugarMatch = normalizedText.match(/sugar[s]?[\s:]*(\d+(?:\.\d+)?)[\s]*g?/i);
    if (sugarMatch) {
      nutritionData.sugar = parseFloat(sugarMatch[1]);
    }

    // Extract sodium
    const sodiumMatch = normalizedText.match(/sodium[\s:]*(\d+(?:\.\d+)?)[\s]*(?:mg|g)?/i);
    if (sodiumMatch) {
      nutritionData.sodium = parseFloat(sodiumMatch[1]);
    }

    // Extract fiber
    const fiberMatch = normalizedText.match(/fiber[\s:]*(\d+(?:\.\d+)?)[\s]*g?/i);
    if (fiberMatch) {
      nutritionData.fiber = parseFloat(fiberMatch[1]);
    }

    // Extract serving size
    const servingMatch = normalizedText.match(/serving[\s]*size[\s:]*([^\n]+)/i);
    if (servingMatch) {
      nutritionData.servingSize = servingMatch[1].trim();
    }

    return Object.keys(nutritionData).length > 0 ? nutritionData : null;
  }

  private analyzeHealth(nutritionData: NutritionData | null, text: string): HealthAnalysis {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let healthScore = 70; // Base score

    if (!nutritionData) {
      return {
        healthScore: 50,
        grade: 'C',
        warnings: ['Could not extract nutrition information clearly'],
        recommendations: ['Please ensure the nutrition label is clearly visible and try again']
      };
    }

    // Analyze calories
    if (nutritionData.calories && nutritionData.calories > 400) {
      healthScore -= 15;
      warnings.push('High calorie content per serving');
      recommendations.push('Consider portion control');
    }

    // Analyze sugar content
    if (nutritionData.sugar && nutritionData.sugar > 10) {
      healthScore -= 20;
      warnings.push('High sugar content');
      recommendations.push('Look for lower sugar alternatives');
    }

    // Analyze sodium content
    if (nutritionData.sodium && nutritionData.sodium > 600) {
      healthScore -= 15;
      warnings.push('High sodium content');
      recommendations.push('Monitor daily sodium intake');
    }

    // Analyze fat content
    if (nutritionData.fat && nutritionData.fat > 15) {
      healthScore -= 10;
      warnings.push('High fat content');
    }

    // Positive factors
    if (nutritionData.fiber && nutritionData.fiber > 3) {
      healthScore += 10;
      recommendations.push('Good source of fiber');
    }

    if (nutritionData.protein && nutritionData.protein > 10) {
      healthScore += 5;
      recommendations.push('Good protein source');
    }

    // Determine grade
    let grade: 'A' | 'B' | 'C' | 'D' | 'E';
    if (healthScore >= 85) grade = 'A';
    else if (healthScore >= 70) grade = 'B';
    else if (healthScore >= 55) grade = 'C';
    else if (healthScore >= 40) grade = 'D';
    else grade = 'E';

    return {
      healthScore: Math.max(0, Math.min(100, healthScore)),
      grade,
      warnings,
      recommendations
    };
  }

  async cleanup() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

export const ocrService = new OCRService();