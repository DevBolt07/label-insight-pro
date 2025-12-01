import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

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

      const systemPrompt = `You are a nutrition expert performing FULL-SPECTRUM EXTRACTION from food labels.

CRITICAL INSTRUCTIONS:
1. Extract EVERY ingredient listed, reading through ALL line breaks until you hit a stop section (allergen advice, storage instructions, etc.)
2. Extract ALL nutritional values from the nutrition table (Energy, Protein, Fat, Carbohydrates, Sodium, Sugars, etc.)
3. Extract ALL allergen information including "Contains" and "May contain traces of"
4. Do NOT stop after the first 1-2 items - continue parsing until you've captured everything

PARSING RULES:
- Ingredients section: Read continuously through newlines, capture percentages in parentheses, include all items separated by commas, periods, or line breaks
- Nutrition table: Extract all rows including Energy (kJ/kcal), Protein, Fat (total and saturated), Carbohydrates (total and sugars), Sodium, Fiber, etc.
- Allergens: Capture both "Contains: X" and "May contain traces of: Y, Z"
- Multi-line lists: Do NOT truncate - parse the entire block until hitting a clear section boundary

Return this EXACT JSON structure:
{
  "product_name": "Product Name",
  "ingredients": ["Complete list of ALL ingredients with percentages if shown"],
  "allergens": ["All allergens including traces"],
  "nutritional_info": {
    "energy_kj": "Value with unit",
    "energy_kcal": "Value with unit", 
    "protein": "Value with unit",
    "total_fat": "Value with unit",
    "saturated_fat": "Value with unit",
    "trans_fat": "Value with unit",
    "carbohydrate": "Value with unit",
    "sugars": "Value with unit",
    "dietary_fiber": "Value with unit",
    "sodium": "Value with unit",
    "cholesterol": "Value with unit"
  },
  "health_analysis": "Brief summary",
  "health_score": "1-10",
  "alerts": ["Health warnings"],
  "suggestions": ["Recommendations"]
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
    ingredients: (() => {
      const match = clean.match(/Ingredients?:?\s*([\s\S]+?)(?:Allergen Advice|Allergy Advice|Allergens?:|Store in|Storage|Directions|Thoughtfully made|$)/i);
      const raw = match?.[1] || "Not found";
      return raw
        .replace(/\n+/g, ' ')
        .split(/[,•]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    })(),
    allergens: [],
    nutritional_info: {
      calories: find(/(?:Calories|Energy)\D*(\d+)/i), 
      total_fat: find(/Total\s*Fat\s*(\d+(?:\.\d+)?\w*)/i), 
      saturated_fat: "0g", 
      trans_fat: "0g", 
      cholesterol: "0mg", 
      sodium: find(/Sodium\s*(\d+(?:\.\d+)?\w*)/i), 
      total_carbohydrate: find(/Carb(?:ohydrate)?s?\s*(\d+(?:\.\d+)?\w*)/i),
      dietary_fiber: "0g", 
      sugars: find(/Sugars?\s*(\d+(?:\.\d+)?\w*)/i), 
      protein: find(/Protein\s*(\d+(?:\.\d+)?\w*)/i),
      iron: find(/Iron\s*(\d+(?:\.\d+)?\w*)/i)
    },
    health_analysis: "Basic OCR data (AI unavailable).",
    health_score: 5,
    alerts: ["AI unavailable"],
    suggestions: [],
    raw_text: text // Add it here too for type safety if needed
  };
}