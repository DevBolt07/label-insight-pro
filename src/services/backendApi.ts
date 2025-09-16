// Simple API service for your backend
const API_BASE_URL = 'http://localhost:8000';

export interface UserProfile {
  age: number;
  hasDiabetes: boolean;
  hasHighBP: boolean;
  isChild: boolean;
  hasHeartDisease: boolean;
  isPregnant: boolean;
  allergies: string[];
}

export interface AnalysisResult {
  product_name: string;
  ingredients: string[];
  health_risk_score: number;
  alerts: string[];
  suggestions: string[];
  nutritional_info: any;
}

export const analyzeProductWithBackend = async (barcode: string, userProfile: UserProfile): Promise<AnalysisResult> => {
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
    console.log('Backend analysis result received:', result);
    return result;
  } catch (error) {
    console.error('Error analyzing product with backend:', error);
    throw new Error('Failed to connect to the analysis service. Please make sure the backend server is running.');
  }
};

export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return response.ok;
  } catch (error) {
    console.error('Backend server is not responding:', error);
    return false;
  }
};
