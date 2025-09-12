import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IngredientAnalysis {
  name: string;
  summary: string;
  healthEffects: string[];
  commonUses: string[];
  safetyInfo: string;
  personalizedWarnings: string[];
  alternatives: string[];
  category: 'natural' | 'processed' | 'artificial' | 'preservative' | 'additive';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ingredientName, userProfile } = await req.json();

    if (!ingredientName) {
      throw new Error('No ingredient name provided');
    }

    console.log(`Analyzing ingredient: ${ingredientName}`);

    const systemPrompt = `You are a nutrition and food science expert. Analyze the ingredient "${ingredientName}" and provide comprehensive information.

    ${userProfile ? `Consider the user's profile: ${JSON.stringify(userProfile)}` : ''}

    Return your analysis in the following JSON format:
    {
      "name": "ingredient name",
      "summary": "concise 2-3 sentence summary of what this ingredient is",
      "healthEffects": ["positive and negative health effects"],
      "commonUses": ["common uses in food products"],
      "safetyInfo": "safety information and potential concerns",
      "personalizedWarnings": ["specific warnings based on user profile"],
      "alternatives": ["healthier alternatives if applicable"],
      "category": "natural|processed|artificial|preservative|additive"
    }

    Be accurate, evidence-based, and consider the user's specific health conditions and dietary restrictions when providing personalized warnings.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Analyze the ingredient: ${ingredientName}`
          }
        ],
        max_tokens: 800,
        temperature: 0.2
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('Raw AI response:', content);

    // Parse the JSON response
    let analysisResult: IngredientAnalysis;
    try {
      analysisResult = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Fallback response
      analysisResult = {
        name: ingredientName,
        summary: `${ingredientName} is a food ingredient commonly used in processed foods.`,
        healthEffects: ['Effects vary depending on individual sensitivity'],
        commonUses: ['Food production and preservation'],
        safetyInfo: 'Generally recognized as safe when consumed in normal amounts',
        personalizedWarnings: [],
        alternatives: ['Natural alternatives may be available'],
        category: 'processed'
      };
    }

    console.log('Ingredient analysis result:', analysisResult);

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-ingredient function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to analyze ingredient'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});