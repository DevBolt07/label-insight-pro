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

    const systemContext = `You are a knowledgeable and friendly nutrition advisor and health coach. You provide personalized, evidence-based advice about food, nutrition, and health.

CURRENT CONTEXT:
${productData ? `Product being analyzed: ${JSON.stringify(productData, null, 2)}` : 'No specific product being analyzed'}

USER PROFILE:
${userProfile ? JSON.stringify(userProfile, null, 2) : 'No user profile available'}

GUIDELINES:
- Provide personalized advice based on the user's health profile
- Be encouraging and supportive
- Mention specific health concerns when relevant
- Keep responses concise (2-3 paragraphs max)
- Always recommend consulting healthcare professionals for serious concerns
- IMPORTANT: Never provide medical diagnosis.`;

    // Map history to Gemini format
    let contents = [];
    
    // Add system context as first user message
    contents.push({
      parts: [{ text: systemContext }]
    });

    if (conversationHistory && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === 'system') continue;
        contents.push({
          parts: [{ text: msg.content }]
        });
      }
    }

    contents.push({
      parts: [{ text: message }]
    });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
        generationConfig: { maxOutputTokens: 500, temperature: 0.7 }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const assistantMessage = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!assistantMessage) throw new Error('No content in Gemini response');

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
      response: "I'm having trouble connecting to my brain right now. Please try again in a moment."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
