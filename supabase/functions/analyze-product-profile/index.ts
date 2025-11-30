import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { productData, userProfile } = await req.json();

    if (!productData) {
      throw new Error('Product data is required');
    }

    console.log('Analyzing product with user profile...');

    // Build user context for personalization
    let userContext = "";
    if (userProfile) {
      const conditions = userProfile.health_conditions || [];
      const allergies = userProfile.allergies || [];
      const dietary = userProfile.dietary_preferences || [];
      const age = userProfile.age;
      
      userContext = `\n\nUSER PROFILE:\n`;
      if (age) userContext += `Age: ${age}\n`;
      if (conditions.length > 0) userContext += `Health Conditions: ${conditions.join(', ')}\n`;
      if (allergies.length > 0) userContext += `Allergies: ${allergies.join(', ')}\n`;
      if (dietary.length > 0) userContext += `Dietary Preferences: ${dietary.join(', ')}\n`;
    }

    // Build product summary for Gemini
    const productSummary = `
PRODUCT INFORMATION:
Name: ${productData.name || 'Unknown'}
Brand: ${productData.brand || 'Unknown'}
Categories: ${productData.categories || 'N/A'}
Ingredients: ${productData.ingredients || 'N/A'}
Allergens: ${productData.allergens?.join(', ') || 'None listed'}
Nutri-Score: ${productData.nutriscore || 'N/A'}
NOVA Group: ${productData.nova_group || 'N/A'}
Additives: ${productData.additives?.join(', ') || 'None listed'}

NUTRITION FACTS (per 100g):
${productData.nutritionFacts ? Object.entries(productData.nutritionFacts)
  .map(([key, value]) => `${key}: ${value}`)
  .join('\n') : 'Not available'}
${userContext}
`;

    const systemPrompt = `You are a personalized nutrition advisor. Analyze the product based on the user's health profile and provide specific, actionable advice.

Generate a JSON response with this structure:
{
  "personalized_alerts": ["Array of specific concerns for this user, e.g., 'High sodium - concern for your high blood pressure'"],
  "personalized_suggestions": ["Array of actionable recommendations, e.g., 'Consider lower-sodium alternatives'"],
  "overall_recommendation": "excellent" | "good" | "caution" | "avoid",
  "detailed_analysis": "Detailed explanation considering user's specific health conditions and dietary needs"
}`;

    const makeRequestWithRetry = async (attempt = 1): Promise<any> => {
      try {
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                role: 'user',
                parts: [{ text: productSummary }]
              }],
              system_instruction: { parts: [{ text: systemPrompt }] },
              generation_config: { 
                max_output_tokens: 1000, 
                temperature: 0.3,
                response_mime_type: "application/json"
              }
            }),
          }
        );

        if (!geminiResponse.ok) {
          const status = geminiResponse.status;
          
          // Retry on rate limit or server errors
          if ((status === 429 || status >= 500) && attempt < 3) {
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`Gemini error ${status}, retrying in ${delay}ms (attempt ${attempt}/3)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return makeRequestWithRetry(attempt + 1);
          }
          
          const errData = await geminiResponse.json();
          throw new Error(`Gemini API Error (${status}): ${JSON.stringify(errData)}`);
        }

        return await geminiResponse.json();
      } catch (error) {
        if (attempt < 3 && (error instanceof Error && error.message.includes('fetch'))) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`Network error, retrying in ${delay}ms (attempt ${attempt}/3)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return makeRequestWithRetry(attempt + 1);
        }
        throw error;
      }
    };

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const geminiData = await makeRequestWithRetry();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!rawText) throw new Error("Empty response from Gemini");

    const jsonString = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const analysis = JSON.parse(jsonString);

    console.log('Personalized analysis complete');

    return new Response(JSON.stringify({
      gemini_data: {
        personalized_alerts: analysis.personalized_alerts || [],
        personalized_suggestions: analysis.personalized_suggestions || [],
        overall_recommendation: analysis.overall_recommendation || 'good',
        detailed_analysis: analysis.detailed_analysis || 'Analysis unavailable'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in analyze-product-profile:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An error occurred',
      details: error.toString() 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
