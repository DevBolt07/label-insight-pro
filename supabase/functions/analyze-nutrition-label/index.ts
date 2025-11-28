import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json(); // Expecting base64 image string (without data:image/ prefix)
    
    if (!image) {
      throw new Error('No image data provided');
    }

    console.log('Analyzing nutrition label image with Gemini...');

    // System prompt to ensure valid JSON output
    const systemPrompt = `You are a nutrition expert AI. 
    Analyze this image of a food product label. Extract the following information into a valid JSON object:
    1. "raw_text": All visible text on the label.
    2. "brand_name": The likely brand name.
    3. "product_name": The product name.
    4. "ingredients": A list of ingredient strings (clean up noise).
    5. "nutrition_facts": An object with keys like 'calories', 'protein', 'fat', 'carbohydrates', 'sugar', 'sodium', 'fiber'. Use numeric values where possible, or strings with units.
    6. "claims": Marketing claims (e.g., "Organic", "Gluten-Free").
    7. "health_analysis": A brief assessment object containing 'warnings' (array of strings) and 'positives' (array of strings).

    Return ONLY the raw JSON. Do not use markdown formatting.`;

    // Call Gemini 1.5 Flash (Multimodal)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: systemPrompt },
            { 
              inline_data: { 
                mime_type: "image/jpeg", 
                data: image 
              } 
            }
          ]
        }],
        generation_config: {
          temperature: 0.1,
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
    
    // Parse the JSON response
    let result;
    try {
      result = JSON.parse(contentText);
    } catch (e) {
      console.error("Failed to parse Gemini JSON:", e);
      throw new Error("Failed to parse analysis results");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-nutrition-label:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});