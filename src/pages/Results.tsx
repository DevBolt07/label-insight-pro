import { useState } from "react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { HealthScoreCard } from "@/components/ui/health-score-card";
import { NutriScoreDetailed } from "@/components/ui/nutri-score-detailed";
import { CarbonFootprintCard } from "@/components/ui/carbon-footprint-card";
import { IngredientAlertCard, IngredientAlert } from "@/components/ui/ingredient-alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { IngredientModal } from "@/components/ui/ingredient-modal";
import { HealthChatbot } from "@/components/health-chatbot";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Share, Bookmark, ExternalLink, AlertTriangle, CheckCircle, Camera, FileText, Eye, MessageCircle, Sparkles, Package, MapPin, Factory, Info, Leaf, Calendar, Globe } from "lucide-react";
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
    ocrResult?: any; // Changed to any to support gemini_data structure
    aiAnalysis?: any; // Added for barcode flow AI analysis
    scanned?: boolean;
    amazonLink?: string;
    featured?: boolean;
    scanMethod?: 'barcode' | 'ocr';
    rawText?: string;
  };
}

export function Results({ onNavigate, user, data }: ResultsProps) {
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);
  const [ingredientAnalysis, setIngredientAnalysis] = useState<IngredientAnalysis | null>(null);
  const [isAnalyzingIngredient, setIsAnalyzingIngredient] = useState(false);
  const [ingredientModalOpen, setIngredientModalOpen] = useState(false);

  const productData = data?.productData;
  const ocrResult = data?.ocrResult;
  const aiAnalysis = data?.aiAnalysis; // AI analysis from barcode flow
  const isOCRResult = data?.scanMethod === 'ocr' && ocrResult;
  const rawText = data?.rawText;

  // Generate alerts from AI analysis (for barcode scans)
  const generateAlertsFromAI = (analysis: any): IngredientAlert[] => {
    const alerts: IngredientAlert[] = [];
    
    if (analysis?.personalized_alerts) {
      analysis.personalized_alerts.forEach((alert: string, index: number) => {
        let severity: 'low' | 'medium' | 'high' = 'medium';
        
        if (alert.toLowerCase().includes('high') || alert.toLowerCase().includes('avoid')) severity = 'high';
        if (alert.toLowerCase().includes('caution') || alert.toLowerCase().includes('concern')) severity = 'medium';
        if (alert.toLowerCase().includes('note') || alert.toLowerCase().includes('consider')) severity = 'low';
        
        alerts.push({
          id: `ai-alert-${index}`,
          ingredient: alert,
          reason: alert,
          severity,
          userProfile: []
        });
      });
    }
    
    return alerts;
  };

  // Generate alerts from product data or AI analysis
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

  // Generate alerts from OCR results (gemini_data structure)
  const generateAlertsFromOCR = (ocrResult: any): IngredientAlert[] => {
    const alerts: IngredientAlert[] = [];
    
    // Check for personalized_alerts in the new structure
    if (ocrResult?.personalized_alerts) {
      ocrResult.personalized_alerts.forEach((alert: string, index: number) => {
        let severity: 'low' | 'medium' | 'high' = 'medium';
        
        if (alert.toLowerCase().includes('high') || alert.toLowerCase().includes('avoid')) severity = 'high';
        if (alert.toLowerCase().includes('excess') || alert.toLowerCase().includes('concern')) severity = 'medium';
        
        alerts.push({
          id: `ocr-alert-${index}`,
          ingredient: alert,
          reason: alert,
          severity,
          userProfile: []
        });
      });
    }
    
    return alerts;
  };

  const [alerts, setAlerts] = useState<IngredientAlert[]>(() => {
    if (isOCRResult && ocrResult) {
      return generateAlertsFromOCR(ocrResult);
    } else if (aiAnalysis) {
      return generateAlertsFromAI(aiAnalysis);
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
    if (isOCRResult && ocrResult?.health_score) {
      return ocrResult.health_score * 10; // Convert 1-10 to 1-100 scale
    } else if (productData) {
      return calculateHealthScore(productData);
    }
    return 50; // Default score
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
  const ingredientsList = (() => {
    if (isOCRResult && ocrResult?.ingredients) {
      return Array.isArray(ocrResult.ingredients) ? ocrResult.ingredients : [];
    } else if (productData?.ingredients) {
      return productData.ingredients.split(',').map(i => i.trim()).filter(i => i.length > 0);
    }
    return [];
  })();

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
                  Extracted from nutrition label • AI-powered analysis
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

        {/* Nutri-Score Analysis */}
        {!isOCRResult && productData?.nutriscore && (
          <NutriScoreDetailed 
            productData={productData}
            className="animate-slide-up animate-stagger-1"
          />
        )}

        {/* OCR Health Score */}
        {isOCRResult && (
          <HealthScoreCard
            score={healthScore}
            grade={healthGrade}
            title="Health Score"
            description="Based on nutritional analysis from label"
            className="animate-scale-in animate-stagger-1"
          />
        )}

        {/* Carbon Footprint */}
        {!isOCRResult && productData && (
          <CarbonFootprintCard 
            productData={productData}
            className="animate-slide-up animate-stagger-2"
          />
        )}
          
        {(productData?.nutritionFacts || (isOCRResult && ocrResult?.nutritional_info)) && (
            <Card className="card-material p-5 animate-scale-in animate-stagger-2">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-primary" />
                <h3 className="text-title-large text-foreground font-semibold">
                  {isOCRResult ? "Extracted Nutrition Facts" : "Nutrition Facts (per 100g)"}
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {isOCRResult && ocrResult?.nutritional_info ? (
                  // OCR nutrition data (gemini_data structure)
                  <>
                    {ocrResult.nutritional_info.calories && (
                      <div className="flex justify-between p-2 bg-muted/20 rounded">
                        <span className="text-muted-foreground">Calories</span>
                        <span className="font-medium">{ocrResult.nutritional_info.calories}</span>
                      </div>
                    )}
                    {ocrResult.nutritional_info.total_fat && (
                      <div className="flex justify-between p-2 bg-muted/20 rounded">
                        <span className="text-muted-foreground">Total Fat</span>
                        <span className="font-medium">{ocrResult.nutritional_info.total_fat}</span>
                      </div>
                    )}
                    {ocrResult.nutritional_info.saturated_fat && (
                      <div className="flex justify-between p-2 bg-muted/20 rounded">
                        <span className="text-muted-foreground">Saturated Fat</span>
                        <span className="font-medium">{ocrResult.nutritional_info.saturated_fat}</span>
                      </div>
                    )}
                    {ocrResult.nutritional_info.total_carbohydrate && (
                      <div className="flex justify-between p-2 bg-muted/20 rounded">
                        <span className="text-muted-foreground">Carbs</span>
                        <span className="font-medium">{ocrResult.nutritional_info.total_carbohydrate}</span>
                      </div>
                    )}
                    {ocrResult.nutritional_info.sugars && (
                      <div className="flex justify-between p-2 bg-muted/20 rounded">
                        <span className="text-muted-foreground">Sugars</span>
                        <span className="font-medium">{ocrResult.nutritional_info.sugars}</span>
                      </div>
                    )}
                    {ocrResult.nutritional_info.protein && (
                      <div className="flex justify-between p-2 bg-muted/20 rounded">
                        <span className="text-muted-foreground">Protein</span>
                        <span className="font-medium">{ocrResult.nutritional_info.protein}</span>
                      </div>
                    )}
                    {ocrResult.nutritional_info.sodium && (
                      <div className="flex justify-between p-2 bg-muted/20 rounded">
                        <span className="text-muted-foreground">Sodium</span>
                        <span className="font-medium">{ocrResult.nutritional_info.sodium}</span>
                      </div>
                    )}
                    {ocrResult.nutritional_info.dietary_fiber && (
                      <div className="flex justify-between p-2 bg-muted/20 rounded">
                        <span className="text-muted-foreground">Fiber</span>
                        <span className="font-medium">{ocrResult.nutritional_info.dietary_fiber}</span>
                      </div>
                    )}
                  </>
                ) : (
                  // Original product nutrition data
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
                  </>
                )}
              </div>
            </Card>
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
            isOCRResult ? "grid-cols-4" : "grid-cols-4" // Added 'Raw' tab column
          )}>
            <TabsTrigger value="alerts" className="rounded-xl">
              Alerts
              {alerts.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                  {alerts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="ingredients" className="rounded-xl">
              Ingredients
              {ingredientsList.length > 0 && (
                <Badge variant="default" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                  {ingredientsList.length}
                </Badge>
              )}
            </TabsTrigger>
            {isOCRResult ? (
              <>
                <TabsTrigger value="debug" className="rounded-xl">
                  <FileText className="h-3 w-3 mr-1" />
                  Debug
                </TabsTrigger>
                <TabsTrigger value="info" className="rounded-xl">
                  <Info className="h-3 w-3 mr-1" />
                  Info
                </TabsTrigger>
              </>
            ) : (
              <>
                <TabsTrigger value="claims" className="rounded-xl">Claims</TabsTrigger>
                {aiAnalysis && (
                  <TabsTrigger value="ai-insights" className="rounded-xl">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI Insights
                  </TabsTrigger>
                )}
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

          {/* Debug Tab - Enhanced with Gemini Data */}
          {isOCRResult && (
            <TabsContent value="debug" className="space-y-3 mt-4">
              {/* Raw OCR Text Section */}
              <Card className="card-material">
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h3 className="text-title-medium text-foreground font-semibold">Raw OCR Text</h3>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4 max-h-48 overflow-y-auto">
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                      {rawText || "No raw text available"}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    📄 Text extracted directly from image via OCR.space
                  </p>
                </div>
              </Card>

              {/* Gemini Processed Data Section */}
              <Card className="card-material">
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="text-title-medium text-foreground font-semibold">🤖 Gemini Parsed Data</h3>
                  </div>

                  {/* Ingredients Sub-tab */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">Detected Ingredients</h4>
                    <div className="bg-muted/20 rounded-lg p-3 max-h-32 overflow-y-auto">
                      {ocrResult?.ingredients && ocrResult.ingredients.length > 0 ? (
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          {ocrResult.ingredients.map((ing: string, i: number) => (
                            <li key={i}>• {ing}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted-foreground">No ingredients detected</p>
                      )}
                    </div>
                  </div>

                  {/* Nutrition Facts Sub-tab */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">Nutrition Facts</h4>
                    <div className="bg-muted/20 rounded-lg p-3">
                      {ocrResult?.nutritional_info ? (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {Object.entries(ocrResult.nutritional_info).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-muted-foreground capitalize">{key.replace('_', ' ')}:</span>
                              <span className="font-medium">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No nutrition data</p>
                      )}
                    </div>
                  </div>

                  {/* Full JSON */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">Full Gemini Response (JSON)</h4>
                    <div className="bg-muted/30 rounded-lg p-3 max-h-48 overflow-y-auto">
                      <pre className="text-[10px] text-muted-foreground font-mono whitespace-pre-wrap">
                        {JSON.stringify(ocrResult, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          )}

          {/* AI Insights Tab for Barcode Scans */}
          {!isOCRResult && aiAnalysis && (
            <TabsContent value="ai-insights" className="space-y-3 mt-4">
              <Card className="card-material">
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="text-title-medium text-foreground font-semibold">Personalized AI Analysis</h3>
                  </div>

                  {aiAnalysis.detailed_analysis && (
                    <div className="p-4 bg-primary/5 rounded-lg">
                      <p className="text-sm text-foreground leading-relaxed">
                        {aiAnalysis.detailed_analysis}
                      </p>
                    </div>
                  )}

                  {aiAnalysis.overall_recommendation && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground">Recommendation:</span>
                      <Badge 
                        variant={
                          aiAnalysis.overall_recommendation === 'excellent' || aiAnalysis.overall_recommendation === 'good' 
                            ? 'default' 
                            : 'destructive'
                        }
                        className="capitalize"
                      >
                        {aiAnalysis.overall_recommendation}
                      </Badge>
                    </div>
                  )}

                  {aiAnalysis.personalized_suggestions && aiAnalysis.personalized_suggestions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground">💡 Suggestions for You</h4>
                      <div className="space-y-2">
                        {aiAnalysis.personalized_suggestions.map((suggestion: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 p-3 bg-muted/20 rounded-lg">
                            <CheckCircle className="h-4 w-4 text-healthy mt-0.5 shrink-0" />
                            <p className="text-xs text-foreground">{suggestion}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>
          )}

          {/* Info Tab for OCR */}
          {isOCRResult && (
            <TabsContent value="info" className="space-y-3 mt-4">
              <Card className="card-material">
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-primary" />
                    <h3 className="text-title-medium text-foreground font-semibold">Analysis Info</h3>
                  </div>
                  {ocrResult?.health_analysis && (
                    <div className="p-4 bg-muted/20 rounded-lg">
                      <p className="text-sm text-foreground leading-relaxed">
                        {ocrResult.health_analysis}
                      </p>
                    </div>
                  )}
                  {ocrResult?.suggestions && ocrResult.suggestions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground">Suggestions</h4>
                      <div className="space-y-2">
                        {ocrResult.suggestions.map((suggestion: string, i: number) => (
                          <div key={i} className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-healthy mt-0.5 shrink-0" />
                            <p className="text-xs text-muted-foreground">{suggestion}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="ingredients" className="space-y-3 mt-4">
            <Card className="card-material">
              <div className="p-6 space-y-4">
                {ingredientsList.length > 0 ? (
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

      {/* AI Chat Floating Button */}
      <div className="fixed bottom-24 right-4 z-40">
        <Sheet>
          <SheetTrigger asChild>
            <Button className="h-14 w-14 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg hover:shadow-xl hover:scale-105 transition-all p-0">
              <MessageCircle className="h-7 w-7 text-white" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-[20px]">
            <SheetHeader className="mb-4">
              <SheetTitle>AI Health Advisor</SheetTitle>
            </SheetHeader>
            <HealthChatbot 
              userProfile={user} 
              productData={productData || ocrResult} 
              className="h-full pb-10"
            />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}