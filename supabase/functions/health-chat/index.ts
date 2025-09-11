import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userProfile, productData, conversationHistory }: ChatRequest = await req.json();

    if (!message) {
      throw new Error('No message provided');
    }

    console.log(`Processing health chat question: ${message}`);

    // Build context-aware system prompt
    const systemPrompt = `You are a knowledgeable and friendly nutrition advisor and health coach. You provide personalized, evidence-based advice about food, nutrition, and health.

CURRENT CONTEXT:
${productData ? `Product being analyzed: ${JSON.stringify(productData, null, 2)}` : 'No specific product being analyzed'}

USER PROFILE:
${userProfile ? JSON.stringify(userProfile, null, 2) : 'No user profile available'}

GUIDELINES:
- Always provide personalized advice based on the user's health profile
- Be encouraging and supportive in your tone
- Give actionable, practical advice
- Mention specific health concerns when relevant to the user's profile
- If asked about ingredients, explain their effects considering the user's conditions
- Keep responses concise but informative (2-3 paragraphs max)
- Always recommend consulting healthcare professionals for serious concerns
- Use emojis sparingly but appropriately for a friendly tone

IMPORTANT: Never provide medical diagnosis or treatment advice. Always recommend consulting healthcare professionals for medical concerns.`;

    // Prepare messages for OpenAI
    let messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history (last 10 messages to stay within token limits)
    if (conversationHistory && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-10);
      messages = messages.concat(recentHistory);
    }

    // Add current user message
    messages.push({ role: 'user', content: message });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 500,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;
    
    console.log('AI response generated successfully');

    return new Response(JSON.stringify({
      response: assistantMessage,
      conversationId: crypto.randomUUID() // For tracking conversations
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in health-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      response: "I'm sorry, I'm having trouble processing your question right now. Please try again later, and remember to consult with healthcare professionals for any serious health concerns."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});