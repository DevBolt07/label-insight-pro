import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai';

// Configuration
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const OCR_SPACE_API_KEY = 'K83414045188957'; 

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- 1. PARSE INPUT ---
    let imageBase64: string;
    try {
      const body = await req.json();
      imageBase64 = body.image;
      if (!imageBase64) throw new Error('No image data found');
    } catch (e) {
      throw new Error('Failed to parse request body');
    }

    if (!imageBase64.startsWith('data:')) {
      imageBase64 = `data:image/jpeg;base64,${imageBase64}`;
    }

    console.log("Step 1: Sending image to OCR.space...");

    // --- 2. CALL OCR.SPACE ---
    const formData = new FormData();
    formData.append('base64Image', imageBase64);
    formData.append('apikey', OCR_SPACE_API_KEY);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('OCREngine', '2'); 

    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
    });

    const ocrData = await ocrResponse.json();

    if (ocrData.IsErroredOnProcessing) {
      throw new Error(`OCR.space Error: ${ocrData.ErrorMessage}`);
    }

    const extractedText = ocrData.ParsedResults?.[0]?.ParsedText || "";
    console.log("OCR Success! Text length:", extractedText.length);
    
    if (!extractedText || extractedText.length < 5) {
      throw new Error("OCR failed to extract readable text.");
    }

    // --- 3. TRY GEMINI VIA RAW FETCH ---
    try {
      if (!GEMINI_API_KEY) throw new Error("No Gemini Key");
      
      console.log("Step 2: Sending text to Gemini 2.5 Flash...");

      const systemPrompt = `You are a nutrition expert. 
      I will provide text extracted from a food label. 
      Parse it into this EXACT JSON structure. If fields are missing, infer them or use "0".
      
      Required JSON:
      {
        "product_name": "Product Name",
        "ingredients": ["List", "of", "ingredients"],
        "allergens": ["List", "of", "allergens"],
        "nutritional_info": {
          "calories": "Value", "total_fat": "Value", "saturated_fat": "Value", 
          "trans_fat": "Value", "cholesterol": "Value", "sodium": "Value", 
          "total_carbohydrate": "Value", "dietary_fiber": "Value", 
          "sugars": "Value", "protein": "Value"
        },
        "health_analysis": "Short summary",
        "health_score": "1-10",
        "alerts": ["Warnings"],
        "suggestions": ["Suggestions"]
      }`;

      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: `EXTRACTED TEXT:\n${extractedText}` }]
          }],
          system_instruction: { parts: [{ text: systemPrompt }] },
          generation_config: { 
            max_output_tokens: 1000, 
            temperature: 0.1,
            response_mime_type: "application/json"
          }
        }),
      });

      if (!geminiResponse.ok) {
        const errData = await geminiResponse.json();
        throw new Error(`Gemini API Error: ${JSON.stringify(errData)}`);
      }

      const geminiData = await geminiResponse.json();
      const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!rawText) throw new Error("Empty response from Gemini");

      const jsonString = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const finalJson = JSON.parse(jsonString);

      // *** ADD RAW TEXT TO RESPONSE ***
      finalJson.raw_text = extractedText;

      console.log("Gemini JSON parsing successful!");
      
      return new Response(JSON.stringify(finalJson), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (aiError) {
      console.error("Gemini failed, falling back to Regex:", aiError);
      const fallbackResult = parseNutritionText(extractedText);
      // *** ADD RAW TEXT TO FALLBACK ***
      fallbackResult.raw_text = extractedText; 
      
      return new Response(JSON.stringify(fallbackResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error: any) {
    console.error('Fatal Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An error occurred',
      details: error.toString() 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function parseNutritionText(text: string) {
  const clean = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const find = (r: RegExp) => (clean.match(r) || [])[1]?.trim() || "0";

  return {
    product_name: "Scanned Product",
    ingredients: (clean.match(/Ingredients?:?\s*([^.\n]+)/i)?.[1] || "Not found").split(','),
    allergens: [],
    nutritional_info: {
      calories: find(/(?:Calories|Energy)\D*(\d+)/i), 
      total_fat: find(/Total\s*Fat\s*(\d+(?:\.\d+)?\w*)/i), 
      saturated_fat: "0g", trans_fat: "0g", cholesterol: "0mg", 
      sodium: find(/Sodium\s*(\d+(?:\.\d+)?\w*)/i), 
      total_carbohydrate: find(/Carb(?:ohydrate)?s?\s*(\d+(?:\.\d+)?\w*)/i),
      dietary_fiber: "0g", 
      sugars: find(/Sugars?\s*(\d+(?:\.\d+)?\w*)/i), 
      protein: find(/Protein\s*(\d+(?:\.\d+)?\w*)/i)
    },
    health_analysis: "Basic OCR data (AI unavailable).",
    health_score: 5,
    alerts: ["AI unavailable"],
    suggestions: [],
    raw_text: text // Add it here too for type safety if needed
  };
}