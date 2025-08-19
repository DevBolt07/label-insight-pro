export interface OpenFoodFactsProduct {
  code: string;
  product: {
    product_name?: string;
    product_name_en?: string;
    image_url?: string;
    image_front_url?: string;
    brands?: string;
    categories?: string;
    ingredients_text?: string;
    ingredients_text_en?: string;
    nutriments?: {
      energy_100g?: number;
      fat_100g?: number;
      saturated_fat_100g?: number;
      carbohydrates_100g?: number;
      sugars_100g?: number;
      fiber_100g?: number;
      proteins_100g?: number;
      salt_100g?: number;
      sodium_100g?: number;
    };
    nutriscore_grade?: string;
    nova_group?: number;
    ecoscore_grade?: string;
    allergens?: string;
    traces?: string;
    additives_tags?: string[];
    ingredients_analysis_tags?: string[];
    labels?: string;
    packaging?: string;
    stores?: string;
    countries?: string;
  };
  status: number;
  status_verbose?: string;
}

export interface ProductData {
  barcode: string;
  name: string;
  brand?: string;
  image?: string;
  categories?: string;
  ingredients?: string;
  nutriscore?: string;
  nova_group?: number;
  allergens?: string[];
  additives?: string[];
  nutritionFacts?: {
    energy?: number;
    fat?: number;
    saturatedFat?: number;
    carbs?: number;
    sugars?: number;
    fiber?: number;
    protein?: number;
    salt?: number;
  };
  healthWarnings?: string[];
  isHealthy?: boolean;
}

class OpenFoodFactsService {
  private readonly baseUrl = 'https://world.openfoodfacts.org/api/v2';

  async getProductByBarcode(barcode: string): Promise<ProductData | null> {
    try {
      const response = await fetch(`${this.baseUrl}/product/${barcode}.json`);
      const data: OpenFoodFactsProduct = await response.json();

      if (data.status === 0 || !data.product) {
        return null;
      }

      return this.transformProduct(data);
    } catch (error) {
      console.error('Error fetching product from Open Food Facts:', error);
      throw new Error('Failed to fetch product data');
    }
  }

  private transformProduct(data: OpenFoodFactsProduct): ProductData {
    const product = data.product;
    
    // Extract product name (prefer English if available)
    const name = product.product_name_en || product.product_name || 'Unknown Product';
    
    // Extract ingredients (prefer English if available)
    const ingredients = product.ingredients_text_en || product.ingredients_text || '';
    
    // Extract allergens
    const allergens = product.allergens ? 
      product.allergens.split(',').map(a => a.trim().replace('en:', '')) : [];
    
    // Extract additives
    const additives = product.additives_tags || [];
    
    // Calculate health warnings based on various factors
    const healthWarnings = this.calculateHealthWarnings(product);
    
    // Determine if product is generally healthy
    const isHealthy = this.assessHealthiness(product);

    return {
      barcode: data.code,
      name,
      brand: product.brands,
      image: product.image_front_url || product.image_url,
      categories: product.categories,
      ingredients,
      nutriscore: product.nutriscore_grade?.toUpperCase(),
      nova_group: product.nova_group,
      allergens,
      additives: additives.map(tag => tag.replace('en:', '')),
      nutritionFacts: {
        energy: product.nutriments?.energy_100g,
        fat: product.nutriments?.fat_100g,
        saturatedFat: product.nutriments?.saturated_fat_100g,
        carbs: product.nutriments?.carbohydrates_100g,
        sugars: product.nutriments?.sugars_100g,
        fiber: product.nutriments?.fiber_100g,
        protein: product.nutriments?.proteins_100g,
        salt: product.nutriments?.salt_100g || (product.nutriments?.sodium_100g ? product.nutriments.sodium_100g * 2.5 : undefined)
      },
      healthWarnings,
      isHealthy
    };
  }

  private calculateHealthWarnings(product: any): string[] {
    const warnings: string[] = [];
    
    // High sugar warning
    if (product.nutriments?.sugars_100g && product.nutriments.sugars_100g > 15) {
      warnings.push('High in sugar');
    }
    
    // High salt warning
    const salt = product.nutriments?.salt_100g || (product.nutriments?.sodium_100g ? product.nutriments.sodium_100g * 2.5 : 0);
    if (salt > 1.5) {
      warnings.push('High in salt');
    }
    
    // High saturated fat warning
    if (product.nutriments?.saturated_fat_100g && product.nutriments.saturated_fat_100g > 5) {
      warnings.push('High in saturated fat');
    }
    
    // Ultra-processed food warning (NOVA 4)
    if (product.nova_group === 4) {
      warnings.push('Ultra-processed food');
    }
    
    // Poor Nutri-Score
    if (product.nutriscore_grade && ['d', 'e'].includes(product.nutriscore_grade.toLowerCase())) {
      warnings.push('Poor nutritional quality');
    }
    
    // Contains additives
    if (product.additives_tags && product.additives_tags.length > 3) {
      warnings.push('Contains multiple additives');
    }

    return warnings;
  }

  private assessHealthiness(product: any): boolean {
    // Simple healthiness assessment based on multiple factors
    let healthScore = 0;
    
    // Good nutri-score
    if (product.nutriscore_grade && ['a', 'b'].includes(product.nutriscore_grade.toLowerCase())) {
      healthScore += 2;
    }
    
    // Low processing level
    if (product.nova_group && product.nova_group <= 2) {
      healthScore += 1;
    }
    
    // Low sugar
    if (!product.nutriments?.sugars_100g || product.nutriments.sugars_100g < 5) {
      healthScore += 1;
    }
    
    // Low salt
    const salt = product.nutriments?.salt_100g || (product.nutriments?.sodium_100g ? product.nutriments.sodium_100g * 2.5 : 0);
    if (salt < 0.3) {
      healthScore += 1;
    }
    
    // Has fiber
    if (product.nutriments?.fiber_100g && product.nutriments.fiber_100g > 3) {
      healthScore += 1;
    }
    
    return healthScore >= 3;
  }
}

export const openFoodFactsService = new OpenFoodFactsService();