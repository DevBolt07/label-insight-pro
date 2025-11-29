import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

// Your OCR.space API Key
const OCR_SPACE_API_KEY = 'K83414045188957';

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Parse the incoming JSON to get the Image
    let imageBase64: string;
    try {
      const body = await req.json();
      imageBase64 = body.image;
      
      if (!imageBase64) {
        throw new Error('No image data found in request body.');
      }
    } catch (e) {
      throw new Error('Failed to parse request body. Ensure content-type is application/json');
    }

    // Ensure base64 header is present for OCR.space
    if (!imageBase64.startsWith('data:')) {
      imageBase64 = `data:image/jpeg;base64,${imageBase64}`;
    }

    console.log("Sending image to OCR.space...");

    // 2. Call OCR.space API
    const formData = new FormData();
    formData.append('base64Image', imageBase64);
    formData.append('apikey', OCR_SPACE_API_KEY);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('OCREngine', '2'); // Engine 2 is better for numbers/special characters

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.IsErroredOnProcessing) {
      throw new Error(`OCR.space Error: ${data.ErrorMessage}`);
    }

    // 3. Extract the text
    const parsedText = data.ParsedResults?.[0]?.ParsedText || "";
    console.log("OCR Output:", parsedText);

    // 4. Parse the Text into Nutrition JSON (Using Regex)
    const result = parseNutritionText(parsedText);

    // 5. Return the result
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error processing request:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'An error occurred during analysis',
      details: error.toString() 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// --- HELPER: Regex Parser to turn Raw Text into JSON ---
function parseNutritionText(text: string) {
  // Normalize text for easier matching
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Helper regex patterns
  const extractValue = (regex: RegExp) => {
    const match = cleanText.match(regex);
    return match ? match[1].trim() : null;
  };

  // 1. Extract Nutrition Facts
  // Looks for "Calories 200" or "Energy: 200kcal"
  const calories = extractValue(/(?:Calories|Energy)\D*(\d+)/i);
  
  // Looks for "Total Fat 10g" or "Fat: 10g"
  const totalFat = extractValue(/(?:Total\s+)?Fat\s*(\d+(?:\.\d+)?\s*g)/i);
  const saturatedFat = extractValue(/(?:Saturated)\s*(?:Fat)?\s*(\d+(?:\.\d+)?\s*g)/i);
  const transFat = extractValue(/(?:Trans)\s*(?:Fat)?\s*(\d+(?:\.\d+)?\s*g)/i);
  
  const cholesterol = extractValue(/Cholesterol\s*(\d+(?:\.\d+)?\s*mg)/i);
  const sodium = extractValue(/Sodium\s*(\d+(?:\.\d+)?\s*mg)/i);
  
  const totalCarbs = extractValue(/(?:Total\s+)?Carb(?:ohydrate)?s?\s*(\d+(?:\.\d+)?\s*g)/i);
  const fiber = extractValue(/(?:Dietary\s+)?Fiber\s*(\d+(?:\.\d+)?\s*g)/i);
  const sugars = extractValue(/Sugars?\s*(\d+(?:\.\d+)?\s*g)/i);
  const protein = extractValue(/Protein\s*(\d+(?:\.\d+)?\s*g)/i);

  // 2. Extract Ingredients (Naive attempt: looks for "Ingredients:" -> End of line or block)
  let ingredients = ["Ingredients not detected"];
  const ingMatch = cleanText.match(/Ingredients?:?\s*([^.\n]+)/i);
  if (ingMatch && ingMatch[1]) {
    ingredients = ingMatch[1].split(',').map(i => i.trim());
  }

  // 3. Simple Logic for Health Analysis (Since we don't have AI)
  const alerts = [];
  let healthScore = 7; // Default baseline
  
  if (sugars && parseInt(sugars) > 10) {
    alerts.push("High Sugar Content");
    healthScore -= 2;
  }
  if (sodium && parseInt(sodium) > 400) {
    alerts.push("High Sodium");
    healthScore -= 1;
  }
  if (protein && parseInt(protein) > 10) {
    healthScore += 1;
  }

  return {
    product_name: "Scanned Product", // OCR can't reliably guess product name
    ingredients: ingredients,
    allergens: [], // Hard to detect without extensive list matching
    nutritional_info: {
      calories: calories || "0",
      total_fat: totalFat || "0g",
      saturated_fat: saturatedFat || "0g",
      trans_fat: transFat || "0g",
      cholesterol: cholesterol || "0mg",
      sodium: sodium || "0mg",
      total_carbohydrate: totalCarbs || "0g",
      dietary_fiber: fiber || "0g",
      sugars: sugars || "0g",
      protein: protein || "0g"
    },
    health_analysis: `Contains ${calories || '?'} calories and ${sugars || '?'} of sugar.`,
    health_score: Math.max(1, Math.min(10, healthScore)),
    alerts: alerts,
    suggestions: ["Check the label for allergens."]
  };
}