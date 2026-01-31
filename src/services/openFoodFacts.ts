import { productCacheStorage, scanHistoryStorage } from '@/utils/storage';

export interface OpenFoodFactsProduct {
  code: string;
  product: {
    // Basic Info
    product_name?: string;
    product_name_en?: string;
    generic_name?: string;
    brands?: string;
    quantity?: string;
    packaging?: string;
    categories?: string;
    labels?: string;
    countries?: string;
    manufacturing_places?: string;
    
    // Images
    image_url?: string;
    image_front_url?: string;
    image_ingredients_url?: string;
    image_nutrition_url?: string;
    image_packaging_url?: string;
    
    // Ingredients & Allergens
    ingredients_text?: string;
    ingredients_text_en?: string;
    allergens?: string;
    traces?: string;
    additives_tags?: string[];
    ingredients_analysis_tags?: string[];
    ingredients_from_palm_oil_n?: number;
    ingredients_that_may_be_from_palm_oil_n?: number;
    
    // Nutrition Facts
    nutriments?: {
      'energy-kcal_100g'?: number;
      energy_100g?: number;
      fat_100g?: number;
      'saturated-fat_100g'?: number;
      carbohydrates_100g?: number;
      sugars_100g?: number;
      fiber_100g?: number;
      proteins_100g?: number;
      salt_100g?: number;
      sodium_100g?: number;
      cholesterol_100g?: number;
      'vitamin-a_100g'?: number;
      'vitamin-c_100g'?: number;
      calcium_100g?: number;
      iron_100g?: number;
    };
    
    // Health & Environmental Indicators
    nutriscore_grade?: string;
    nutriscore_score?: number;
    nova_group?: number;
    ecoscore_grade?: string;
    ecoscore_score?: number;
    carbon_footprint_from_known_ingredients_product?: number;
    
    // Metadata
    creator?: string;
    created_t?: number;
    last_modified_t?: number;
    link?: string;
    stores?: string;
  };
  status: number;
  status_verbose?: string;
}

export interface ProductData {
  // Basic Info
  barcode: string;
  name: string;
  genericName?: string;
  brand?: string;
  quantity?: string;
  packaging?: string;
  categories?: string;
  labels?: string;
  countries?: string;
  manufacturingPlaces?: string;
  
  // Images
  image?: string;
  imageUrl?: string;
  imageIngredientsUrl?: string;
  imageNutritionUrl?: string;
  imagePackagingUrl?: string;
  
  // Ingredients & Allergens
  ingredients?: string;
  allergens?: string[];
  traces?: string[];
  additives?: string[];
  ingredientsAnalysisTags?: string[];
  palmOilIngredients?: number;
  mayBePalmOilIngredients?: number;
  
  // Nutrition Facts
  nutritionFacts?: {
    energyKcal?: number;
    energy?: number;
    fat?: number;
    saturatedFat?: number;
    carbs?: number;
    sugars?: number;
    fiber?: number;
    protein?: number;
    salt?: number;
    cholesterol?: number;
    vitaminA?: number;
    vitaminC?: number;
    calcium?: number;
    iron?: number;
  };
  
  // Health & Environmental Indicators
  nutriscore?: string;
  nutriscoreScore?: number;
  nova_group?: number;
  ecoscore?: string;
  ecoscoreScore?: number;
  carbonFootprint?: number;
  
  // Metadata
  creator?: string;
  createdAt?: number;
  lastModified?: number;
  link?: string;
  stores?: string;
  
  // Computed Health Data
  healthWarnings?: string[];
  isHealthy?: boolean;
  healthScore?: number;
  grade?: string;
}

class OpenFoodFactsService {
  private readonly baseUrl = 'https://world.openfoodfacts.org/api/v2';
  private readonly searchUrl = 'https://world.openfoodfacts.org/cgi/search.pl';

  async searchProducts(query: string, limit: number = 10): Promise<Array<{
    code: string;
    product_name: string;
    brands?: string;
    image_url?: string;
  }>> {
    try {
      const response = await fetch(
        `${this.searchUrl}?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${limit}`
      );
      const data = await response.json();

      if (!data.products || data.products.length === 0) {
        return [];
      }

      return data.products.map((p: any) => ({
        code: p.code,
        product_name: p.product_name || p.product_name_en || 'Unknown Product',
        brands: p.brands,
        image_url: p.image_front_url || p.image_url,
      }));
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }

  async getProductByBarcode(barcode: string): Promise<ProductData | null> {
    try {
      // Check cache first
      const cachedProduct = productCacheStorage.get(barcode);
      if (cachedProduct) {
        console.log('Using cached product data for:', barcode);
        return cachedProduct;
      }

      const response = await fetch(`${this.baseUrl}/product/${barcode}.json`);
      const data: OpenFoodFactsProduct = await response.json();

      if (data.status === 0 || !data.product) {
        return null;
      }

      const productData = this.transformProduct(data);
      
      // Cache the product data
      productCacheStorage.set(barcode, productData);
      
      // Add to scan history
      scanHistoryStorage.add({
        barcode,
        productName: productData.name,
        healthScore: productData.healthScore,
        grade: productData.grade,
        imageUrl: productData.imageUrl
      });

      return productData;
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
    
    // Extract traces
    const traces = product.traces ? 
      product.traces.split(',').map(t => t.trim().replace('en:', '')) : [];
    
    // Extract additives
    const additives = product.additives_tags || [];
    
    // Calculate health warnings based on various factors
    const healthWarnings = this.calculateHealthWarnings(product);
    
    // Determine if product is generally healthy
    const isHealthy = this.assessHealthiness(product);
    
    // Calculate health score (0-100)
    const healthScore = this.calculateHealthScore(product);
    
    // Get grade from health score
    const grade = this.getGradeFromScore(healthScore);

    return {
      // Basic Info
      barcode: data.code,
      name,
      genericName: product.generic_name,
      brand: product.brands,
      quantity: product.quantity,
      packaging: product.packaging,
      categories: product.categories,
      labels: product.labels,
      countries: product.countries,
      manufacturingPlaces: product.manufacturing_places,
      
      // Images
      image: product.image_front_url || product.image_url,
      imageUrl: product.image_front_url || product.image_url,
      imageIngredientsUrl: product.image_ingredients_url,
      imageNutritionUrl: product.image_nutrition_url,
      imagePackagingUrl: product.image_packaging_url,
      
      // Ingredients & Allergens
      ingredients,
      allergens,
      traces,
      additives: additives.map(tag => tag.replace('en:', '')),
      ingredientsAnalysisTags: product.ingredients_analysis_tags,
      palmOilIngredients: product.ingredients_from_palm_oil_n,
      mayBePalmOilIngredients: product.ingredients_that_may_be_from_palm_oil_n,
      
      // Nutrition Facts
      nutritionFacts: {
        energyKcal: product.nutriments?.['energy-kcal_100g'],
        energy: product.nutriments?.energy_100g,
        fat: product.nutriments?.fat_100g,
        saturatedFat: product.nutriments?.['saturated-fat_100g'],
        carbs: product.nutriments?.carbohydrates_100g,
        sugars: product.nutriments?.sugars_100g,
        fiber: product.nutriments?.fiber_100g,
        protein: product.nutriments?.proteins_100g,
        salt: product.nutriments?.salt_100g || (product.nutriments?.sodium_100g ? product.nutriments.sodium_100g * 2.5 : undefined),
        cholesterol: product.nutriments?.cholesterol_100g,
        vitaminA: product.nutriments?.['vitamin-a_100g'],
        vitaminC: product.nutriments?.['vitamin-c_100g'],
        calcium: product.nutriments?.calcium_100g,
        iron: product.nutriments?.iron_100g,
      },
      
      // Health & Environmental Indicators
      nutriscore: product.nutriscore_grade?.toUpperCase(),
      nutriscoreScore: product.nutriscore_score,
      nova_group: product.nova_group,
      ecoscore: product.ecoscore_grade?.toUpperCase(),
      ecoscoreScore: product.ecoscore_score,
      carbonFootprint: product.carbon_footprint_from_known_ingredients_product,
      
      // Metadata
      creator: product.creator,
      createdAt: product.created_t,
      lastModified: product.last_modified_t,
      link: product.link,
      stores: product.stores,
      
      // Computed Health Data
      healthWarnings,
      isHealthy,
      healthScore,
      grade
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

  private calculateHealthScore(product: any): number {
    let score = 50; // Base score
    
    // Nutri-Score impact (±30 points)
    if (product.nutriscore_grade) {
      const nutriGrade = product.nutriscore_grade.toLowerCase();
      switch (nutriGrade) {
        case 'a': score += 30; break;
        case 'b': score += 15; break;
        case 'c': score += 0; break;
        case 'd': score -= 15; break;
        case 'e': score -= 30; break;
      }
    }
    
    // NOVA group impact (±20 points)
    if (product.nova_group) {
      switch (product.nova_group) {
        case 1: score += 20; break;
        case 2: score += 10; break;
        case 3: score -= 10; break;
        case 4: score -= 20; break;
      }
    }
    
    // Health warnings impact (-5 points each)
    const warnings = this.calculateHealthWarnings(product);
    score -= warnings.length * 5;
    
    // Ensure score is between 0-100
    return Math.max(0, Math.min(100, score));
  }

  private getGradeFromScore(score: number): string {
    if (score >= 85) return 'A';
    if (score >= 70) return 'B';
    if (score >= 55) return 'C';
    if (score >= 40) return 'D';
    return 'E';
  }
}

export const openFoodFactsService = new OpenFoodFactsService();