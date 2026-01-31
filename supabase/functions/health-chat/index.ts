import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

// Configuration for models
const MODELS = {
  gemini: {
    // Correct Endpoint for Gemini 1.5 Flash
    url: (key: string) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
    modelName: 'gemini-1.5-flash'
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    modelName: 'gpt-4o-mini' // Efficient and cost-effective
  },
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    modelName: 'llama3-8b-8192' // Fast fallback
  }
};

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
  preferredLanguage?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userProfile, productData, conversationHistory, preferredLanguage }: ChatRequest = await req.json();

    if (!message) throw new Error('No message provided');

    console.log(`Processing health chat: ${message}`);

    // --- 1. Construct the System Prompt (Shared across all providers) ---
    let userContext = 'No user profile available';
    if (userProfile) {
      const profileParts: string[] = [];
      if (userProfile.first_name || userProfile.last_name) profileParts.push(`Name: ${[userProfile.first_name, userProfile.last_name].filter(Boolean).join(' ')}`);
      if (userProfile.age) profileParts.push(`Age: ${userProfile.age}`);
      if (userProfile.health_conditions?.length) profileParts.push(`Health Conditions: ${userProfile.health_conditions.join(', ')}`);
      if (userProfile.allergies?.length) profileParts.push(`Allergies: ${userProfile.allergies.join(', ')}`);
      if (userProfile.dietary_restrictions?.length) profileParts.push(`Dietary Restrictions: ${userProfile.dietary_restrictions.join(', ')}`);
      if (userProfile.nutrition_goals?.length) profileParts.push(`Nutrition Goals: ${userProfile.nutrition_goals.join(', ')}`);

      userContext = profileParts.join('\n') || 'User has not filled in profile details yet';
    }

    const languageInstruction = preferredLanguage
      ? `IMPORTANT: Always reply in the language specified by preferredLanguage "${preferredLanguage}".`
      : `IMPORTANT: Detect the language of the user's message and reply in the same language.`;

    const systemPrompt = `You are a personalized AI nutrition advisor for the "Nutri-Sense" app. 
    ${languageInstruction}

    USER PROFILE:
    ${userContext}

    PRODUCT CONTEXT:
    ${productData ? JSON.stringify(productData) : 'No specific product context provided.'}

    RESPONSE GUIDELINES:
    1. Be Structured, Personalized, and Objective.
    2. Tone: Friendly, supportive, educated, but NOT medical advice.
    3. Use Markdown formats (## Verdict, ## Key Facts, ## Recommendation).
    4. Keep response under 150 words unless asked for detail.`;

    // --- 2. Define Provider Functions ---

    // GEMINI
    const callGemini = async () => {
      if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');
      console.log('Attempting Gemini...');

      const contents = conversationHistory?.slice(-5).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })) || [];

      contents.push({ role: 'user', parts: [{ text: message }] });

      const response = await fetch(MODELS.gemini.url(GEMINI_API_KEY), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          system_instruction: { parts: [{ text: systemPrompt }] },
          generation_config: { max_output_tokens: 1024, temperature: 0.7 }
        })
      });

      if (!response.ok) {
        const errData = await response.text();
        throw new Error(`Gemini Error ${response.status}: ${errData}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text;
    };

    // OPENAI / GROQ (Standard OpenAI-compatible format)
    const callOpenAICompatible = async (provider: 'openai' | 'groq') => {
      const apiKey = provider === 'openai' ? OPENAI_API_KEY : GROQ_API_KEY;
      const config = MODELS[provider];

      if (!apiKey) throw new Error(`${provider.toUpperCase()}_API_KEY missing`);
      console.log(`Attempting ${provider}...`);

      const messages: any[] = [{ role: 'system', content: systemPrompt }];
      if (conversationHistory?.length) {
        messages.push(...conversationHistory.slice(-5));
      }
      messages.push({ role: 'user', content: message });

      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: config.modelName,
          messages,
          max_tokens: 1024,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errData = await response.text();
        throw new Error(`${provider} Error ${response.status}: ${errData}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content;
    };

    // --- 3. Execute Fallback Chain ---
    let finalResponse = null;
    let errors: string[] = [];

    // Try Gemini First
    try {
      finalResponse = await callGemini();
    } catch (e: any) {
      console.error('Gemini failed:', e.message);
      errors.push(`Gemini: ${e.message}`);

      // Try OpenAI Second
      try {
        finalResponse = await callOpenAICompatible('openai');
      } catch (e: any) {
        console.error('OpenAI failed:', e.message);
        errors.push(`OpenAI: ${e.message}`);

        // Try Groq Third
        try {
          finalResponse = await callOpenAICompatible('groq');
        } catch (e: any) {
          console.error('Groq failed:', e.message);
          errors.push(`Groq: ${e.message}`);
        }
      }
    }

    if (!finalResponse) {
      throw new Error(`All providers failed. Errors: ${JSON.stringify(errors)}`);
    }

    // Success
    return new Response(JSON.stringify({
      response: finalResponse,
      conversationId: crypto.randomUUID()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Final Error in health-chat:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      response: "I'm having trouble connecting to my AI services right now. Please try again in a moment."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
