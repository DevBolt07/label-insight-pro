import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
      userContext = profileParts.length > 0 ? profileParts.join('\n') : 'User has not filled in profile details yet';
    }

    const systemPrompt = `You are a knowledgeable and friendly nutrition advisor with access to the user's complete health profile.

USER PROFILE INFORMATION:
${userContext}

CURRENT PRODUCT CONTEXT: ${productData ? JSON.stringify(productData) : 'No product currently being viewed'}

RESPONSE FORMAT:
- DO NOT use any markdown formatting like **bold**, *italic*, # headers, or bullet points with - or *.
- Write in plain, natural sentences.
- Use simple line breaks for separation when needed.
- Keep responses clean and easy to read.

GUIDELINES:
- You have full access to the user's profile information shown above. Use it to provide personalized advice.
- When asked about personal information (name, age, health conditions, allergies, etc.), refer to the USER PROFILE INFORMATION above.
- Consider the user's health conditions, allergies, and dietary preferences when giving nutrition advice.
- Alert the user if any ingredients in the current product conflict with their health profile.
- Be helpful, concise, and friendly.
- Never give medical diagnoses - recommend consulting healthcare professionals for serious health concerns.
- If the user asks about information not in their profile, let them know they can update it in the Profile section.`;

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

    // USE v1beta AND gemini-2.5-flash with increased token budget
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
        system_instruction: { parts: [{ text: systemPrompt }] },
        generation_config: { 
          max_output_tokens: 2048,
          temperature: 0.7
        }
      }),
    });

    const data = await response.json();
    console.log('Gemini raw response:', JSON.stringify(data));

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} - ${JSON.stringify(data)}`);
    }

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
