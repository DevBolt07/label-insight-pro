// Use a simple string for the API base URL to avoid environment variable issues
const API_BASE_URL = 'http://localhost:8000';

// Define interfaces for the API
export interface UserProfile {
  age: number;
  hasDiabetes: boolean;
  hasHighBP: boolean;
  isChild: boolean;
  hasHeartDisease: boolean;
  isPregnant: boolean;
  allergies: string[];
} 

// Create a simpler interface for nutritional info to avoid the 'any' type issue
export interface NutritionalInfo {
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  sugar?: number;
  sodium?: number;
  // Add other nutritional properties as needed
  [key: string]: number | undefined; // This allows for flexible properties while maintaining type safety
}

export interface AnalysisResult {
  product_name: string;
  ingredients: string[];
  health_risk_score: number;
  alerts: string[];
  suggestions: string[];
  nutritional_info: NutritionalInfo; // Use the defined interface instead of Record<string, any>
}

export const analyzeProduct = async (barcode: string, userProfile: UserProfile): Promise<AnalysisResult> => {
  try {
    console.log('Sending analysis request to backend...');
    
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        barcode,
        user_profile: userProfile
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Analysis failed: ${response.status} ${response.statusText}. ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Analysis result received:', result);
    return result;
  } catch (error) {
    console.error('Error analyzing product:', error);
    throw new Error('Failed to connect to the analysis service. Please make sure the backend server is running.');
  }
};

export const checkServerHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return response.ok;
  } catch (error) {
    console.error('Backend server is not responding:', error);
    return false;
  }
};