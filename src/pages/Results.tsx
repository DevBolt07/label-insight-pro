import { useState } from "react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { HealthScoreCard } from "@/components/ui/health-score-card";
import { IngredientAlertCard, IngredientAlert } from "@/components/ui/ingredient-alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { IngredientModal } from "@/components/ui/ingredient-modal";
import { HealthChatbot } from "@/components/health-chatbot";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Share, Bookmark, ExternalLink, AlertTriangle, CheckCircle, XCircle, Camera, FileText, Eye, MessageCircle, Sparkles, Package, MapPin, Factory, Info, Leaf, Calendar, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductData } from "@/services/openFoodFacts";
import { OCRResult } from "@/services/ocrService";
import { IngredientAnalysis, ingredientAnalysisService } from "@/services/ingredientAnalysisService";
import { User } from "@supabase/supabase-js";

interface ResultsProps {
  onNavigate: (page: string, data?: any) => void;
  user: User;
  data?: {
    productData?: ProductData;
    ocrResult?: OCRResult;
    scanned?: boolean;
    amazonLink?: string;
    featured?: boolean;
    scanMethod?: 'barcode' | 'ocr';
  };
}

// No mock data - all data comes from real scans and API

export function Results({ onNavigate, user, data }: ResultsProps) {
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);
  const [ingredientAnalysis, setIngredientAnalysis] = useState<IngredientAnalysis | null>(null);
  const [isAnalyzingIngredient, setIsAnalyzingIngredient] = useState(false);
  const [ingredientModalOpen, setIngredientModalOpen] = useState(false);

  const productData = data?.productData;
  const ocrResult = data?.ocrResult;
  const isOCRResult = data?.scanMethod === 'ocr' && ocrResult;
  
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

  // Generate alerts from OCR results
  const generateAlertsFromOCR = (ocrResult: OCRResult): IngredientAlert[] => {
    const alerts: IngredientAlert[] = [];
    
    ocrResult.healthAnalysis.warnings.forEach((warning, index) => {
      let severity: 'low' | 'medium' | 'high' = 'medium';
      
      if (warning.toLowerCase().includes('high')) severity = 'high';
      if (warning.toLowerCase().includes('excess')) severity = 'high';
      
      alerts.push({
        id: `ocr-warning-${index}`,
        ingredient: warning,
        reason: warning,
        severity,
        userProfile: []
      });
    });
    
    return alerts;
  };

  const [alerts, setAlerts] = useState<IngredientAlert[]>(() => {
    if (isOCRResult && ocrResult) {
      return generateAlertsFromOCR(ocrResult);
    } else if (productData) {
      return generateAlertsFromProduct(productData);
    }
    return [];
  });
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

  const healthScore = (() => {
    if (isOCRResult && ocrResult) {
      return ocrResult.healthAnalysis.healthScore;
    } else if (productData) {
      return calculateHealthScore(productData);
    }
    return 34; // Default score
  })();
  
  // Get grade from score
  const getGradeFromScore = (score: number): "A" | "B" | "C" | "D" | "E" => {
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    if (score >= 20) return 'D';
    return 'E';
  };

  const healthGrade = (() => {
    if (isOCRResult && ocrResult) {
      return ocrResult.healthAnalysis.grade;
    }
    return getGradeFromScore(healthScore);
  })();

  const handleDismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const handleIngredientClick = async (ingredientName: string) => {
    setSelectedIngredient(ingredientName);
    setIngredientModalOpen(true);
    setIsAnalyzingIngredient(true);
    setIngredientAnalysis(null);

    try {
      // Get user profile for personalized analysis (you can extend this)
      const userProfile = {
        healthConditions: [],
        allergies: [],
        dietaryRestrictions: []
      };

      const analysis = await ingredientAnalysisService.analyzeIngredient(
        ingredientName,
        userProfile
      );
      
      setIngredientAnalysis(analysis);
    } catch (error) {
      console.error('Failed to analyze ingredient:', error);
    } finally {
      setIsAnalyzingIngredient(false);
    }
  };

  const handleCloseIngredientModal = () => {
    setIngredientModalOpen(false);
    setSelectedIngredient(null);
    setIngredientAnalysis(null);
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
          {!isOCRResult && (
            <div className="aspect-[4/3] bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center relative overflow-hidden">
              {productData?.image && productData.image !== "/placeholder.svg" ? (
                <img src={productData.image} alt="Product" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center space-y-2">
                  <Camera className="h-16 w-16 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Image Not Found</p>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
          )}
          <div className="p-5">
            {isOCRResult ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-6 w-6 text-primary" />
                  <h2 className="text-headline-medium text-foreground font-semibold">
                    OCR Nutrition Analysis
                  </h2>
                </div>
                <p className="text-body-medium text-muted-foreground mb-3">
                  Extracted from nutrition label • Confidence: {Math.round(ocrResult.confidence)}%
                </p>
              </>
            ) : (
              <>
                <h2 className="text-headline-medium text-foreground font-semibold mb-2">
                  {productData?.name || "Unknown Product"}
                </h2>
                {productData?.brand && (
                  <p className="text-body-medium text-muted-foreground mb-3">
                    by {productData.brand}
                  </p>
                )}
              </>
            )}
            <div className="flex gap-2 flex-wrap">
              {!isOCRResult && productData?.categories && (
                <Badge variant="outline" className="rounded-full">
                  {productData.categories.split(',')[0]}
                </Badge>
              )}
              {!isOCRResult && productData?.nutriscore && (
                <Badge 
                  variant={productData.nutriscore === 'A' || productData.nutriscore === 'B' ? 'default' : 'destructive'} 
                  className="rounded-full"
                >
                  Nutri-Score {productData.nutriscore}
                </Badge>
              )}
              {!isOCRResult && productData?.nova_group === 4 && (
                <Badge variant="outline" className="rounded-full text-warning border-warning/50">
                  Ultra-Processed
                </Badge>
              )}
              {isOCRResult && (
                <Badge variant="secondary" className="rounded-full">
                  <FileText className="h-3 w-3 mr-1" />
                  OCR Scan
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
          
          {(productData?.nutritionFacts || (isOCRResult && ocrResult?.nutritionData)) && (
            <Card className="card-material p-5 animate-scale-in animate-stagger-2">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-primary" />
                <h3 className="text-title-large text-foreground font-semibold">
                  {isOCRResult ? "Extracted Nutrition Facts" : "Nutrition Facts (per 100g)"}
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {isOCRResult && ocrResult?.nutritionData ? (
                  // OCR nutrition data
                  <>
                    {ocrResult.nutritionData.calories && (
                      <div className="flex justify-between p-2 bg-muted/20 rounded">
                        <span className="text-muted-foreground">Calories</span>
                        <span className="font-medium">{ocrResult.nutritionData.calories}</span>
                      </div>
                    )}
                    {ocrResult.nutritionData.fat !== undefined && (
                      <div className="flex justify-between p-2 bg-muted/20 rounded">
                        <span className="text-muted-foreground">Fat</span>
                        <span className="font-medium">{ocrResult.nutritionData.fat}g</span>
                      </div>
                    )}
                    {ocrResult.nutritionData.carbohydrates !== undefined && (
                      <div className="flex justify-between p-2 bg-muted/20 rounded">
                        <span className="text-muted-foreground">Carbs</span>
                        <span className="font-medium">{ocrResult.nutritionData.carbohydrates}g</span>
                      </div>
                    )}
                    {ocrResult.nutritionData.sugar !== undefined && (
                      <div className="flex justify-between p-2 bg-muted/20 rounded">
                        <span className="text-muted-foreground">Sugar</span>
                        <span className="font-medium">{ocrResult.nutritionData.sugar}g</span>
                      </div>
                    )}
                    {ocrResult.nutritionData.protein !== undefined && (
                      <div className="flex justify-between p-2 bg-muted/20 rounded">
                        <span className="text-muted-foreground">Protein</span>
                        <span className="font-medium">{ocrResult.nutritionData.protein}g</span>
                      </div>
                    )}
                    {ocrResult.nutritionData.sodium !== undefined && (
                      <div className="flex justify-between p-2 bg-muted/20 rounded">
                        <span className="text-muted-foreground">Sodium</span>
                        <span className="font-medium">{ocrResult.nutritionData.sodium}mg</span>
                      </div>
                    )}
                    {ocrResult.nutritionData.fiber !== undefined && (
                      <div className="flex justify-between p-2 bg-muted/20 rounded">
                        <span className="text-muted-foreground">Fiber</span>
                        <span className="font-medium">{ocrResult.nutritionData.fiber}g</span>
                      </div>
                    )}
                    {ocrResult.nutritionData.servingSize && (
                      <div className="col-span-2 pt-2 border-t border-border">
                        <div className="flex justify-between p-2 bg-primary/5 rounded">
                          <span className="text-muted-foreground">Serving Size</span>
                          <span className="font-medium">{ocrResult.nutritionData.servingSize}</span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  // Original product nutrition data - Enhanced with all fields
                  <>
                    {productData?.nutritionFacts?.energyKcal && (
                      <div className="flex justify-between p-2 bg-muted/20 rounded">
                        <span className="text-muted-foreground">Energy</span>
                        <span className="font-medium">{Math.round(productData.nutritionFacts.energyKcal)} kcal</span>
                      </div>
                    )}
                    {productData?.nutritionFacts?.fat !== undefined && (
                      <div className="flex justify-between p-2 bg-muted/20 rounded">
                        <span className="text-muted-foreground">Fat</span>
                        <span className="font-medium">{productData.nutritionFacts.fat.toFixed(1)}g</span>
                      </div>
                    )}
                    {productData?.nutritionFacts?.saturatedFat !== undefined && (
                      <div className="flex justify-between p-2 bg-muted/20 rounded">
                        <span className="text-muted-foreground">Saturated Fat</span>
                        <span className="font-medium">{productData.nutritionFacts.saturatedFat.toFixed(1)}g</span>
                      </div>
                    )}
                    {productData?.nutritionFacts?.carbs !== undefined && (
                      <div className="flex justify-between p-2 bg-muted/20 rounded">
                        <span className="text-muted-foreground">Carbs</span>
                        <span className="font-medium">{productData.nutritionFacts.carbs.toFixed(1)}g</span>
                      </div>
                    )}
                    {productData?.nutritionFacts?.sugars !== undefined && (
                      <div className="flex justify-between p-2 bg-muted/20 rounded">
                        <span className="text-muted-foreground">Sugars</span>
                        <span className="font-medium">{productData.nutritionFacts.sugars.toFixed(1)}g</span>
                      </div>
                    )}
                    {productData?.nutritionFacts?.protein !== undefined && (
                      <div className="flex justify-between p-2 bg-muted/20 rounded">
                        <span className="text-muted-foreground">Protein</span>
                        <span className="font-medium">{productData.nutritionFacts.protein.toFixed(1)}g</span>
                      </div>
                    )}
                    {productData?.nutritionFacts?.salt !== undefined && (
                      <div className="flex justify-between p-2 bg-muted/20 rounded">
                        <span className="text-muted-foreground">Salt</span>
                        <span className="font-medium">{productData.nutritionFacts.salt.toFixed(2)}g</span>
                      </div>
                    )}
                    {productData?.nutritionFacts?.fiber !== undefined && (
                      <div className="flex justify-between p-2 bg-muted/20 rounded">
                        <span className="text-muted-foreground">Fiber</span>
                        <span className="font-medium">{productData.nutritionFacts.fiber.toFixed(1)}g</span>
                      </div>
                    )}
                    {productData?.nutritionFacts?.cholesterol !== undefined && (
                      <div className="flex justify-between p-2 bg-muted/20 rounded">
                        <span className="text-muted-foreground">Cholesterol</span>
                        <span className="font-medium">{productData.nutritionFacts.cholesterol.toFixed(1)}g</span>
                      </div>
                    )}
                    {productData?.nutritionFacts?.vitaminA !== undefined && (
                      <div className="flex justify-between p-2 bg-muted/20 rounded">
                        <span className="text-muted-foreground">Vitamin A</span>
                        <span className="font-medium">{productData.nutritionFacts.vitaminA.toFixed(1)}g</span>
                      </div>
                    )}
                    {productData?.nutritionFacts?.vitaminC !== undefined && (
                      <div className="flex justify-between p-2 bg-muted/20 rounded">
                        <span className="text-muted-foreground">Vitamin C</span>
                        <span className="font-medium">{productData.nutritionFacts.vitaminC.toFixed(1)}g</span>
                      </div>
                    )}
                    {productData?.nutritionFacts?.calcium !== undefined && (
                      <div className="flex justify-between p-2 bg-muted/20 rounded">
                        <span className="text-muted-foreground">Calcium</span>
                        <span className="font-medium">{productData.nutritionFacts.calcium.toFixed(1)}g</span>
                      </div>
                    )}
                    {productData?.nutritionFacts?.iron !== undefined && (
                      <div className="flex justify-between p-2 bg-muted/20 rounded">
                        <span className="text-muted-foreground">Iron</span>
                        <span className="font-medium">{productData.nutritionFacts.iron.toFixed(1)}g</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Product Details - Only for barcode scans */}
        {!isOCRResult && productData && (
          <>
            {/* Basic Product Information */}
            {(productData.genericName || productData.quantity || productData.packaging || productData.countries || productData.manufacturingPlaces) && (
              <Card className="card-material p-5 animate-fade-in">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="h-5 w-5 text-primary" />
                  <h3 className="text-title-large text-foreground font-semibold">Product Details</h3>
                </div>
                <div className="space-y-3 text-sm">
                  {productData.genericName && (
                    <div className="flex items-start gap-3">
                      <Package className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-muted-foreground text-xs">Generic Name</p>
                        <p className="font-medium">{productData.genericName}</p>
                      </div>
                    </div>
                  )}
                  {productData.quantity && (
                    <div className="flex items-start gap-3">
                      <Package className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-muted-foreground text-xs">Quantity</p>
                        <p className="font-medium">{productData.quantity}</p>
                      </div>
                    </div>
                  )}
                  {productData.packaging && (
                    <div className="flex items-start gap-3">
                      <Package className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-muted-foreground text-xs">Packaging</p>
                        <p className="font-medium">{productData.packaging}</p>
                      </div>
                    </div>
                  )}
                  {productData.countries && (
                    <div className="flex items-start gap-3">
                      <Globe className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-muted-foreground text-xs">Countries</p>
                        <p className="font-medium">{productData.countries}</p>
                      </div>
                    </div>
                  )}
                  {productData.manufacturingPlaces && (
                    <div className="flex items-start gap-3">
                      <Factory className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-muted-foreground text-xs">Manufacturing Places</p>
                        <p className="font-medium">{productData.manufacturingPlaces}</p>
                      </div>
                    </div>
                  )}
                  {productData.labels && (
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-muted-foreground text-xs">Labels</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {productData.labels.split(',').slice(0, 3).map((label, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {label.trim()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Health & Environmental Indicators */}
            {(productData.ecoscore || productData.carbonFootprint || productData.ingredientsAnalysisTags) && (
              <Card className="card-material p-5 animate-fade-in">
                <div className="flex items-center gap-2 mb-4">
                  <Leaf className="h-5 w-5 text-green-600" />
                  <h3 className="text-title-large text-foreground font-semibold">Environmental Impact</h3>
                </div>
                <div className="space-y-4">
                  {productData.ecoscore && (
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-foreground">Eco-Score</p>
                        <p className="text-xs text-muted-foreground">Environmental rating</p>
                      </div>
                      <Badge 
                        className={cn(
                          "text-lg font-bold px-4 py-1",
                          productData.ecoscore === 'A' && "bg-green-600",
                          productData.ecoscore === 'B' && "bg-lime-600",
                          productData.ecoscore === 'C' && "bg-yellow-600",
                          productData.ecoscore === 'D' && "bg-orange-600",
                          productData.ecoscore === 'E' && "bg-red-600"
                        )}
                      >
                        {productData.ecoscore}
                      </Badge>
                    </div>
                  )}
                  {productData.carbonFootprint !== undefined && (
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-foreground">Carbon Footprint</p>
                        <p className="text-xs text-muted-foreground">CO₂ per kg</p>
                      </div>
                      <span className="text-lg font-bold">{productData.carbonFootprint.toFixed(2)} kg</span>
                    </div>
                  )}
                  {productData.ingredientsAnalysisTags && productData.ingredientsAnalysisTags.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">Product Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {productData.ingredientsAnalysisTags.map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tag.replace('en:', '').replace(/-/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {(productData.palmOilIngredients !== undefined || productData.mayBePalmOilIngredients !== undefined) && (
                    <div className="pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        {productData.palmOilIngredients ? `${productData.palmOilIngredients} palm oil ingredient(s)` : 'No palm oil ingredients'}{' '}
                        {productData.mayBePalmOilIngredients ? `• ${productData.mayBePalmOilIngredients} may contain palm oil` : ''}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Product Images */}
            {(productData.imageIngredientsUrl || productData.imageNutritionUrl || productData.imagePackagingUrl) && (
              <Card className="card-material p-5 animate-fade-in">
                <div className="flex items-center gap-2 mb-4">
                  <Camera className="h-5 w-5 text-primary" />
                  <h3 className="text-title-large text-foreground font-semibold">Product Images</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {productData.imageIngredientsUrl && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Ingredients</p>
                      <img 
                        src={productData.imageIngredientsUrl} 
                        alt="Ingredients" 
                        className="w-full aspect-square object-cover rounded-lg border border-border"
                      />
                    </div>
                  )}
                  {productData.imageNutritionUrl && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Nutrition</p>
                      <img 
                        src={productData.imageNutritionUrl} 
                        alt="Nutrition" 
                        className="w-full aspect-square object-cover rounded-lg border border-border"
                      />
                    </div>
                  )}
                  {productData.imagePackagingUrl && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Packaging</p>
                      <img 
                        src={productData.imagePackagingUrl} 
                        alt="Packaging" 
                        className="w-full aspect-square object-cover rounded-lg border border-border"
                      />
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Metadata & Link */}
            {(productData.link || productData.lastModified || productData.stores) && (
              <Card className="card-material p-5 animate-fade-in">
                <div className="space-y-3 text-sm">
                  {productData.link && (
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => window.open(productData.link, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                      View on Open Food Facts
                    </Button>
                  )}
                  {productData.lastModified && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Last updated: {new Date(productData.lastModified * 1000).toLocaleDateString()}</span>
                    </div>
                  )}
                  {productData.stores && (
                    <div className="flex items-start gap-2 text-xs">
                      <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-muted-foreground">Available at</p>
                        <p className="font-medium">{productData.stores}</p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </>
        )}

        {/* Amazon Purchase Button */}
        {data?.amazonLink && (
          <Card className="card-material animate-scale-in animate-stagger-3">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-warning/10">
                  <ExternalLink className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <h3 className="text-title-large font-semibold text-foreground">Available for Purchase</h3>
                  <p className="text-sm text-muted-foreground">Buy this healthy product online</p>
                </div>
              </div>
              <Button 
                onClick={() => window.open(data.amazonLink, '_blank')}
                className="w-full bg-gradient-warning hover:opacity-90 text-warning-foreground rounded-xl h-12 font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                🛒 Buy on Amazon India
              </Button>
            </div>
          </Card>
        )}

        {/* Detailed Analysis */}
        <Tabs defaultValue="alerts" className="w-full">
          <TabsList className={cn(
            "grid w-full rounded-2xl",
            isOCRResult ? "grid-cols-3" : "grid-cols-4"
          )}>
            <TabsTrigger value="alerts" className="rounded-xl">
              Alerts
              {alerts.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                  {alerts.length}
                </Badge>
              )}
            </TabsTrigger>
            {isOCRResult ? (
              <>
                <TabsTrigger value="ingredients" className="rounded-xl">
                  Ingredients
                  {ocrResult?.ingredients && ocrResult.ingredients.length > 0 && (
                    <Badge variant="default" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                      {ocrResult.ingredients.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="categorized" className="rounded-xl">
                  <Eye className="h-3 w-3 mr-1" />
                  Details
                </TabsTrigger>
              </>
            ) : (
              <>
                <TabsTrigger value="ingredients" className="rounded-xl">Ingredients</TabsTrigger>
                <TabsTrigger value="claims" className="rounded-xl">Claims</TabsTrigger>
                <TabsTrigger value="alternatives" className="rounded-xl">Better</TabsTrigger>
              </>
            )}
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

          {isOCRResult && ocrResult?.categorizedText && (
            <TabsContent value="categorized" className="space-y-3 mt-4">
              {/* Brand Name */}
              {ocrResult.categorizedText.brand_name && (
                <Card className="card-material">
                  <div className="p-5 space-y-2">
                    <h3 className="text-title-medium text-foreground font-semibold">Brand Name</h3>
                    <p className="text-lg font-bold text-primary">{ocrResult.categorizedText.brand_name}</p>
                  </div>
                </Card>
              )}

              {/* Slogans */}
              {ocrResult.categorizedText.slogans.length > 0 && (
                <Card className="card-material">
                  <div className="p-5 space-y-3">
                    <h3 className="text-title-medium text-foreground font-semibold">Marketing Slogans</h3>
                    <div className="space-y-2">
                      {ocrResult.categorizedText.slogans.map((slogan, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-accent/10 rounded-lg">
                          <span className="text-accent text-lg">💬</span>
                          <p className="text-sm text-muted-foreground italic">{slogan}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}

              {/* Marketing Text */}
              {ocrResult.categorizedText.marketing_text.length > 0 && (
                <Card className="card-material">
                  <div className="p-5 space-y-3">
                    <h3 className="text-title-medium text-foreground font-semibold">Marketing Claims</h3>
                    <div className="flex flex-wrap gap-2">
                      {ocrResult.categorizedText.marketing_text.map((text, index) => (
                        <Badge key={index} variant="outline" className="text-xs bg-warning/10 border-warning/20">
                          {text}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              )}

              {/* Nutrition Facts */}
              {Object.keys(ocrResult.categorizedText.nutrition_facts).length > 0 && (
                <Card className="card-material">
                  <div className="p-5 space-y-3">
                    <h3 className="text-title-medium text-foreground font-semibold">Extracted Nutrition Facts</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {Object.entries(ocrResult.categorizedText.nutrition_facts).map(([key, value]) => (
                        <div key={key} className="flex justify-between p-2 bg-muted/30 rounded-lg">
                          <span className="text-muted-foreground capitalize">{key}</span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}

              {/* Miscellaneous */}
              {ocrResult.categorizedText.miscellaneous.length > 0 && (
                <Card className="card-material">
                  <div className="p-5 space-y-3">
                    <h3 className="text-title-medium text-foreground font-semibold">Other Detected Text</h3>
                    <div className="space-y-1">
                      {ocrResult.categorizedText.miscellaneous.map((text, index) => (
                        <div key={index} className="text-xs text-muted-foreground p-2 bg-muted/20 rounded">
                          {text}
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}

              {/* Raw Text */}
              <Card className="card-material">
                <div className="p-5 space-y-3">
                  <h3 className="text-title-medium text-foreground font-semibold">Raw OCR Text</h3>
                  <div className="bg-muted/30 rounded-lg p-4 max-h-60 overflow-y-auto">
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                      {ocrResult?.rawText || ocrResult?.text || "No text extracted"}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    OCR Confidence: {Math.round(ocrResult?.confidence || 0)}%
                  </p>
                </div>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="ingredients" className="space-y-3 mt-4">
            <Card className="card-material">
              <div className="p-6 space-y-4">
                {isOCRResult && ocrResult?.ingredients && ocrResult.ingredients.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-title-large text-foreground font-semibold">Detected Ingredients</h3>
                      <Badge variant="secondary" className="text-xs">
                        {ocrResult.ingredients.length} found
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {ocrResult.ingredients.map((ingredient, index) => (
                        <div 
                          key={index}
                          className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => handleIngredientClick(ingredient)}
                        >
                          <span className="text-xl font-bold text-primary/50">{index + 1}</span>
                          <span className="text-sm font-medium text-foreground">{ingredient}</span>
                        </div>
                      ))}
                    </div>
                    {ocrResult.healthAnalysis.recommendations.length > 0 && (
                      <div className="pt-4 border-t border-border">
                        <h4 className="text-sm font-medium text-foreground mb-3">Health Tips</h4>
                        <div className="space-y-2">
                          {ocrResult.healthAnalysis.recommendations.map((rec, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-healthy mt-0.5 shrink-0" />
                              <p className="text-xs text-muted-foreground">{rec}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : ingredientsList.length > 0 ? (
                  <>
                    <h3 className="text-title-large text-foreground">Ingredients List</h3>
                    <div className="flex flex-wrap gap-2">
                      {ingredientsList.map((ingredient, index) => (
                        <Badge 
                          key={`product-${index}`} 
                          variant="outline" 
                          className="text-xs cursor-pointer hover:bg-primary/10 transition-colors"
                          onClick={() => handleIngredientClick(ingredient)}
                        >
                          {ingredient}
                        </Badge>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No ingredients information available
                    </p>
                  </div>
                )}
                
                {/* Allergens */}
                {productData?.allergens && productData.allergens.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <h4 className="text-sm font-semibold text-red-900 dark:text-red-100">Contains Allergens</h4>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {productData.allergens.map((allergen, index) => (
                        <Badge key={index} variant="destructive" className="text-xs">
                          {allergen}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Traces */}
                {productData?.traces && productData.traces.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-foreground mb-2">May Contain Traces Of</h4>
                    <div className="flex flex-wrap gap-1">
                      {productData.traces.map((trace, index) => (
                        <Badge key={index} variant="outline" className="text-xs bg-orange-50 dark:bg-orange-950/20 border-orange-300 dark:border-orange-900">
                          {trace}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Additives */}
                {productData?.additives && productData.additives.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-foreground mb-2">Additives ({productData.additives.length})</h4>
                    <div className="flex flex-wrap gap-1">
                      {productData.additives.slice(0, 8).map((additive, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {additive}
                        </Badge>
                      ))}
                      {productData.additives.length > 8 && (
                        <Badge variant="outline" className="text-xs font-semibold">
                          +{productData.additives.length - 8} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="claims" className="space-y-3 mt-4">
            <Card className="card-material">
              <div className="p-8 text-center space-y-3">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                </div>
                <h4 className="font-semibold text-foreground">No Claims Data</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Claim verification will be available after scanning products.
                </p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="alternatives" className="space-y-3 mt-4">
            <Card className="card-material">
              <div className="p-8 text-center space-y-3">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-muted-foreground" />
                </div>
                <h4 className="font-semibold text-foreground">No Alternatives Yet</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Healthier alternatives will be suggested based on your scans.
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Ingredient Analysis Modal */}
        <IngredientModal
          isOpen={ingredientModalOpen}
          onClose={handleCloseIngredientModal}
          analysis={ingredientAnalysis}
          isLoading={isAnalyzingIngredient}
        />
      </div>
    </div>
  );
}