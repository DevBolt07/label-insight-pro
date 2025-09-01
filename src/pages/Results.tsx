import { useState } from "react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { HealthScoreCard } from "@/components/ui/health-score-card";
import { IngredientAlertCard, IngredientAlert } from "@/components/ui/ingredient-alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Share, Bookmark, ExternalLink, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductData } from "@/services/openFoodFacts";
import { User } from "@supabase/supabase-js";

interface ResultsProps {
  onNavigate: (page: string) => void;
  user: User;
  data?: {
    productData?: ProductData;
    scanned?: boolean;
  };
}

const mockIngredients = [
  "Water", "Sugar", "High Fructose Corn Syrup", "Citric Acid", "Natural Flavors", 
  "Sodium Benzoate", "Caffeine", "Artificial Colors (Red 40, Blue 1)", "Sucralose"
];

const mockAlerts: IngredientAlert[] = [
  {
    id: "1",
    ingredient: "High Fructose Corn Syrup",
    alias: "HFCS",
    reason: "High sugar content may spike blood glucose levels rapidly. Consider limiting intake if you have diabetes.",
    severity: "high",
    userProfile: ["Diabetes"]
  },
  {
    id: "2", 
    ingredient: "Artificial Colors (Red 40, Blue 1)",
    reason: "Artificial food dyes may cause hyperactivity in children and allergic reactions in sensitive individuals.",
    severity: "medium",
    userProfile: ["Child Mode"]
  },
  {
    id: "3",
    ingredient: "Sodium Benzoate",
    alias: "E211",
    reason: "Preservative that may form benzene when combined with vitamin C. Generally safe but worth monitoring.",
    severity: "low"
  }
];

const mockContradictions = [
  {
    claim: "Sugar-Free",
    reality: "Contains High Fructose Corn Syrup and Sucralose",
    severity: "high" as const
  },
  {
    claim: "Natural Flavors",
    reality: "Contains artificial preservatives and colors",
    severity: "medium" as const
  }
];

const mockAlternatives = [
  {
    name: "Organic Fruit Juice",
    score: 85,
    grade: "A" as const,
    price: "$3.99",
    store: "Whole Foods"
  },
  {
    name: "Sparkling Water with Real Fruit",
    score: 92,
    grade: "A" as const,
    price: "$2.49",
    store: "Target"
  }
];

export function Results({ onNavigate, data }: ResultsProps) {
  const productData = data?.productData;
  
  // Generate alerts from product data
  const generateAlertsFromProduct = (product: ProductData): IngredientAlert[] => {
    const alerts: IngredientAlert[] = [];
    
    if (product.healthWarnings) {
      product.healthWarnings.forEach((warning, index) => {
        let severity: 'low' | 'medium' | 'high' = 'medium';
        
        if (warning.toLowerCase().includes('high')) severity = 'high';
        if (warning.toLowerCase().includes('ultra-processed')) severity = 'high';
        if (warning.toLowerCase().includes('poor')) severity = 'high';
        if (warning.toLowerCase().includes('additives')) severity = 'low';
        
        alerts.push({
          id: `warning-${index}`,
          ingredient: warning,
          reason: `This product ${warning.toLowerCase()}. Consider limiting consumption.`,
          severity,
          userProfile: []
        });
      });
    }
    
    return alerts;
  };

  const [alerts, setAlerts] = useState<IngredientAlert[]>(
    productData ? generateAlertsFromProduct(productData) : []
  );
  const [loading, setLoading] = useState(false);

  // Calculate health score based on Nutri-Score and other factors
  const calculateHealthScore = (product: ProductData): number => {
    let score = 50; // Base score
    
    switch (product.nutriscore?.toLowerCase()) {
      case 'a': score = 90; break;
      case 'b': score = 70; break;
      case 'c': score = 50; break;
      case 'd': score = 30; break;
      case 'e': score = 10; break;
    }
    
    // Adjust based on NOVA group
    if (product.nova_group === 4) score -= 20;
    if (product.nova_group === 1) score += 10;
    
    // Adjust based on health warnings
    score -= (product.healthWarnings?.length || 0) * 5;
    
    return Math.max(0, Math.min(100, score));
  };

  const healthScore = productData ? calculateHealthScore(productData) : 34;
  
  // Get grade from score
  const getGradeFromScore = (score: number): "A" | "B" | "C" | "D" | "E" => {
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    if (score >= 20) return 'D';
    return 'E';
  };

  const healthGrade = getGradeFromScore(healthScore);

  const handleDismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  // Parse ingredients into array
  const ingredientsList = productData?.ingredients ? 
    productData.ingredients.split(',').map(i => i.trim()).filter(i => i.length > 0) : 
    [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <MobileHeader 
          title="Analysis Results"
          showBack
          onBack={() => onNavigate("home")}
        />
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner variant="analysis" size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader 
        title="Analysis Results"
        showBack
        onBack={() => onNavigate("home")}
        rightAction={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-full">
              <Bookmark className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-full">
              <Share className="h-5 w-5" />
            </Button>
          </div>
        }
      />

      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Product Info */}
        <Card className="card-material overflow-hidden animate-fade-in">
          <div className="aspect-[4/3] bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center relative overflow-hidden">
            {productData?.image ? (
              <img src={productData.image} alt="Product" className="w-full h-full object-cover" />
            ) : (
              <img 
                src="https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=400&h=300&fit=crop" 
                alt="Product Sample" 
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
          <div className="p-5">
            <h2 className="text-headline-medium text-foreground font-semibold mb-2">
              {productData?.name || "Unknown Product"}
            </h2>
            {productData?.brand && (
              <p className="text-body-medium text-muted-foreground mb-3">
                by {productData.brand}
              </p>
            )}
            <div className="flex gap-2 flex-wrap">
              {productData?.categories && (
                <Badge variant="outline" className="rounded-full">
                  {productData.categories.split(',')[0]}
                </Badge>
              )}
              {productData?.nutriscore && (
                <Badge 
                  variant={productData.nutriscore === 'A' || productData.nutriscore === 'B' ? 'default' : 'destructive'} 
                  className="rounded-full"
                >
                  Nutri-Score {productData.nutriscore}
                </Badge>
              )}
              {productData?.nova_group === 4 && (
                <Badge variant="outline" className="rounded-full text-warning border-warning/50">
                  Ultra-Processed
                </Badge>
              )}
              {data?.scanned && (
                <Badge variant="secondary" className="rounded-full">Scanned</Badge>
              )}
            </div>
          </div>
        </Card>

        {/* Health Scores */}
        <div className="grid gap-4 animate-slide-up animate-stagger-1">
          <HealthScoreCard
            score={healthScore}
            grade={healthGrade}
            title="Health Score"
            description="Based on nutritional quality and processing level"
            className="animate-scale-in"
          />
          
          {productData?.nutritionFacts && (
            <Card className="card-material p-5 animate-scale-in animate-stagger-2">
              <h3 className="text-title-large text-foreground font-semibold mb-4">Nutrition Facts (per 100g)</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {productData.nutritionFacts.energy && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Energy</span>
                    <span className="font-medium">{Math.round(productData.nutritionFacts.energy)} kJ</span>
                  </div>
                )}
                {productData.nutritionFacts.fat !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fat</span>
                    <span className="font-medium">{productData.nutritionFacts.fat.toFixed(1)}g</span>
                  </div>
                )}
                {productData.nutritionFacts.saturatedFat !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Saturated Fat</span>
                    <span className="font-medium">{productData.nutritionFacts.saturatedFat.toFixed(1)}g</span>
                  </div>
                )}
                {productData.nutritionFacts.carbs !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Carbs</span>
                    <span className="font-medium">{productData.nutritionFacts.carbs.toFixed(1)}g</span>
                  </div>
                )}
                {productData.nutritionFacts.sugars !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sugars</span>
                    <span className="font-medium">{productData.nutritionFacts.sugars.toFixed(1)}g</span>
                  </div>
                )}
                {productData.nutritionFacts.protein !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Protein</span>
                    <span className="font-medium">{productData.nutritionFacts.protein.toFixed(1)}g</span>
                  </div>
                )}
                {productData.nutritionFacts.salt !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Salt</span>
                    <span className="font-medium">{productData.nutritionFacts.salt.toFixed(2)}g</span>
                  </div>
                )}
                {productData.nutritionFacts.fiber !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fiber</span>
                    <span className="font-medium">{productData.nutritionFacts.fiber.toFixed(1)}g</span>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Detailed Analysis */}
        <Tabs defaultValue="alerts" className="w-full">
          <TabsList className="grid w-full grid-cols-4 rounded-2xl">
            <TabsTrigger value="alerts" className="rounded-xl">
              Alerts
              {alerts.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                  {alerts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="ingredients" className="rounded-xl">Ingredients</TabsTrigger>
            <TabsTrigger value="claims" className="rounded-xl">Claims</TabsTrigger>
            <TabsTrigger value="alternatives" className="rounded-xl">Better</TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="space-y-3 mt-4">
            {alerts.length > 0 ? (
              alerts.map((alert) => (
                <IngredientAlertCard
                  key={alert.id}
                  alert={alert}
                  onDismiss={handleDismissAlert}
                />
              ))
            ) : (
              <Card className="card-material">
                <div className="p-6 text-center space-y-2">
                  <CheckCircle className="h-12 w-12 text-healthy mx-auto" />
                  <h3 className="text-title-large text-foreground">All Clear!</h3>
                  <p className="text-sm text-muted-foreground">
                    No health alerts for your profile
                  </p>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="ingredients" className="space-y-3 mt-4">
            <Card className="card-material">
              <div className="p-6 space-y-3">
                <h3 className="text-title-large text-foreground">Ingredients List</h3>
                {ingredientsList.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {ingredientsList.map((ingredient, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {ingredient}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No ingredients information available
                  </p>
                )}
                
                {/* Allergens */}
                {productData?.allergens && productData.allergens.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-foreground mb-2">Allergens</h4>
                    <div className="flex flex-wrap gap-1">
                      {productData.allergens.map((allergen, index) => (
                        <Badge key={index} variant="destructive" className="text-xs">
                          {allergen}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Additives */}
                {productData?.additives && productData.additives.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-foreground mb-2">Additives</h4>
                    <div className="flex flex-wrap gap-1">
                      {productData.additives.slice(0, 5).map((additive, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {additive}
                        </Badge>
                      ))}
                      {productData.additives.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{productData.additives.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="claims" className="space-y-3 mt-4">
            {mockContradictions.map((contradiction, index) => (
              <Card key={index} className="card-material">
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <XCircle className={cn(
                      "h-5 w-5",
                      contradiction.severity === "high" ? "text-danger" : "text-warning"
                    )} />
                    <h4 className="font-medium text-foreground">Claim Contradiction</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Claim: </span>
                      <span className="font-medium">{contradiction.claim}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Reality: </span>
                      <span className="text-foreground">{contradiction.reality}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="alternatives" className="space-y-3 mt-4">
            {mockAlternatives.map((alternative, index) => (
              <Card key={index} className="card-material">
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-foreground">{alternative.name}</h4>
                      <p className="text-sm text-muted-foreground">{alternative.store}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-gradient-healthy text-healthy-foreground">
                          {alternative.grade}
                        </Badge>
                        <span className="text-sm font-medium">{alternative.score}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{alternative.price}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Order Online
                  </Button>
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}