import { useState } from "react";
import { Card } from "./card";
import { Badge } from "./badge";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, XCircle, TrendingUp, TrendingDown, Apple, Droplet, Package as PackageIcon, Factory, ChevronRight } from "lucide-react";
import { ProductData } from "@/services/openFoodFacts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { IngredientDetailModal } from "./ingredient-detail-modal";

interface NutriScoreDetailedProps {
  productData: ProductData;
  className?: string;
}

export function NutriScoreDetailed({ productData, className }: NutriScoreDetailedProps) {
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  
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

  // Get packaging score based on materials
  const getPackagingScore = () => {
    const packaging = productData.packaging?.toLowerCase() || '';
    
    if (packaging.includes('plastic') && !packaging.includes('recyclable')) {
      return { score: 'E', label: 'Poor packaging', color: 'danger', description: 'Non-recyclable plastic packaging' };
    } else if (packaging.includes('plastic') && packaging.includes('recyclable')) {
      return { score: 'C', label: 'Fair packaging', color: 'warning', description: 'Recyclable plastic packaging' };
    } else if (packaging.includes('cardboard') || packaging.includes('paper') || packaging.includes('glass')) {
      return { score: 'A', label: 'Excellent packaging', color: 'healthy', description: 'Eco-friendly packaging' };
    } else if (packaging.includes('metal') || packaging.includes('aluminum')) {
      return { score: 'B', label: 'Good packaging', color: 'healthy', description: 'Recyclable metal packaging' };
    }
    
    return { score: 'N/A', label: 'Unknown packaging', color: 'muted', description: 'No packaging data available' };
  };

  const packagingInfo = getPackagingScore();

  // Parse ingredients list for clickable items
  const ingredientsList = productData.ingredients
    ? productData.ingredients.split(',').map(i => i.trim()).filter(i => i.length > 0)
    : [];

  return (
    <>
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

        {/* Tabs for organized content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="positive">
              Positive
              {positiveFactors.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 bg-healthy/20 text-healthy">
                  {positiveFactors.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="negative">
              Concerns
              {negativeFactors.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 bg-danger/20 text-danger">
                  {negativeFactors.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="ingredients">Info</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              {/* Packaging Score */}
              {productData.packaging && (
                <div className="p-4 bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl border border-primary/10">
                  <div className="flex items-center gap-2 mb-2">
                    <PackageIcon className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground">Packaging</span>
                  </div>
                  <div className={cn(
                    "text-2xl font-bold mb-1",
                    packagingInfo.color === 'healthy' && 'text-healthy',
                    packagingInfo.color === 'warning' && 'text-warning',
                    packagingInfo.color === 'danger' && 'text-danger',
                    packagingInfo.color === 'muted' && 'text-muted-foreground'
                  )}>
                    {packagingInfo.score}
                  </div>
                  <p className="text-xs text-muted-foreground">{packagingInfo.label}</p>
                </div>
              )}

              {/* Food Processing (NOVA) */}
              {productData.nova_group && (
                <div className="p-4 bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl border border-primary/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Factory className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground">Processing</span>
                  </div>
                  <div className={cn(
                    "text-2xl font-bold mb-1",
                    productData.nova_group <= 2 ? 'text-healthy' : productData.nova_group === 3 ? 'text-warning' : 'text-danger'
                  )}>
                    NOVA {productData.nova_group}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {productData.nova_group === 1 && 'Unprocessed'}
                    {productData.nova_group === 2 && 'Processed culinary'}
                    {productData.nova_group === 3 && 'Processed'}
                    {productData.nova_group === 4 && 'Ultra-processed'}
                  </p>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {config.description}. This product has <strong className="text-foreground">{positiveFactors.length} positive factors</strong> and <strong className="text-foreground">{negativeFactors.length} areas of concern</strong>.
              </p>
            </div>

            {/* Health Recommendations */}
            {recommendations.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Apple className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold text-foreground">Health Recommendations</h4>
                </div>
                <div className="space-y-2">
                  {recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-muted-foreground p-3 bg-primary/5 rounded-lg">
                      <Droplet className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <p>{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Positive Factors Tab */}
          <TabsContent value="positive" className="space-y-4 mt-4">
            {positiveFactors.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-healthy" />
                  <h4 className="font-semibold text-foreground">Positive Nutritional Factors</h4>
                </div>
                <div className="space-y-2">
                  {positiveFactors.map((factor, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-4 bg-healthy/5 border border-healthy/20 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-healthy mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground mb-1">{factor.label}</p>
                        <p className="text-sm text-muted-foreground">{factor.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No significant positive factors identified</p>
              </div>
            )}
          </TabsContent>

          {/* Negative Factors / Areas of Concern Tab */}
          <TabsContent value="negative" className="space-y-4 mt-4">
            {negativeFactors.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-danger" />
                  <h4 className="font-semibold text-foreground">Areas of Concern</h4>
                </div>
                <div className="space-y-2">
                  {negativeFactors.map((factor, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-4 bg-danger/5 border border-danger/20 rounded-lg">
                      <TrendingDown className="h-5 w-5 text-danger mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground mb-1">{factor.label}</p>
                        <p className="text-sm text-muted-foreground mb-2">{factor.value}</p>
                        {factor.warning && (
                          <div className="flex items-start gap-2 p-2 bg-danger/10 rounded">
                            <AlertCircle className="h-4 w-4 text-danger mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-danger">{factor.warning}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-healthy" />
                <p className="font-medium text-healthy">No major concerns identified</p>
                <p className="text-sm mt-1">This product has a healthy nutritional profile</p>
              </div>
            )}
          </TabsContent>

          {/* Ingredients & Info Tab */}
          <TabsContent value="ingredients" className="space-y-4 mt-4">
            {/* Packaging Details */}
            {productData.packaging && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <PackageIcon className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold text-foreground">Packaging Information</h4>
                </div>
                <div className={cn(
                  "p-4 rounded-lg border",
                  packagingInfo.color === 'healthy' && "bg-healthy/5 border-healthy/20",
                  packagingInfo.color === 'warning' && "bg-warning/5 border-warning/20",
                  packagingInfo.color === 'danger' && "bg-danger/5 border-danger/20",
                  packagingInfo.color === 'muted' && "bg-muted/30 border-border"
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className={cn(
                      packagingInfo.color === 'healthy' && "bg-healthy/20 text-healthy",
                      packagingInfo.color === 'warning' && "bg-warning/20 text-warning",
                      packagingInfo.color === 'danger' && "bg-danger/20 text-danger"
                    )}>
                      Grade {packagingInfo.score}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{packagingInfo.label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{packagingInfo.description}</p>
                  <p className="text-xs text-muted-foreground capitalize">Materials: {productData.packaging}</p>
                </div>
              </div>
            )}

            {/* Food Processing Details */}
            {productData.nova_group && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Factory className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold text-foreground">Food Processing Level</h4>
                </div>
                <div className={cn(
                  "p-4 rounded-lg border",
                  productData.nova_group <= 2 ? "bg-healthy/5 border-healthy/20" : productData.nova_group === 3 ? "bg-warning/5 border-warning/20" : "bg-danger/5 border-danger/20"
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className={cn(
                      productData.nova_group <= 2 ? "bg-healthy/20 text-healthy" : productData.nova_group === 3 ? "bg-warning/20 text-warning" : "bg-danger/20 text-danger"
                    )}>
                      NOVA Group {productData.nova_group}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {productData.nova_group === 1 && 'Unprocessed or minimally processed foods (fresh fruits, vegetables, grains)'}
                    {productData.nova_group === 2 && 'Processed culinary ingredients (oils, butter, sugar, salt)'}
                    {productData.nova_group === 3 && 'Processed foods (canned vegetables, cheese, freshly made bread)'}
                    {productData.nova_group === 4 && 'Ultra-processed foods with industrial formulations, often containing additives'}
                  </p>
                </div>
              </div>
            )}

            {/* Clickable Ingredients List */}
            {ingredientsList.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Apple className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold text-foreground">Ingredients (Click for details)</h4>
                </div>
                <div className="space-y-2">
                  {ingredientsList.slice(0, 10).map((ingredient, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedIngredient(ingredient)}
                      className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors text-left group"
                    >
                      <span className="text-sm text-foreground">{ingredient}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </button>
                  ))}
                  {ingredientsList.length > 10 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      + {ingredientsList.length - 10} more ingredients
                    </p>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Data Source */}
        <div className="pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Nutri-Score calculated by Open Food Facts based on European regulations
          </p>
        </div>
      </Card>

      {/* Ingredient Detail Modal */}
      {selectedIngredient && (
        <IngredientDetailModal
          ingredient={selectedIngredient}
          isOpen={!!selectedIngredient}
          onClose={() => setSelectedIngredient(null)}
        />
      )}
    </>
  );
}
