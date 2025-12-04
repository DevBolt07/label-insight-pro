import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClaimVerification {
  claim: string;
  status: 'verified' | 'misleading' | 'false';
  reason: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productData, userProfile } = await req.json();
    
    console.log('Verifying claims for product:', productData?.name);
    console.log('Product ingredients:', productData?.ingredients);
    console.log('Nutrition facts:', JSON.stringify(productData?.nutritionFacts));

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Extract sugar content from nutrition facts
    const nutritionFacts = productData?.nutritionFacts || {};
    const sugarContent = nutritionFacts.sugars || nutritionFacts.sugar || 'unknown';
    const sodiumContent = nutritionFacts.sodium || nutritionFacts.salt || 'unknown';
    const fatContent = nutritionFacts.fat || nutritionFacts.totalFat || 'unknown';
    const proteinContent = nutritionFacts.proteins || nutritionFacts.protein || 'unknown';
    const fiberContent = nutritionFacts.fiber || 'unknown';

    const prompt = `You are a food claims verification expert. Your job is to analyze this product and identify potential MARKETING CLAIMS that companies might make, then verify if those claims are TRUE or FALSE based on actual product data.

PRODUCT INFORMATION:
- Product Name: ${productData?.name || 'Unknown'}
- Brand: ${productData?.brand || 'Unknown'}
- Ingredients List: ${productData?.ingredients || 'Not available'}
- Nutri-Score Grade: ${productData?.nutriscore || 'N/A'}
- NOVA Processing Level: ${productData?.nova_group || 'N/A'}
- Sugar Content: ${sugarContent}
- Sodium/Salt Content: ${sodiumContent}
- Fat Content: ${fatContent}
- Protein Content: ${proteinContent}
- Fiber Content: ${fiberContent}
- Additives Found: ${JSON.stringify(productData?.additives || [])}
- Allergens: ${JSON.stringify(productData?.allergens || [])}
- Categories: ${productData?.categories || 'Unknown'}

USER HEALTH PROFILE (for context):
- Health Conditions: ${JSON.stringify(userProfile?.health_conditions || [])}
- Allergies: ${JSON.stringify(userProfile?.allergies || [])}
- Dietary Preferences: ${JSON.stringify(userProfile?.dietary_preferences || [])}

TASK: Generate 4-6 potential marketing claims and verify each one. Consider these common claim types:
1. Sugar-related: "Sugar Free", "Low Sugar", "No Added Sugar"
2. Fat-related: "Low Fat", "Fat Free", "No Trans Fat"
3. Health claims: "Heart Healthy", "High Fiber", "High Protein", "Low Calorie"
4. Diet claims: "Vegetarian", "Vegan", "Gluten Free", "Keto Friendly"
5. Processing claims: "All Natural", "No Artificial Preservatives", "No Artificial Colors"
6. Sodium claims: "Low Sodium", "Salt Free"

For each claim, determine:
- "verified" = Claim is TRUE based on actual data
- "misleading" = Claim is partially true but exaggerated or incomplete
- "false" = Claim is NOT TRUE based on actual data

IMPORTANT: Base your analysis ONLY on the actual data provided. If sugar content shows any value > 0.5g per 100g, "Sugar Free" would be FALSE.

Respond with ONLY a valid JSON array. No explanation text before or after. Example format:
[
  {"claim": "Sugar Free", "status": "false", "reason": "Contains ${sugarContent} sugar per serving"},
  {"claim": "High Protein", "status": "verified", "reason": "Contains good protein content"},
  {"claim": "All Natural", "status": "misleading", "reason": "Contains artificial additives like E621"}
]`;

    console.log('Sending request to Gemini...');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
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
    console.log('Gemini raw response:', JSON.stringify(geminiData));
    
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('Gemini response text:', responseText);

    // Parse JSON from response
    let claims: ClaimVerification[] = [];
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.slice(7);
      }
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.slice(3);
      }
      if (cleanedText.endsWith('```')) {
        cleanedText = cleanedText.slice(0, -3);
      }
      cleanedText = cleanedText.trim();
      
      const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        claims = JSON.parse(jsonMatch[0]);
        console.log('Parsed claims:', JSON.stringify(claims));
      } else {
        console.error('No JSON array found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse claims:', parseError);
      console.error('Response was:', responseText);
    }

    // If no claims parsed, generate default analysis based on available data
    if (claims.length === 0) {
      console.log('Generating fallback claims based on product data...');
      claims = generateFallbackClaims(productData);
    }

    return new Response(JSON.stringify({ claims }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error verifying claims:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      claims: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateFallbackClaims(productData: any): ClaimVerification[] {
  const claims: ClaimVerification[] = [];
  const nutritionFacts = productData?.nutritionFacts || {};
  const ingredients = (productData?.ingredients || '').toLowerCase();
  const additives = productData?.additives || [];
  
  // Sugar claim
  const sugarValue = parseFloat(nutritionFacts.sugars || nutritionFacts.sugar || '0');
  if (!isNaN(sugarValue)) {
    if (sugarValue > 5) {
      claims.push({
        claim: "Sugar Free",
        status: "false",
        reason: `Contains ${sugarValue}g sugar per 100g - not sugar free`
      });
    } else if (sugarValue > 0.5) {
      claims.push({
        claim: "Low Sugar",
        status: "misleading", 
        reason: `Contains ${sugarValue}g sugar - moderate amount`
      });
    } else {
      claims.push({
        claim: "Low Sugar",
        status: "verified",
        reason: `Only ${sugarValue}g sugar per 100g`
      });
    }
  }
  
  // Natural/Artificial claim
  if (additives.length > 0) {
    claims.push({
      claim: "All Natural",
      status: "false",
      reason: `Contains ${additives.length} additives including preservatives or colors`
    });
  } else {
    claims.push({
      claim: "No Artificial Additives",
      status: "verified",
      reason: "No artificial additives detected in ingredients"
    });
  }
  
  // Vegetarian check
  const nonVegIndicators = ['meat', 'chicken', 'beef', 'pork', 'fish', 'gelatin', 'lard'];
  const isNonVeg = nonVegIndicators.some(item => ingredients.includes(item));
  claims.push({
    claim: "Vegetarian",
    status: isNonVeg ? "false" : "verified",
    reason: isNonVeg ? "Contains non-vegetarian ingredients" : "No meat or fish ingredients detected"
  });
  
  // Processing level
  const novaGroup = productData?.nova_group;
  if (novaGroup) {
    if (novaGroup >= 4) {
      claims.push({
        claim: "Minimally Processed",
        status: "false",
        reason: `NOVA Group ${novaGroup} - ultra-processed food`
      });
    } else if (novaGroup <= 2) {
      claims.push({
        claim: "Minimally Processed",
        status: "verified",
        reason: `NOVA Group ${novaGroup} - low processing level`
      });
    }
  }
  
  return claims;
}
