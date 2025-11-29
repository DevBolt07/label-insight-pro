import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai';
import { Buffer } from "https://deno.land/std@0.177.0/node/buffer.ts";

// Initialize the Gemini client
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
if (!GEMINI_API_KEY) {
  console.error('Missing GEMINI_API_KEY environment variable.');
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
// Use the stable 1.5 Flash model for reliability
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// The analysis prompt
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
  Do not hallucinate or invent information. The entire response must be a single JSON object, without any markdown formatting like \\\`\\\`\\\`json.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error('Server configuration error: Missing Gemini API Key.');
    }

    // The client sends the raw image file in the body, so we read it as a blob.
    const imageBlob = await req.blob();
    if (!imageBlob || imageBlob.size === 0) {
      throw new Error('Image file is required in the request body.');
    }

    // Convert the image blob to a base64 string for the Gemini API
    const imageBuffer = await imageBlob.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');

    // Create the image part for the Gemini API request
    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: imageBlob.type,
      },
    };
    
    // Retry logic for rate limiting
    const maxRetries = 3;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt} to generate content...`);
        const result = await model.generateContent([prompt, imagePart]);
        const response = result.response;
        const text = response.text();

        // Clean the response text to get a valid JSON string
        // The Gemini response sometimes includes \\\`\\\`\\\`json markdown, so we remove it.
        const jsonString = text.replace(/\\\`\\\`\\\`json/g, '').replace(/\\\`\\\`\\\`/g, '').trim();
        const data = JSON.parse(jsonString);

        // Return the successful analysis
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a retryable error (rate limit or server error)
        const isRateLimit = error?.message?.includes('429') || error?.status === 429;
        const isServerError = [500, 502, 503, 504].includes(error?.status) || 
                              error?.message?.includes('500') || 
                              error?.message?.includes('Internal Server Error');
        
        if (isRateLimit || isServerError) {
          const errorType = isRateLimit ? 'Rate limit' : 'Server error';
          console.log(`${errorType} hit on attempt ${attempt}. Retrying...`);
          
          // Extract retry delay from error if available, otherwise use exponential backoff
          const retryDelay = error?.errorDetails?.find((d: any) => d.retryDelay)?.retryDelay;
          const delayMs = retryDelay 
            ? parseInt(retryDelay.replace('s', '')) * 1000 
            : Math.min(2000 * Math.pow(2, attempt - 1), 10000); // 2s, 4s, 8s max
          
          if (attempt < maxRetries) {
            console.log(`Waiting ${delayMs}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
          }
        }
        
        // For non-retryable errors or last retry, throw immediately
        throw error;
      }
    }
    
    // If we exhausted all retries
    throw lastError;
  } catch (error) {
    // Log the actual error to the Supabase function logs
    console.error('Error processing request:', error);
    
    // Return a generic error response to the client
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
