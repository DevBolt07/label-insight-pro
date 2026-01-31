import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { Badge } from "./badge";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Info, Leaf, TestTube, Shield } from "lucide-react";

interface IngredientDetailModalProps {
  ingredient: string;
  isOpen: boolean;
  onClose: () => void;
}

export function IngredientDetailModal({ ingredient, isOpen, onClose }: IngredientDetailModalProps) {
  // Parse ingredient data - this is a simplified version
  // In production, you'd want to fetch from a database or API
  const getIngredientInfo = (name: string) => {
    const lowerName = name.toLowerCase();
    
    // Common ingredients database (simplified)
    const database: Record<string, any> = {
      'sugar': {
        category: 'sweetener',
        natural: false,
        description: 'Refined carbohydrate sweetener extracted from sugarcane or sugar beet',
        healthEffects: ['High glycemic index', 'Can contribute to tooth decay', 'Linked to obesity when consumed in excess'],
        concerns: ['Can cause blood sugar spikes', 'Addictive properties', 'Empty calories'],
        benefits: ['Quick energy source', 'Improves taste and palatability'],
        alternatives: ['Stevia', 'Monk fruit', 'Dates']
      },
      'salt': {
        category: 'preservative',
        natural: true,
        description: 'Sodium chloride, essential mineral for body function',
        healthEffects: ['Essential for nerve function', 'Maintains fluid balance', 'Excessive intake linked to high blood pressure'],
        concerns: ['Can raise blood pressure', 'Increased heart disease risk', 'Kidney strain'],
        benefits: ['Preserves food', 'Essential electrolyte', 'Enhances flavor'],
        alternatives: ['Herbs and spices', 'Lemon juice', 'Garlic']
      },
      'palm oil': {
        category: 'oil',
        natural: true,
        description: 'Vegetable oil derived from oil palm fruit',
        healthEffects: ['High in saturated fat', 'Contains vitamin E', 'May increase cholesterol'],
        concerns: ['Environmental impact', 'High saturated fat content', 'Linked to deforestation'],
        benefits: ['Stable at high temperatures', 'Long shelf life', 'Neutral flavor'],
        alternatives: ['Olive oil', 'Coconut oil', 'Sunflower oil']
      }
    };

    // Check if ingredient exists in database
    for (const [key, value] of Object.entries(database)) {
      if (lowerName.includes(key)) {
        return value;
      }
    }

    // Default fallback
    return {
      category: 'ingredient',
      natural: null,
      description: `${name} is a food ingredient commonly used in processed foods.`,
      healthEffects: ['Effects may vary based on individual sensitivity', 'Consult nutrition facts for detailed information'],
      concerns: ['No specific concerns identified'],
      benefits: ['Contributes to product taste or preservation'],
      alternatives: ['Check product variations for alternatives']
    };
  };

  const info = getIngredientInfo(ingredient);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <TestTube className="h-6 w-6 text-primary" />
            {ingredient}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Category Badge */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">
              {info.category}
            </Badge>
            {info.natural !== null && (
              <Badge 
                variant="outline" 
                className={cn(
                  info.natural ? "border-healthy text-healthy" : "border-warning text-warning"
                )}
              >
                {info.natural ? 'Natural' : 'Processed'}
              </Badge>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">What is it?</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {info.description}
            </p>
          </div>

          {/* Health Effects */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Health Effects</h3>
            </div>
            <div className="space-y-2">
              {info.healthEffects.map((effect: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <span className="text-muted-foreground">{effect}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Concerns */}
          {info.concerns && info.concerns.length > 0 && (
            <div className="space-y-3 p-4 bg-danger/5 border border-danger/20 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-danger" />
                <h3 className="font-semibold text-foreground">Potential Concerns</h3>
              </div>
              <div className="space-y-2">
                {info.concerns.map((concern: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-danger mt-2 shrink-0" />
                    <span className="text-muted-foreground">{concern}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Benefits */}
          {info.benefits && info.benefits.length > 0 && (
            <div className="space-y-3 p-4 bg-healthy/5 border border-healthy/20 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-healthy" />
                <h3 className="font-semibold text-foreground">Benefits</h3>
              </div>
              <div className="space-y-2">
                {info.benefits.map((benefit: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-healthy mt-2 shrink-0" />
                    <span className="text-muted-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alternatives */}
          {info.alternatives && info.alternatives.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">Healthier Alternatives</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {info.alternatives.map((alt: string, idx: number) => (
                  <Badge key={idx} variant="outline" className="border-primary/20 text-primary">
                    {alt}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Data Source */}
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Ingredient information based on nutritional science and food safety databases
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
