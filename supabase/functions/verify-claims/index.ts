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

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const prompt = `You are a food claims verification expert. Analyze this product and verify common marketing claims.

PRODUCT DATA:
- Name: ${productData?.name || 'Unknown'}
- Brand: ${productData?.brand || 'Unknown'}
- Ingredients: ${productData?.ingredients || 'Not available'}
- Nutri-Score: ${productData?.nutriscore || 'N/A'}
- NOVA Group: ${productData?.nova_group || 'N/A'}
- Nutrition Facts: ${JSON.stringify(productData?.nutritionFacts || {})}
- Additives: ${JSON.stringify(productData?.additives || [])}
- Allergens: ${JSON.stringify(productData?.allergens || [])}

USER PROFILE:
- Health Conditions: ${JSON.stringify(userProfile?.health_conditions || [])}
- Allergies: ${JSON.stringify(userProfile?.allergies || [])}
- Dietary Preferences: ${JSON.stringify(userProfile?.dietary_preferences || [])}

Analyze and verify potential claims this product could make. Check if common claims would be TRUE or MISLEADING based on the actual data.

Return ONLY a valid JSON array with 3-5 claim verifications. Each object must have:
- "claim": the marketing claim (e.g., "Sugar Free", "High Protein", "Natural", "Vegetarian")
- "status": "verified" (claim is true), "misleading" (partially true/exaggerated), or "false" (claim is not true)
- "reason": brief explanation (max 15 words)

Example format:
[
  {"claim": "Sugar Free", "status": "false", "reason": "Contains 12g sugar per serving"},
  {"claim": "High Protein", "status": "verified", "reason": "Contains 25g protein per 100g"}
]

Return ONLY the JSON array, no other text.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const geminiData = await response.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    console.log('Gemini response:', responseText);

    // Parse JSON from response
    let claims: ClaimVerification[] = [];
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        claims = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse claims:', parseError);
      // Return default claims if parsing fails
      claims = [
        { claim: "Analysis Pending", status: "misleading", reason: "Unable to verify claims at this time" }
      ];
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
