import { supabase } from "@/integrations/supabase/client";

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface ChatResponse {
  response: string;
  conversationId: string;
}

class AIChatService {
  private conversationHistory: ChatMessage[] = [];

  async sendMessage(
    message: string, 
    userProfile?: any, 
    productData?: any
  ): Promise<ChatResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('health-chat', {
        body: {
          message,
          userProfile,
          productData,
          conversationHistory: this.conversationHistory
        }
      });

      if (error) {
        console.error('Chat service error:', error);
        throw new Error(`Failed to get response: ${error.message}`);
      }

      if (!data) {
        throw new Error('No response received');
      }

      // Add messages to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: message,
        timestamp: new Date()
      });

      this.conversationHistory.push({
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      });

      // Keep only last 20 messages to prevent memory issues
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }

      return {
        response: data.response,
        conversationId: data.conversationId
      };
    } catch (error) {
      console.error('AI chat service error:', error);
      
      // Return fallback response
      return {
        response: "I apologize, but I'm having difficulty processing your question right now. Please try again, and remember to consult healthcare professionals for any serious health concerns.",
        conversationId: crypto.randomUUID()
      };
    }
  }

  getConversationHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  clearConversation(): void {
    this.conversationHistory = [];
  }

  // Get suggested questions based on product data
  getSuggestedQuestions(productData?: any): string[] {
    const baseQuestions = [
      "Is this product healthy for me?",
      "What ingredients should I be concerned about?",
      "Can you suggest healthier alternatives?",
      "How does this fit into my dietary needs?"
    ];

    if (!productData) return baseQuestions;

    const contextualQuestions = [];

    if (productData.healthWarnings?.length > 0) {
      contextualQuestions.push("What are the main health concerns with this product?");
    }

    if (productData.nutriscore && productData.nutriscore !== 'A') {
      contextualQuestions.push("Why does this product have a low Nutri-Score?");
    }

    if (productData.nova_group && productData.nova_group > 2) {
      contextualQuestions.push("Is this processed food bad for me?");
    }

    return [...contextualQuestions, ...baseQuestions].slice(0, 4);
  }
}

export const aiChatService = new AIChatService();
