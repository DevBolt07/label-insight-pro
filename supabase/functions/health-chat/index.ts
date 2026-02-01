import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callGeminiWithFallback } from '../_shared/gemini.ts';

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  message: string;
  userProfile: any;
  productData: any;
  conversationHistory: ChatMessage[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userProfile, productData, conversationHistory }: ChatRequest = await req.json();

    if (!message) throw new Error('No message provided');

    console.log(`Processing health chat question with Gemini: ${message}`);

    // Build detailed user profile context
    let userContext = 'No user profile available';
    if (userProfile) {
      const profileParts = [];
      if (userProfile.first_name || userProfile.last_name) {
        profileParts.push(`Name: ${[userProfile.first_name, userProfile.last_name].filter(Boolean).join(' ')}`);
      }
      if (userProfile.age) profileParts.push(`Age: ${userProfile.age} years old`);
      if (userProfile.age_group) profileParts.push(`Age Group: ${userProfile.age_group}`);
      if (userProfile.height_cm) profileParts.push(`Height: ${userProfile.height_cm} cm`);
      if (userProfile.weight_kg) profileParts.push(`Weight: ${userProfile.weight_kg} kg`);
      if (userProfile.bmi) profileParts.push(`BMI: ${userProfile.bmi}`);
      if (userProfile.health_conditions?.length > 0) {
        profileParts.push(`Health Conditions: ${userProfile.health_conditions.join(', ')}`);
      }
      if (userProfile.custom_health_conditions?.length > 0) {
        profileParts.push(`Custom Health Conditions: ${userProfile.custom_health_conditions.join(', ')}`);
      }
      if (userProfile.allergies?.length > 0) {
        profileParts.push(`Allergies: ${userProfile.allergies.join(', ')}`);
      }
      if (userProfile.custom_allergies?.length > 0) {
        profileParts.push(`Custom Allergies: ${userProfile.custom_allergies.join(', ')}`);
      }
      if (userProfile.dietary_restrictions?.length > 0) {
        profileParts.push(`Dietary Restrictions: ${userProfile.dietary_restrictions.join(', ')}`);
      }
      if (userProfile.dietary_preferences?.length > 0) {
        profileParts.push(`Dietary Preferences: ${userProfile.dietary_preferences.join(', ')}`);
      }
      if (userProfile.custom_dietary_preferences?.length > 0) {
        profileParts.push(`Custom Dietary Preferences: ${userProfile.custom_dietary_preferences.join(', ')}`);
      }
      if (userProfile.nutrition_goals?.length > 0) {
        profileParts.push(`Nutrition Goals: ${userProfile.nutrition_goals.join(', ')}`);
      }
      userContext = profileParts.length > 0 ? profileParts.join('\n') : 'User has not filled in profile details yet';
    }

    const systemPrompt = `You are a personalized AI nutrition advisor for the "Nutri-Sense" app. 
    Your goal is to analyze food products and provide distinct, expert, and personalized advice based on the user's specific health profile.

    USER PROFILE:
    ${userContext}

    PRODUCT CONTEXT:
    ${productData ? JSON.stringify(productData) : 'No specific product context provided.'}

    RESPONSE GUIDELINES:
    1. **Be Structured**: Organize your answer clearly. 
    2. **Be Personalized**: ALWAYS cross-reference the product data with the user's "Nutrition Goals", "Allergies", and "Health Conditions".
       - If the product matches a goal, praise it (e.g., "Great for your muscle gain goal!").
       - If it conflicts, warn gently (e.g., "Note: High sodium might affect your blood pressure").
    3. **Be Objective**: Use facts from the product data (sugar content, ingredients) to back up your claims.
    4. **Tone**: Friendly, supportive, educated, but NOT medical advice.

    REQUIRED RESPONSE FORMAT (Use Markdown):
    
    ### 🥗 Verdict
    [One clear sentence: Is this good for the user? e.g., "This is a great choice for your low-carb diet."]

    ### 📊 Key Facts
    - [Bullet point 1: Specific relevant nutrient/ingredient facts]
    - [Bullet point 2: Connection to user profile]

    ### 💡 Recommendation
    [Practical tip on serving size, usage, or a healthier alternative if needed.]

    DO NOT include these headers if the user just says "Hi" or asks a general question. Only use this structure for product questions.
    Keep the full response under 150 words unless asked for detail.`;

    let contents = [];
    if (conversationHistory && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === 'system') continue;
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    // USE v1beta AND gemini-2.5-flash with increased token budget (via Fallback)
    const geminiBody = {
      contents: contents,
      system_instruction: { parts: [{ text: systemPrompt }] },
      generation_config: {
        max_output_tokens: 2048,
        temperature: 0.7
      }
    };

    const { result: data, usedModel } = await callGeminiWithFallback(geminiBody, "Health Chat", geminiApiKey || "");
    console.log(`Gemini response (Model: ${usedModel}):`, JSON.stringify(data));

    // Response is already JSON and ok if we got here (callGeminiWithFallback checks ok)

    const assistantMessage = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const finishReason = data.candidates?.[0]?.finishReason;

    console.log('Finish reason:', finishReason);

    if (!assistantMessage) {
      console.error('No content - finish reason:', finishReason);
      // If MAX_TOKENS was hit during thinking, provide fallback
      if (finishReason === 'MAX_TOKENS') {
        return new Response(JSON.stringify({
          response: "I understand your question. Based on your profile, I'd be happy to help with nutrition advice. Could you please ask a more specific question?",
          conversationId: crypto.randomUUID()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`No content in Gemini response. Finish reason: ${finishReason}`);
    }

    return new Response(JSON.stringify({
      response: assistantMessage,
      conversationId: crypto.randomUUID()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in health-chat function:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      response: "I'm having trouble connecting right now. Please try again."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
