import { useState, useCallback } from 'react';
import { ocrService, OCRResult, NutritionInfo, HealthAlert } from '@/services/ocrService';

export interface OCRAnalysis {
  text: string;
  confidence: number;
  nutritionInfo: NutritionInfo;
  healthScore: number;
  healthAlerts: HealthAlert[];
}

export function useOCR() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processImage = useCallback(async (imageSource: string | File | Blob): Promise<OCRAnalysis> => {
    setIsProcessing(true);
    setError(null);

    try {
      // Extract text from image
      const ocrResult: OCRResult = await ocrService.extractTextFromImage(imageSource);
      
      if (ocrResult.confidence < 30) {
        throw new Error('Image quality too low for reliable text extraction');
      }

      // Parse nutrition information
      const nutritionInfo = ocrService.parseNutritionInfo(ocrResult.text);
      
      // Generate health score
      const healthScore = ocrService.generateHealthScore(nutritionInfo);
      
      // Analyze health risks
      const healthAlerts = ocrService.analyzeHealthRisks(nutritionInfo);

      return {
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        nutritionInfo,
        healthScore,
        healthAlerts
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'OCR processing failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const cleanup = useCallback(async () => {
    await ocrService.terminate();
  }, []);

  return {
    processImage,
    isProcessing,
    error,
    cleanup
  };
}