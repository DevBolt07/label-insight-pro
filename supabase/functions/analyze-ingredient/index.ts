import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ingredientName, userProfile } = await req.json();
    if (!ingredientName) throw new Error('No ingredient name provided');

    console.log(`Analyzing ingredient with Gemini: ${ingredientName}`);

    const systemPrompt = `You are a nutrition expert. Analyze the ingredient "${ingredientName}".
    ${userProfile ? `Consider the user's profile: ${JSON.stringify(userProfile)}` : ''}

    Return ONLY a valid JSON object with this exact schema:
    {
      "name": "ingredient name",
      "summary": "concise 2-3 sentence summary",
      "healthEffects": ["effect 1", "effect 2"],
      "commonUses": ["use 1", "use 2"],
      "safetyInfo": "safety summary",
      "personalizedWarnings": ["warning 1 based on user profile"],
      "alternatives": ["healthier alternative 1"],
      "category": "natural" | "processed" | "artificial" | "preservative" | "additive"
    }`;

    // USE v1beta AND gemini-2.5-flash
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `Analyze the ingredient: ${ingredientName}` }] }],
        // USE snake_case FOR REST API
        system_instruction: { parts: [{ text: systemPrompt }] },
        generation_config: { 
            temperature: 0.2, 
            response_mime_type: "application/json" 
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    let analysisResult;
    try {
      analysisResult = JSON.parse(contentText);
    } catch (e) {
      console.error("JSON Parse Error", e);
      analysisResult = {
        name: ingredientName,
        summary: "Analysis unavailable due to parsing error.",
        healthEffects: [],
        commonUses: [],
        safetyInfo: "Unknown",
        personalizedWarnings: [],
        alternatives: [],
        category: "processed"
      };
    }

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-ingredient function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
