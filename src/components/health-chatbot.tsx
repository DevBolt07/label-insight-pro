import { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { aiChatService, ChatMessage } from "@/services/aiChatService";
import { useToast } from "@/hooks/use-toast";

interface HealthChatbotProps {
  userProfile?: any;
  productData?: any;
  className?: string;
}

export function HealthChatbot({ userProfile, productData, className }: HealthChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize with welcome message and suggested questions
    const welcomeMessage: ChatMessage = {
      role: 'assistant',
      content: productData
        ? `Hi! I'm your personal nutrition advisor. I can help you understand this product and provide personalized health advice based on your profile. What would you like to know?`
        : `Hi! I'm your personal nutrition advisor. I can provide personalized health and nutrition guidance. How can I help you today?`,
      timestamp: new Date()
    };

    setMessages([welcomeMessage]);
    setSuggestedQuestions(aiChatService.getSuggestedQuestions(productData));
  }, [productData]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (messageText?: string) => {
    const message = messageText || inputMessage.trim();
    if (!message || isLoading) return;

    setInputMessage("");
    setIsLoading(true);

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await aiChatService.sendMessage(message, userProfile, productData);

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Chat error:', error);

      // Handle rate limiting gracefully for demo
      if (error.message && (error.message.includes('429') || error.message.includes('quota'))) {
        const fallbackMessage: ChatMessage = {
          role: 'assistant',
          content: "### ⚠️ High Traffic\n\nI'm receiving a lot of requests right now! \n\n**Quick Analysis:**\nBased on general nutrition advice, check the **sugar** and **saturated fat** levels on the label. Safe limits are usually <5g sugar and <1.5g sat fat per 100g.",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, fallbackMessage]);
        return;
      }

      toast({
        title: "Chat Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={cn("flex flex-col h-full max-h-[600px]", className)}>
      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div key={index} className={cn(
              "flex gap-3",
              message.role === 'user' ? "justify-end" : "justify-start"
            )}>
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}

              <Card className={cn(
                "max-w-[85%] p-3 shadow-sm",
                message.role === 'user'
                  ? "bg-primary text-primary-foreground ml-auto rounded-tr-none"
                  : "bg-muted/40 mr-auto rounded-tl-none border-border/50"
              )}>
                <div className={cn("text-sm overflow-hidden", message.role === 'user' ? "prose-invert" : "prose dark:prose-invert")}>
                  {message.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <div className="markdown-content space-y-2 [&>h3]:text-sm [&>h3]:font-bold [&>h3]:mt-2 [&>h3]:mb-1 [&>ul]:list-disc [&>ul]:pl-4 [&>ul]:space-y-1 [&>p]:leading-normal">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
                <p className={cn(
                  "text-[10px] mt-1.5 text-right opacity-70",
                  message.role === 'user' ? "text-primary-foreground/80" : "text-muted-foreground"
                )}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </Card>

              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <Card className="bg-muted/50 p-3">
                <div className="flex items-center gap-2">
                  <LoadingSpinner className="h-4 w-4" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Suggested Questions */}
      {suggestedQuestions.length > 0 && messages.length <= 1 && (
        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Quick questions:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, index) => (
              <Badge
                key={index}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 transition-colors text-xs"
                onClick={() => handleSendMessage(question)}
              >
                {question}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-border/50">
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about nutrition, ingredients, or health..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            size="sm"
            className="px-3"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}