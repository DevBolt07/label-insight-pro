import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisResult {
  text: string;
  confidence: number;
  ingredients: string[];
  nutritionData: {
    calories?: number;
    protein?: number;
    carbohydrates?: number;
    fat?: number;
    sugar?: number;
    sodium?: number;
    fiber?: number;
    servingSize?: string;
    [key: string]: any;
  } | null;
  healthAnalysis: {
    healthScore: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'E';
    warnings: string[];
    recommendations: string[];
  };
  claims: string[];
  contradictions: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      throw new Error('No image data provided');
    }

    console.log('Analyzing nutrition label with GPT-4 Vision...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert in nutrition, food science, and product claims analysis. 
            Analyze the provided image of a food product label with extreme attention to detail.
            
            Extract and return the following information in valid JSON format:
            {
              "text": "complete text found on the label",
              "ingredients": ["array", "of", "ingredients"],
              "nutritionFacts": {
                "calories": number_or_null,
                "protein": number_or_null,
                "carbohydrates": number_or_null,
                "fat": number_or_null,
                "sugar": number_or_null,
                "sodium": number_or_null,
                "fiber": number_or_null,
                "servingSize": "text_or_null",
                "additionalNutrients": {}
              },
              "claims": ["marketing", "claims", "found"],
              "contradictions": ["any", "misleading", "claims"],
              "healthWarnings": ["specific", "health", "concerns"]
            }
            
            Be thorough in identifying:
            - ALL ingredients in order of quantity
            - Complete nutrition information with units
            - Marketing claims (organic, natural, sugar-free, etc.)
            - Any contradictions between claims and actual content
            - Potential health warnings based on ingredients
            
            Return only valid JSON, no additional text.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please analyze this nutrition label image and extract all the information as specified.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('Raw AI response:', content);

    // Parse the JSON response
    let parsedResult;
    try {
      parsedResult = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      throw new Error('Invalid AI response format');
    }

    // Calculate health score based on analysis
    const healthScore = calculateHealthScore(parsedResult.nutritionFacts, parsedResult.ingredients, parsedResult.healthWarnings);
    const grade = getGradeFromScore(healthScore);

    const result: AnalysisResult = {
      text: parsedResult.text || '',
      confidence: 95, // GPT-4 Vision typically has high confidence
      ingredients: parsedResult.ingredients || [],
      nutritionData: parsedResult.nutritionFacts || null,
      healthAnalysis: {
        healthScore,
        grade,
        warnings: parsedResult.healthWarnings || [],
        recommendations: generateRecommendations(parsedResult.nutritionFacts, parsedResult.ingredients)
      },
      claims: parsedResult.claims || [],
      contradictions: parsedResult.contradictions || []
    };

    console.log('Final analysis result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-nutrition-label function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to analyze nutrition label'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateHealthScore(nutritionFacts: any, ingredients: string[], healthWarnings: string[]): number {
  let score = 70; // Base score

  if (!nutritionFacts) return 50;

  // Penalize high calories
  if (nutritionFacts.calories && nutritionFacts.calories > 400) {
    score -= 15;
  }

  // Penalize high sugar
  if (nutritionFacts.sugar && nutritionFacts.sugar > 10) {
    score -= 20;
  }

  // Penalize high sodium
  if (nutritionFacts.sodium && nutritionFacts.sodium > 600) {
    score -= 15;
  }

  // Penalize high fat
  if (nutritionFacts.fat && nutritionFacts.fat > 15) {
    score -= 10;
  }

  // Reward fiber
  if (nutritionFacts.fiber && nutritionFacts.fiber > 3) {
    score += 10;
  }

  // Reward protein
  if (nutritionFacts.protein && nutritionFacts.protein > 10) {
    score += 5;
  }

  // Penalize processed ingredients
  const processedIngredients = ['high fructose corn syrup', 'artificial colors', 'artificial flavors', 'preservatives'];
  const hasProcessed = ingredients.some(ingredient => 
    processedIngredients.some(processed => 
      ingredient.toLowerCase().includes(processed)
    )
  );
  if (hasProcessed) {
    score -= 10;
  }

  // Penalize health warnings
  score -= healthWarnings.length * 5;

  return Math.max(0, Math.min(100, score));
}

function getGradeFromScore(score: number): 'A' | 'B' | 'C' | 'D' | 'E' {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'E';
}

function generateRecommendations(nutritionFacts: any, ingredients: string[]): string[] {
  const recommendations: string[] = [];

  if (!nutritionFacts) {
    recommendations.push('Ensure nutrition label is clearly visible for better analysis');
    return recommendations;
  }

  if (nutritionFacts.calories && nutritionFacts.calories > 400) {
    recommendations.push('Consider portion control due to high calorie content');
  }

  if (nutritionFacts.sugar && nutritionFacts.sugar > 15) {
    recommendations.push('Look for lower sugar alternatives');
  }

  if (nutritionFacts.sodium && nutritionFacts.sodium > 800) {
    recommendations.push('Monitor daily sodium intake');
  }

  if (nutritionFacts.fiber && nutritionFacts.fiber > 5) {
    recommendations.push('Great source of dietary fiber');
  }

  if (nutritionFacts.protein && nutritionFacts.protein > 15) {
    recommendations.push('Excellent protein source');
  }

  const hasArtificial = ingredients.some(ingredient => 
    ingredient.toLowerCase().includes('artificial') || 
    ingredient.toLowerCase().includes('preservative')
  );
  if (hasArtificial) {
    recommendations.push('Consider products with more natural ingredients');
  }

  return recommendations;
}