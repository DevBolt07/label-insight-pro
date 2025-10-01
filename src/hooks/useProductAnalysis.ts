import { useState } from 'react';
import { analyzeProduct, ProductAnalysis } from '../services/productService';

export const useProductAnalysis = () => {
  const [currentProduct, setCurrentProduct] = useState<ProductAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeProductData = async (barcode: string, healthConditions: string[] = []) => {
    setLoading(true);
    setError(null);
    
    try {
      const productData = await analyzeProduct(barcode, healthConditions);
      setCurrentProduct(productData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetAnalysis = () => {
    setCurrentProduct(null);
    setError(null);
  };

  return {
    currentProduct,
    loading,
    error,
    analyzeProduct: analyzeProductData,
    resetAnalysis
  };
};