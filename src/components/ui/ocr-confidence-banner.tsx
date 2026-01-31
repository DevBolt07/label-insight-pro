import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle, Info, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "./button";
import { Card } from "./card";

interface OCRConfidenceBannerProps {
  confidence: number;
  rawText?: string;
  ingredientsDetected: boolean;
  className?: string;
}

export function OCRConfidenceBanner({ 
  confidence, 
  rawText, 
  ingredientsDetected,
  className 
}: OCRConfidenceBannerProps) {
  const [showRawText, setShowRawText] = useState(false);
  
  const isLowConfidence = confidence < 70 || !ingredientsDetected;
  const isWarning = confidence < 85 && confidence >= 70;

  const getStatusConfig = () => {
    if (!ingredientsDetected) {
      return {
        icon: AlertTriangle,
        bgColor: "bg-danger/10 border-danger/30",
        textColor: "text-danger",
        title: "Ingredients Not Clearly Identified",
        description: "The OCR couldn't clearly identify the ingredients list. Results may be incomplete."
      };
    }
    if (confidence < 70) {
      return {
        icon: AlertTriangle,
        bgColor: "bg-danger/10 border-danger/30",
        textColor: "text-danger",
        title: "Low Confidence Scan",
        description: "The image quality or text clarity is poor. Consider rescanning with better lighting."
      };
    }
    if (confidence < 85) {
      return {
        icon: Info,
        bgColor: "bg-warning/10 border-warning/30",
        textColor: "text-warning",
        title: "Moderate Confidence",
        description: "Some text may not be perfectly accurate. Verify important details."
      };
    }
    return {
      icon: CheckCircle,
      bgColor: "bg-healthy/10 border-healthy/30",
      textColor: "text-healthy",
      title: "High Confidence Scan",
      description: "Text was clearly extracted from the label."
    };
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  return (
    <Card className={cn(
      "border overflow-hidden",
      config.bgColor,
      className
    )}>
      <div className="p-4 space-y-3">
        {/* Status Header */}
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-lg bg-background/50", config.textColor)}>
            <StatusIcon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className={cn("font-semibold text-sm", config.textColor)}>
                {config.title}
              </h4>
              <span className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full bg-background/50",
                config.textColor
              )}>
                {Math.round(confidence)}% confident
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {config.description}
            </p>
          </div>
        </div>

        {/* View Raw Text Toggle */}
        {rawText && (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRawText(!showRawText)}
              className="w-full justify-center gap-2 text-xs h-8"
            >
              {showRawText ? (
                <>
                  <EyeOff className="h-3 w-3" />
                  Hide Raw OCR Text
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3" />
                  View Raw OCR Text
                </>
              )}
            </Button>

            {showRawText && (
              <div className="bg-background/80 rounded-lg p-3 border border-border/50 max-h-48 overflow-y-auto">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                  {rawText || "No raw text available"}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
