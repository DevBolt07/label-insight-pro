import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai';

// Initialize the Gemini client
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

// Use the latest Flash model. 
// If 'gemini-2.5-flash' gives errors, switch to 'gemini-1.5-flash'
const MODEL_NAME = 'gemini-2.5-flash';

const prompt = `
  Analyze the provided image of a nutrition label and return a detailed JSON object.
  The JSON object should have the following structure:
  {
    "product_name": "Name of the Product",
    "ingredients": ["Ingredient 1", "Ingredient 2", ...],
    "allergens": ["Allergen 1", "Allergen 2", ...],
    "nutritional_info": {
      "calories": "Value",
      "total_fat": "Value",
      "saturated_fat": "Value",
      "trans_fat": "Value",
      "cholesterol": "Value",
      "sodium": "Value",
      "total_carbohydrate": "Value",
      "dietary_fiber": "Value",
      "sugars": "Value",
      "protein": "Value"
    },
    "health_analysis": "A brief summary of the product's healthiness, mentioning key good and bad points.",
    "health_score": "A score from 1 (unhealthy) to 10 (very healthy).",
    "alerts": ["Warning about high sugar content", "Contains artificial sweeteners", ...],
    "suggestions": ["Consider a whole-grain alternative", "Look for options with less sodium", ...]
  }
  If any information is not present on the label, omit the corresponding key or set its value to null.
  Focus on accuracy. Extract only the information that is clearly visible in the image.
  Do not hallucinate or invent information. The entire response must be a single JSON object, without any markdown formatting like \`\`\`json.
`;

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error('Server configuration error: Missing Gemini API Key.');
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // --- FIX START: Read Request as JSON ---
    // The frontend sends { image: "BASE64_STRING..." }
    // We must parse this as JSON, not as a Blob.
    let imageBase64: string;
    
    try {
      const body = await req.json();
      imageBase64 = body.image;
      
      if (!imageBase64) {
        throw new Error('No image data found in request body.');
      }
    } catch (e) {
      throw new Error('Failed to parse request body. Ensure content-type is application/json and body contains { "image": "base64..." }');
    }
    // --- FIX END ---

    // Create the image part for the Gemini API request
    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: 'image/jpeg', // We assume JPEG from the frontend resize function
      },
    };
    
    // Retry logic for rate limiting and server errors
    const maxRetries = 3;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt} to generate content using ${MODEL_NAME}...`);
        
        const result = await model.generateContent([prompt, imagePart]);
        const response = result.response;
        const text = response.text();

        // Clean the response text to get a valid JSON string
        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonString);

        // Return the successful analysis
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (error: any) {
        lastError = error;
        console.error(`Error on attempt ${attempt}:`, error);

        // Check if it's a retryable error
        const isRateLimit = error?.message?.includes('429') || error?.status === 429;
        const isServerError = [500, 502, 503, 504].includes(error?.status) || 
                              error?.message?.includes('500') || 
                              error?.message?.includes('Internal Server Error');
        
        if (isRateLimit || isServerError) {
          const errorType = isRateLimit ? 'Rate limit' : 'Server error';
          console.log(`${errorType} hit on attempt ${attempt}. Retrying...`);
          
          // Exponential backoff: 2s, 4s, 8s
          const delayMs = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
          
          if (attempt < maxRetries) {
            console.log(`Waiting ${delayMs}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
          }
        }
        
        // If non-retryable or max retries reached, throw
        throw error;
      }
    }
    
    throw lastError;

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