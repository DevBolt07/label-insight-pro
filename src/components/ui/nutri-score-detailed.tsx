import { Card } from "./card";
import { Badge } from "./badge";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, XCircle, TrendingUp, TrendingDown, Apple, Droplet } from "lucide-react";
import { ProductData } from "@/services/openFoodFacts";

interface NutriScoreDetailedProps {
  productData: ProductData;
  className?: string;
}

export function NutriScoreDetailed({ productData, className }: NutriScoreDetailedProps) {
  const nutriScore = productData.nutriscore?.toUpperCase() || 'C';
  
  // Get Nutri-Score config
  const getScoreConfig = (score: string) => {
    switch (score) {
      case 'A':
        return {
          color: 'bg-gradient-healthy',
          textColor: 'text-healthy',
          label: 'Excellent',
          description: 'High nutritional quality'
        };
      case 'B':
        return {
          color: 'bg-gradient-to-r from-lime-500 to-emerald-500',
          textColor: 'text-lime-600',
          label: 'Good',
          description: 'Good nutritional quality'
        };
      case 'C':
        return {
          color: 'bg-gradient-warning',
          textColor: 'text-warning',
          label: 'Fair',
          description: 'Average nutritional quality'
        };
      case 'D':
        return {
          color: 'bg-gradient-to-r from-orange-500 to-yellow-500',
          textColor: 'text-orange-600',
          label: 'Poor',
          description: 'Low nutritional quality'
        };
      case 'E':
        return {
          color: 'bg-gradient-danger',
          textColor: 'text-danger',
          label: 'Very Poor',
          description: 'Very low nutritional quality'
        };
      default:
        return {
          color: 'bg-muted',
          textColor: 'text-muted-foreground',
          label: 'Unknown',
          description: 'Nutritional data unavailable'
        };
    }
  };

  const config = getScoreConfig(nutriScore);

  // Analyze positive factors
  const positiveFactors = [];
  if (productData.nutritionFacts?.fiber && productData.nutritionFacts.fiber > 3) {
    positiveFactors.push({ label: 'High in fiber', value: `${productData.nutritionFacts.fiber.toFixed(1)}g per 100g` });
  }
  if (productData.nutritionFacts?.protein && productData.nutritionFacts.protein > 5) {
    positiveFactors.push({ label: 'Good protein content', value: `${productData.nutritionFacts.protein.toFixed(1)}g per 100g` });
  }
  if (productData.ingredientsAnalysisTags?.includes('en:vegan')) {
    positiveFactors.push({ label: 'Vegan', value: 'Plant-based' });
  }
  if (productData.ingredientsAnalysisTags?.includes('en:vegetarian')) {
    positiveFactors.push({ label: 'Vegetarian', value: 'No meat' });
  }
  if (productData.nova_group && productData.nova_group <= 2) {
    positiveFactors.push({ label: 'Minimally processed', value: `NOVA group ${productData.nova_group}` });
  }
  if (productData.nutritionFacts?.sugars !== undefined && productData.nutritionFacts.sugars < 5) {
    positiveFactors.push({ label: 'Low sugar', value: `${productData.nutritionFacts.sugars.toFixed(1)}g per 100g` });
  }

  // Analyze negative factors
  const negativeFactors = [];
  if (productData.nutritionFacts?.sugars && productData.nutritionFacts.sugars > 15) {
    negativeFactors.push({ 
      label: 'High in sugar', 
      value: `${productData.nutritionFacts.sugars.toFixed(1)}g per 100g`,
      warning: 'Exceeds WHO recommendation of 10% daily energy'
    });
  }
  if (productData.nutritionFacts?.salt && productData.nutritionFacts.salt > 1.5) {
    negativeFactors.push({ 
      label: 'High in salt', 
      value: `${productData.nutritionFacts.salt.toFixed(2)}g per 100g`,
      warning: 'NHS recommends max 6g salt per day'
    });
  }
  if (productData.nutritionFacts?.saturatedFat && productData.nutritionFacts.saturatedFat > 5) {
    negativeFactors.push({ 
      label: 'High saturated fat', 
      value: `${productData.nutritionFacts.saturatedFat.toFixed(1)}g per 100g`,
      warning: 'High intake increases heart disease risk'
    });
  }
  if (productData.nova_group === 4) {
    negativeFactors.push({ 
      label: 'Ultra-processed food', 
      value: 'NOVA group 4',
      warning: 'Associated with increased health risks'
    });
  }
  if (productData.additives && productData.additives.length > 5) {
    negativeFactors.push({ 
      label: 'Multiple additives', 
      value: `${productData.additives.length} additives detected`,
      warning: 'May contain artificial substances'
    });
  }

  // Health recommendations
  const recommendations = [];
  if (productData.nutritionFacts?.sugars && productData.nutritionFacts.sugars > 15) {
    recommendations.push('Limit consumption to occasional treats (WHO: <10% daily energy from added sugars)');
  }
  if (productData.nutritionFacts?.salt && productData.nutritionFacts.salt > 1.5) {
    recommendations.push('Monitor daily salt intake (NHS: max 6g per day for adults)');
  }
  if (productData.nova_group === 4) {
    recommendations.push('Choose minimally processed alternatives when possible');
  }
  if (!productData.nutritionFacts?.fiber || productData.nutritionFacts.fiber < 3) {
    recommendations.push('Ensure adequate fiber intake from other sources (NHS: 30g per day)');
  }

  return (
    <Card className={cn("card-material p-6 space-y-6", className)}>
      {/* Nutri-Score Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="text-title-large font-semibold text-foreground">Nutri-Score</h3>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
        <div className={cn("px-6 py-3 rounded-2xl shadow-lg", config.color)}>
          <span className="text-4xl font-black text-white">{nutriScore}</span>
        </div>
      </div>

      {/* Score Scale */}
      <div className="space-y-2">
        <div className="flex justify-between items-center gap-1">
          {['A', 'B', 'C', 'D', 'E'].map((grade) => (
            <div
              key={grade}
              className={cn(
                "flex-1 h-10 rounded-lg flex items-center justify-center font-bold text-white transition-all",
                grade === nutriScore ? 'ring-4 ring-primary/50 scale-110' : 'opacity-40',
                grade === 'A' && 'bg-gradient-healthy',
                grade === 'B' && 'bg-gradient-to-r from-lime-500 to-emerald-500',
                grade === 'C' && 'bg-gradient-warning',
                grade === 'D' && 'bg-gradient-to-r from-orange-500 to-yellow-500',
                grade === 'E' && 'bg-gradient-danger'
              )}
            >
              {grade}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span>Best</span>
          <span>Worst</span>
        </div>
      </div>

      {/* Positive Factors */}
      {positiveFactors.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-healthy" />
            <h4 className="font-semibold text-foreground">Positive Factors</h4>
          </div>
          <div className="space-y-2">
            {positiveFactors.map((factor, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-healthy/5 border border-healthy/20 rounded-lg">
                <TrendingUp className="h-4 w-4 text-healthy mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{factor.label}</p>
                  <p className="text-xs text-muted-foreground">{factor.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Negative Factors */}
      {negativeFactors.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-danger" />
            <h4 className="font-semibold text-foreground">Areas of Concern</h4>
          </div>
          <div className="space-y-2">
            {negativeFactors.map((factor, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-danger/5 border border-danger/20 rounded-lg">
                <TrendingDown className="h-4 w-4 text-danger mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{factor.label}</p>
                  <p className="text-xs text-muted-foreground">{factor.value}</p>
                  {factor.warning && (
                    <p className="text-xs text-danger mt-1 flex items-start gap-1">
                      <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      {factor.warning}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Health Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <Apple className="h-5 w-5 text-primary" />
            <h4 className="font-semibold text-foreground">Health Recommendations</h4>
          </div>
          <div className="space-y-2">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Droplet className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p>{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Source */}
      <div className="pt-3 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          Nutri-Score calculated by Open Food Facts based on European regulations
        </p>
      </div>
    </Card>
  );
}
