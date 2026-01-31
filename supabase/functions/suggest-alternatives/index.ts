import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Alternative {
  name: string;
  brand: string;
  reason: string;
  benefits: string[];
  healthierBecause: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productData, userProfile } = await req.json();
    
    console.log('Finding alternatives for:', productData?.name);

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const nutritionFacts = productData?.nutritionFacts || {};
    const categories = productData?.categories || '';

    const prompt = `You are a nutritionist expert. Suggest 3-4 healthier alternative products for this scanned product.

SCANNED PRODUCT:
- Name: ${productData?.name || 'Unknown'}
- Brand: ${productData?.brand || 'Unknown'}
- Category: ${categories}
- Nutri-Score: ${productData?.nutriscore || 'N/A'}
- NOVA Group: ${productData?.nova_group || 'N/A'}
- Sugar: ${nutritionFacts.sugars || 'unknown'}g per 100g
- Fat: ${nutritionFacts.fat || 'unknown'}g per 100g
- Salt: ${nutritionFacts.salt || 'unknown'}g per 100g
- Additives: ${JSON.stringify(productData?.additives || [])}

USER PROFILE:
- Health Conditions: ${JSON.stringify(userProfile?.health_conditions || [])}
- Allergies: ${JSON.stringify(userProfile?.allergies || [])}
- Dietary Preferences: ${JSON.stringify(userProfile?.dietary_preferences || [])}

TASK: Suggest 3-4 REAL, commonly available healthier alternative products in the same category. Consider:
1. Lower sugar/fat/salt content
2. Better Nutri-Score (A or B preferred)
3. Less processed (lower NOVA group)
4. Fewer additives
5. User's dietary restrictions and health conditions

Return ONLY a valid JSON array with this exact format:
[
  {
    "name": "Product Name",
    "brand": "Brand Name",
    "reason": "Why this is a good alternative (10-15 words)",
    "benefits": ["Lower sugar", "No artificial colors", "High fiber"],
    "healthierBecause": "Specific comparison to original product (15-20 words)"
  }
]

IMPORTANT: Suggest REAL products that exist in supermarkets. Be specific with brand names.`;

    console.log('Sending request to Gemini...');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const geminiData = await response.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    console.log('Gemini response:', responseText);

    let alternatives: Alternative[] = [];
    try {
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith('```json')) cleanedText = cleanedText.slice(7);
      if (cleanedText.startsWith('```')) cleanedText = cleanedText.slice(3);
      if (cleanedText.endsWith('```')) cleanedText = cleanedText.slice(0, -3);
      cleanedText = cleanedText.trim();
      
      const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        alternatives = JSON.parse(jsonMatch[0]);
        console.log('Parsed alternatives:', JSON.stringify(alternatives));
      }
    } catch (parseError) {
      console.error('Failed to parse alternatives:', parseError);
    }

    // Fallback if no alternatives parsed
    if (alternatives.length === 0) {
      alternatives = generateFallbackAlternatives(productData, categories);
    }

    return new Response(JSON.stringify({ alternatives }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error suggesting alternatives:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Return fallback alternatives instead of 500 for rate limit errors
    if (errorMessage.includes('429') || errorMessage.includes('quota')) {
      console.log('Rate limited - returning fallback alternatives');
      return new Response(JSON.stringify({ 
        alternatives: generateFallbackAlternatives({}, ''),
        rateLimited: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      alternatives: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateFallbackAlternatives(productData: any, categories: string): Alternative[] {
  const categoryLower = (categories || '').toLowerCase();
  
  if (categoryLower.includes('chocolate') || categoryLower.includes('candy') || categoryLower.includes('sweet')) {
    return [
      {
        name: "Dark Chocolate 70%",
        brand: "Lindt Excellence",
        reason: "Higher cocoa content means more antioxidants and less sugar",
        benefits: ["Lower sugar", "Rich in antioxidants", "More satisfying"],
        healthierBecause: "70% cocoa has 40% less sugar than milk chocolate while providing heart-healthy flavonoids"
      },
      {
        name: "Dried Fruit & Nut Mix",
        brand: "Nature Valley",
        reason: "Natural sweetness from fruit with protein from nuts",
        benefits: ["No added sugar", "High fiber", "Natural ingredients"],
        healthierBecause: "Provides natural energy without artificial additives or refined sugars"
      }
    ];
  }
  
  if (categoryLower.includes('noodle') || categoryLower.includes('pasta') || categoryLower.includes('instant')) {
    return [
      {
        name: "Whole Wheat Noodles",
        brand: "Barilla Whole Grain",
        reason: "More fiber and nutrients than refined wheat noodles",
        benefits: ["High fiber", "Complex carbs", "More vitamins"],
        healthierBecause: "Whole grain keeps you fuller longer and has 3x more fiber than refined noodles"
      },
      {
        name: "Rice Noodles",
        brand: "Thai Kitchen",
        reason: "Gluten-free option with lighter texture",
        benefits: ["Gluten-free", "Lower sodium", "Easy to digest"],
        healthierBecause: "Contains no wheat gluten and typically has 50% less sodium than instant noodles"
      },
      {
        name: "Zucchini Noodles",
        brand: "Fresh/Homemade",
        reason: "Vegetable-based, very low calorie alternative",
        benefits: ["Very low calorie", "High vitamins", "No processing"],
        healthierBecause: "Only 20 calories per serving vs 380 in instant noodles, plus vitamins A and C"
      }
    ];
  }
  
  // Generic healthy alternatives
  return [
    {
      name: "Similar Product - Organic Version",
      brand: "Organic Brand",
      reason: "Organic versions typically have fewer additives",
      benefits: ["No artificial additives", "Better sourcing", "Cleaner ingredients"],
      healthierBecause: "Organic certification ensures no synthetic pesticides or artificial preservatives"
    },
    {
      name: "Homemade Version",
      brand: "DIY",
      reason: "Full control over ingredients and portions",
      benefits: ["No preservatives", "Control salt/sugar", "Fresh ingredients"],
      healthierBecause: "Homemade food lets you eliminate additives and reduce salt, sugar, and unhealthy fats"
    }
  ];
}
