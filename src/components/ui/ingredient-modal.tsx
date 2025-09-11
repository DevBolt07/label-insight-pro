import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { AlertTriangle, CheckCircle, Info, Lightbulb, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { IngredientAnalysis } from "@/services/ingredientAnalysisService";

interface IngredientModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: IngredientAnalysis | null;
  isLoading: boolean;
}

export function IngredientModal({ isOpen, onClose, analysis, isLoading }: IngredientModalProps) {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'natural':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'processed':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'artificial':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'preservative':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'additive':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'natural':
        return <CheckCircle className="h-4 w-4" />;
      case 'artificial':
      case 'preservative':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto max-h-[80vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-title-large">
            {analysis?.name || 'Ingredient Analysis'}
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
            <span className="ml-2 text-muted-foreground">Analyzing ingredient...</span>
          </div>
        ) : analysis ? (
          <div className="space-y-4">
            {/* Category Badge */}
            <div className="flex items-center gap-2">
              <Badge className={cn("capitalize", getCategoryColor(analysis.category))}>
                {getCategoryIcon(analysis.category)}
                <span className="ml-1">{analysis.category}</span>
              </Badge>
            </div>

            {/* Summary */}
            <Card className="p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                What is it?
              </h3>
              <p className="text-sm text-muted-foreground">{analysis.summary}</p>
            </Card>

            {/* Health Effects */}
            {analysis.healthEffects.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Health Effects
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {analysis.healthEffects.map((effect, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-orange-500 mt-2 shrink-0" />
                      {effect}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Personalized Warnings */}
            {analysis.personalizedWarnings.length > 0 && (
              <Card className="p-4 border-red-200 bg-red-50">
                <h3 className="font-semibold mb-2 flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-4 w-4" />
                  Personal Health Alerts
                </h3>
                <ul className="text-sm text-red-700 space-y-1">
                  {analysis.personalizedWarnings.map((warning, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-red-500 mt-2 shrink-0" />
                      {warning}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Common Uses */}
            {analysis.commonUses.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Common Uses</h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.commonUses.map((use, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {use}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* Safety Information */}
            <Card className="p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Safety Information
              </h3>
              <p className="text-sm text-muted-foreground">{analysis.safetyInfo}</p>
            </Card>

            {/* Alternatives */}
            {analysis.alternatives.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-blue-500" />
                  Healthier Alternatives
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {analysis.alternatives.map((alternative, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-blue-500 mt-2 shrink-0" />
                      {alternative}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No analysis available</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}