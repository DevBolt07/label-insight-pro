import { useState, useEffect } from "react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { HealthScoreCard } from "@/components/ui/health-score-card";
import { supabase } from "@/integrations/supabase/client";
import { profileService } from "@/services/profileService";
import { NutriScoreDetailed } from "@/components/ui/nutri-score-detailed";
import { CarbonFootprintCard } from "@/components/ui/carbon-footprint-card";
import { IngredientAlertCard, IngredientAlert } from "@/components/ui/ingredient-alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { IngredientModal } from "@/components/ui/ingredient-modal";
import { HealthChatbot } from "@/components/health-chatbot";
import { OCRConfidenceBanner } from "@/components/ui/ocr-confidence-banner";
import { AnimatedScoreBadge } from "@/components/ui/animated-score-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Share, Bookmark, ExternalLink, AlertTriangle, CheckCircle, XCircle, Camera, FileText, Eye, MessageCircle, Sparkles, Package, MapPin, Factory, Info, Leaf, Calendar, Globe, Droplet, Flame, Zap, HelpCircle, Calculator, ChevronRight } from "lucide-react";
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

export function Results({ onNavigate, user, data }: ResultsProps) {
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);
  const [ingredientAnalysis, setIngredientAnalysis] = useState<IngredientAnalysis | null>(null);
  const [isAnalyzingIngredient, setIsAnalyzingIngredient] = useState(false);
  const [ingredientModalOpen, setIngredientModalOpen] = useState(false);
  const [claims, setClaims] = useState<Array<{ claim: string; status: 'verified' | 'misleading' | 'false'; reason: string }>>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [alternatives, setAlternatives] = useState<Array<{ name: string; brand: string; reason: string; benefits: string[]; healthierBecause: string }>>([]);
  const [alternativesLoading, setAlternativesLoading] = useState(false);
  const [fullUserProfile, setFullUserProfile] = useState<any>(null);

  // Fetch full user profile ONCE and cache it for all uses
  useEffect(() => {
    let isMounted = true;
    const fetchUserProfile = async () => {
      if (!user?.id || fullUserProfile) return; // Skip if already fetched
      try {
        const profile = await profileService.getProfile(user.id);
        if (isMounted && profile) {
          setFullUserProfile({
            ...profile,
            email: user.email,
            user_id: user.id
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    fetchUserProfile();
    return () => { isMounted = false; };
  }, [user?.id]); // Only depend on user.id, not fullUserProfile

  const productData = data?.productData;
  const ocrResult = data?.ocrResult;
  const isOCRResult = data?.scanMethod === 'ocr' && ocrResult;

  // Traffic Light Logic
  const getTrafficLight = (value: number | undefined | null, type: 'fat' | 'saturates' | 'sugar' | 'salt') => {
    if (value === undefined || value === null) return 'gray';

    // UK FSA Guidelines per 100g
    const limits = {
      fat: { low: 3, high: 17.5 },
      saturates: { low: 1.5, high: 5 },
      sugar: { low: 5, high: 22.5 },
      salt: { low: 0.3, high: 1.5 }
    };

    if (value <= limits[type].low) return 'green';
    if (value > limits[type].high) return 'red';
    return 'amber';
  };

  const getTrafficColor = (color: string) => {
    if (color === 'green') return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
    if (color === 'amber') return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
    if (color === 'red') return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
    return "bg-muted text-muted-foreground";
  };

  const getTrafficLabel = (color: string) => {
    if (color === 'green') return "Low";
    if (color === 'amber') return "Med";
    if (color === 'red') return "High";
    return "-";
  };

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

    if (ocrResult.healthAnalysis?.warnings) {
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
    }

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

  // Fetch claims verification when user profile is ready
  useEffect(() => {
    const fetchClaims = async () => {
      if (!productData || isOCRResult || !fullUserProfile) return;

      setClaimsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('verify-claims', {
          body: { productData, userProfile: fullUserProfile }
        });

        if (error) throw error;
        if (data?.claims) {
          setClaims(data.claims);
        }
      } catch (error) {
        console.error('Failed to fetch claims:', error);
      } finally {
        setClaimsLoading(false);
      }
    };

    fetchClaims();
  }, [productData, fullUserProfile, isOCRResult]);

  // Fetch healthier alternatives when user profile is ready
  useEffect(() => {
    const fetchAlternatives = async () => {
      if (!productData || isOCRResult || !fullUserProfile) return;

      setAlternativesLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('suggest-alternatives', {
          body: { productData, userProfile: fullUserProfile }
        });

        if (error) throw error;
        if (data?.alternatives) {
          setAlternatives(data.alternatives);
        }
      } catch (error) {
        console.error('Failed to fetch alternatives:', error);
      } finally {
        setAlternativesLoading(false);
      }
    };

    fetchAlternatives();
  }, [productData, fullUserProfile, isOCRResult]);

  // --- SCORE CALCULATION LOGIC ---
  const calculateHealthScore = (product: ProductData): number => {
    let score = 50; // Base default

    // Normalize grade safe check
    const grade = product.nutriscore?.toLowerCase();

    // If Valid Nutri-Score exists, use it as trusted base
    if (grade && grade !== 'unknown' && ['a', 'b', 'c', 'd', 'e'].includes(grade)) {
      switch (grade) {
        case 'a': score = 90; break;
        case 'b': score = 70; break;
        case 'c': score = 50; break;
        case 'd': score = 30; break;
        case 'e': score = 10; break;
      }
    } else {
      // SMART FALLBACK: Estimate from Traffic Lights if Nutri-Score is unknown
      // Check Fat, Sat Fat, Sugar, Salt
      let estimatedBase = 50;
      const nutrients = [
        { v: product.nutritionFacts?.fat, t: 'fat' as const },
        { v: product.nutritionFacts?.saturatedFat, t: 'saturates' as const },
        { v: product.nutritionFacts?.sugars, t: 'sugar' as const },
        { v: product.nutritionFacts?.salt, t: 'salt' as const }
      ];

      let validDataCount = 0;
      nutrients.forEach(n => {
        if (n.v !== undefined && n.v !== null) {
          validDataCount++;
          const color = getTrafficLight(n.v, n.t);
          if (color === 'green') estimatedBase += 10;
          if (color === 'red') estimatedBase -= 15;
          // Amber is neutral (0 change)
        }
      });

      // Only apply estimation if we actually had data
      if (validDataCount > 0) {
        score = Math.max(20, Math.min(95, estimatedBase));
      }
    }

    // Apply Penalties (NOVA & Warnings)
    if (product.nova_group === 4) score -= 20;
    if (product.nova_group === 1) score += 10;

    score -= (product.healthWarnings?.length || 0) * 5;

    return Math.max(0, Math.min(100, score));
  };

  // Helper to get breakdown details
  const getScoreBreakdown = (product: ProductData) => {
    const breakdown = [];

    // Check lowercase
    const grade = product.nutriscore?.toLowerCase();

    // --- 1. DETERMINE BASE ---
    if (grade && grade !== 'unknown' && ['a', 'b', 'c', 'd', 'e'].includes(grade)) {
      let base = 50;
      if (grade === 'a') base = 90;
      else if (grade === 'b') base = 70;
      else if (grade === 'c') base = 50;
      else if (grade === 'd') base = 30;
      else if (grade === 'e') base = 10;

      breakdown.push({ label: `Base Score (Grade ${grade.toUpperCase()})`, points: base, positive: true, isBase: true });
    } else {
      // ESTIMATION BREAKDOwN
      breakdown.push({ label: "Base Reference", points: 50, positive: true, isBase: true });

      const nutrients = [
        { v: product.nutritionFacts?.fat, t: 'fat' as const, l: 'Fat' },
        { v: product.nutritionFacts?.saturatedFat, t: 'saturates' as const, l: 'Sat Fat' },
        { v: product.nutritionFacts?.sugars, t: 'sugar' as const, l: 'Sugar' },
        { v: product.nutritionFacts?.salt, t: 'salt' as const, l: 'Salt' }
      ];

      nutrients.forEach(n => {
        if (n.v !== undefined && n.v !== null) {
          const color = getTrafficLight(n.v, n.t);
          if (color === 'green') {
            breakdown.push({ label: `Bonus: Low ${n.l}`, points: 10, positive: true });
          }
          if (color === 'red') {
            breakdown.push({ label: `Penalty: High ${n.l}`, points: -15, positive: false });
          }
        }
      });
    }

    // --- 2. APPLY PENALTIES ---
    if (product.nova_group === 4) breakdown.push({ label: "Ultra-Processed (NOVA 4)", points: -20, positive: false });
    if (product.nova_group === 1) breakdown.push({ label: "Minimally Processed", points: +10, positive: true });

    if (product.healthWarnings) {
      product.healthWarnings.forEach(w => {
        breakdown.push({ label: `Warning: ${w}`, points: -5, positive: false });
      });
    }

    return breakdown;
  };

  const healthScore = (() => {
    if (isOCRResult && ocrResult) {
      return ocrResult.healthAnalysis.healthScore;
    } else if (productData) {
      return calculateHealthScore(productData);
    }
    return 34; // Default score
  })();

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

  const ingredientsList = productData?.ingredients ?
    productData.ingredients.split(',').map(i => i.trim()).filter(i => i.length > 0) :
    [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <MobileHeader
          title="Analysis"
          showBack
          onBack={() => onNavigate("home")}
        />
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner variant="analysis" size="lg" />
        </div>
      </div>
    );
  }

  // --- Render Components Helper --- //

  // 1. Hero Section
  const renderHero = () => {
    const scoreText = healthScore > 75 ? "Excellent nutritional quality" : healthScore > 50 ? "Average nutritional quality" : "Poor nutritional quality";
    const scoreColor = healthScore > 75 ? "text-green-600" : healthScore > 50 ? "text-yellow-600" : "text-red-600";

    // Calculation Display Logic
    const breakdown = productData ? getScoreBreakdown(productData) : [];

    // We need to replicate logic for "Sum" display so it matches calculateHealthScore's clamping
    // However, for pure addition, we sum points.
    const rawSum = breakdown.reduce((acc, item) => acc + item.points, 0);

    // But verify clamping logic matches: 
    // If estimation: max(20, min(95, rawSum))
    // If grade: max(0, min(100, rawSum))
    // Since breakdowns are additive, we just show rawSum and then the Final.
    const isClamped = rawSum !== healthScore;

    return (
      <div className="flex gap-4 p-4 items-center bg-card rounded-2xl shadow-sm border border-border">
        <div className="w-24 h-24 shrink-0 bg-muted/20 rounded-xl overflow-hidden flex items-center justify-center border border-border/50">
          {productData?.image ? (
            <img src={productData.image} alt={productData.name} className="w-full h-full object-cover" />
          ) : (
            <Camera className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 space-y-1">
          {isOCRResult ? (
            <h2 className="text-lg font-bold">OCR Analysis</h2>
          ) : (
            <h2 className="text-lg font-bold leading-tight line-clamp-2">{productData?.name || "Scanned Product"}</h2>
          )}
          <p className="text-sm text-muted-foreground">{productData?.brand || "Brand Unknown"}</p>
          <div className="flex gap-2 pt-1">
            {productData?.nutriscore && productData.nutriscore !== 'unknown' && (
              <Badge variant="outline" className={cn(
                "uppercase font-bold",
                getTrafficColor(productData.nutriscore.toLowerCase() === 'a' || productData.nutriscore.toLowerCase() === 'b' ? 'green' : 'amber')
              )}>
                {productData.nutriscore} Grade
              </Badge>
            )}
            {productData?.nova_group === 4 && (
              <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200">Ultra-Processed</Badge>
            )}
          </div>
        </div>

        {/* Score with Drawer Trigger */}
        <Drawer>
          <DrawerTrigger asChild>
            <div className="flex flex-col items-center justify-center pl-2 border-l border-border/50 min-w-[80px] cursor-pointer hover:bg-muted/50 rounded-lg transition-colors p-1 group">
              <AnimatedScoreBadge score={healthScore} size="lg" />
              <div className="flex items-center gap-1 mt-1 group-hover:bg-muted/80 px-2 py-0.5 rounded-full transition-colors">
                <Calculator className="h-3 w-3 text-muted-foreground" />
                <span className={cn("text-[10px] font-bold leading-tight", scoreColor)}>Score</span>
              </div>
            </div>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader className="text-left border-b pb-4">
              <DrawerTitle>Score Breakdown</DrawerTitle>
              <DrawerDescription>Transparent calculation based on nutrient profile and international standards.</DrawerDescription>
            </DrawerHeader>

            <div className="p-4 space-y-0">
              {/* Breakdown Items */}
              <div className="space-y-3 pb-4">
                {breakdown.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className={cn("text-sm", item.isBase ? "font-semibold" : "text-muted-foreground")}>
                      {item.label}
                    </span>
                    <span className={cn(
                      "font-mono font-medium text-sm",
                      item.positive ? "text-green-600" : "text-red-500"
                    )}>
                      {item.positive ? '+' : ''}{item.points}
                    </span>
                  </div>
                ))}
                {breakdown.length === 1 && breakdown[0].isBase && (
                  <p className="text-xs text-muted-foreground italic mt-2">No negative penalties found. Good job!</p>
                )}
              </div>

              {/* Visual Separator */}
              <div className="border-t border-dashed border-border/60 my-2"></div>

              {/* Calculated Total */}
              <div className="flex justify-between items-center py-2 opacity-70">
                <span className="text-sm">Calculated Sum</span>
                <span className="font-mono text-sm">{rawSum}</span>
              </div>

              {/* Final Clamped Score (The Main Event) */}
              <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg mt-2">
                <span className="font-bold text-base">Final Applied Score</span>
                <div className="flex items-center gap-2">
                  {isClamped && (
                    <span className="text-xs text-muted-foreground italic mr-2">
                      (Adjusted to range)
                    </span>
                  )}
                  <Badge className={cn("text-lg px-3 py-1", scoreColor === 'text-green-600' ? "bg-green-100 text-green-700 hover:bg-green-100" : scoreColor === 'text-yellow-600' ? "bg-amber-100 text-amber-700 hover:bg-amber-100" : "bg-red-100 text-red-700 hover:bg-red-100")}>
                    {healthScore}/100
                  </Badge>
                </div>
              </div>
            </div>

            <DrawerFooter className="pt-2">
              <DrawerClose asChild>
                <Button variant="outline">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    );
  };

  // 2. Verdict Card
  const renderVerdict = () => {
    const isHealthy = healthScore > 70;
    const isModerate = healthScore > 40 && healthScore <= 70;

    return (
      <Card className={cn(
        "p-4 border-l-4",
        isHealthy ? "border-l-green-500 bg-green-50/50 dark:bg-green-900/10" :
          isModerate ? "border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10" :
            "border-l-red-500 bg-red-50/50 dark:bg-red-900/10"
      )}>
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-2 rounded-full",
            isHealthy ? "bg-green-100 text-green-600" : isModerate ? "bg-yellow-100 text-yellow-600" : "bg-red-100 text-red-600"
          )}>
            {isHealthy ? <CheckCircle className="h-5 w-5" /> : isModerate ? <Info className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {isHealthy ? "Excellent Choice!" : isModerate ? "Consume Moderately" : "Limit Consumption"}
            </h3>
            <p className="text-sm text-muted-foreground leading-snug mt-1">
              {isHealthy
                ? "This product balances nutrients well."
                : isModerate
                  ? "Contains some processed ingredients or moderate sugar."
                  : "High in sugar, salt, or saturated fats."}
            </p>
          </div>
        </div>
      </Card>
    );
  };

  // 3. Traffic Lights
  const renderTrafficLights = () => {
    if (isOCRResult) return null;

    // Don't default to 0. If it's undefined, it's undefined.
    // This ensures we don't say "Low" for missing data.
    const fats = productData?.nutritionFacts?.fat;
    const satFats = productData?.nutritionFacts?.saturatedFat;
    const sugars = productData?.nutritionFacts?.sugars;
    const salt = productData?.nutritionFacts?.salt;

    const items = [
      { label: "Fat", value: fats, unit: "g", type: 'fat' as const },
      { label: "Sat Fat", value: satFats, unit: "g", type: 'saturates' as const },
      { label: "Sugars", value: sugars, unit: "g", type: 'sugar' as const },
      { label: "Salt", value: salt, unit: "g", type: 'salt' as const },
    ];

    return (
      <div className="grid grid-cols-4 gap-2">
        {items.map((item, idx) => {
          const color = getTrafficLight(item.value, item.type);
          const label = getTrafficLabel(color);
          return (
            <div key={idx} className={cn(
              "flex flex-col items-center justify-center p-2 rounded-xl border text-center aspect-square",
              getTrafficColor(color)
            )}>
              <span className="text-[10px] uppercase font-bold opacity-70 mb-1">{item.label}</span>
              <span className="text-xl font-black leading-none">{label}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader
        title="Analysis"
        showBack
        onBack={() => onNavigate("home")}
        rightAction={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-full">
              <Share className="h-5 w-5" />
            </Button>
          </div>
        }
      />

      <div className="px-4 py-4 max-w-md mx-auto space-y-4">

        {/* Main Tabs Structure */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 rounded-xl h-12 p-1 bg-muted/50">
            <TabsTrigger value="overview" className="rounded-lg text-xs font-medium">Overview</TabsTrigger>
            <TabsTrigger value="nutrition" className="rounded-lg text-xs font-medium">Nutrition</TabsTrigger>
            <TabsTrigger value="ingredients" className="rounded-lg text-xs font-medium">Contents</TabsTrigger>
            <TabsTrigger value="eco" className="rounded-lg text-xs font-medium">Eco</TabsTrigger>
          </TabsList>

          {/* -- TAB 1: OVERVIEW -- */}
          <TabsContent value="overview" className="space-y-4 pt-2 animate-fade-in">
            {renderHero()}
            {renderVerdict()}

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-sm font-semibold text-muted-foreground">Nutrient Levels</h3>
                <span className="text-[10px] text-muted-foreground">per 100g</span>
              </div>
              {renderTrafficLights()}
              <p className="text-xs text-muted-foreground px-1 italic">
                Tip: Be mindful of portion sizes. High salt intake over time increases blood pressure risk.
              </p>
            </div>

            {/* Critical Alerts Only - Filter for high severity */}
            {alerts.filter(a => a.severity === 'high').length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground px-1">Critical Alerts</h3>
                {alerts.filter(a => a.severity === 'high').map(alert => (
                  <IngredientAlertCard key={alert.id} alert={alert} onDismiss={handleDismissAlert} />
                ))}
              </div>
            )}

            {/* Purchase CTA */}
            {data?.amazonLink && (
              <Button
                onClick={() => window.open(data.amazonLink, '_blank')}
                className="w-full bg-gradient-warning text-warning-foreground rounded-xl h-12 font-medium"
              >
                🛒 Buy on Amazon
              </Button>
            )}

            {/* Better Choices Teaser */}
            {alternatives.length > 0 && (
              <Card className="p-4 bg-primary/5 border-primary/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-foreground">Healthier Alternative Found</h4>
                    <p className="text-xs text-muted-foreground">We found a better option for you.</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => (document.querySelector('[value="ingredients"]') as HTMLElement)?.click()}>
                    View
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* -- TAB 2: NUTRITION -- */}
          <TabsContent value="nutrition" className="space-y-4 pt-2 animate-fade-in">
            <Card className="card-material p-5">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Nutrition Facts</h3>
              </div>

              {/* Full Table Grid */}
              <div className="space-y-0 text-sm border rounded-xl overflow-hidden divide-y">
                {[
                  { l: 'Energy', v: productData?.nutritionFacts?.energyKcal, u: 'kcal', i: <Flame className="h-4 w-4 text-orange-500" /> },
                  { l: 'Fat', v: productData?.nutritionFacts?.fat, u: 'g', i: <Droplet className="h-4 w-4 text-yellow-500" /> },
                  { l: 'Saturated Fat', v: productData?.nutritionFacts?.saturatedFat, u: 'g' },
                  { l: 'Carbohydrates', v: productData?.nutritionFacts?.carbs, u: 'g', i: <Zap className="h-4 w-4 text-blue-500" /> },
                  { l: 'Sugars', v: productData?.nutritionFacts?.sugars, u: 'g' },
                  { l: 'Fiber', v: productData?.nutritionFacts?.fiber, u: 'g' },
                  { l: 'Protein', v: productData?.nutritionFacts?.protein, u: 'g' },
                  { l: 'Salt', v: productData?.nutritionFacts?.salt, u: 'g' },
                ].map((item, i) => (
                  item.v !== undefined && (
                    <div key={i} className="flex justify-between p-3 bg-card hover:bg-muted/50 transition-colors">
                      <span className="text-muted-foreground flex items-center gap-2">
                        {item.i && item.i} {item.l}
                      </span>
                      <span className="font-medium text-foreground">{Math.round(item.v * 10) / 10}{item.u}</span>
                    </div>
                  )
                ))}
              </div>
            </Card>
            <div className="text-center text-xs text-muted-foreground mt-4">Values are per 100g/ml unless otherwise stated.</div>
          </TabsContent>

          {/* -- TAB 3: INGREDIENTS -- */}
          <TabsContent value="ingredients" className="space-y-4 pt-2 animate-fade-in">
            {/* Ingredients List */}
            <Card className="card-material p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" /> Ingredients
              </h3>
              {ingredientsList.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {ingredientsList.map((ing, i) => (
                    <Badge key={i} variant="secondary" className="font-normal text-sm py-1 px-2.5">
                      {ing}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No ingredients data available.</p>
              )}
            </Card>

            {/* Allergens Section - Dedicated Card */}
            <Card className="card-material p-5 border-l-4 border-l-red-500 bg-red-50/10">
              <div className="flex items-center gap-2 mb-3 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="font-semibold">Allergens</h3>
              </div>
              <div className="text-sm leading-relaxed">
                {productData?.allergens && productData.allergens.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {productData.allergens.map((alg, i) => (
                      <Badge key={i} variant="destructive" className="uppercase font-bold tracking-wide">
                        {alg}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">No allergens detected.</span>
                )}
              </div>
            </Card>

            {/* Additives Section */}
            <Card className="card-material p-5">
              <div className="flex items-center gap-2 mb-3 text-primary">
                <Factory className="h-5 w-5" />
                <h3 className="font-semibold">Additives</h3>
              </div>
              <div className="text-sm">
                {productData?.additives && productData.additives.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {productData.additives.map((add, i) => (
                      <Badge key={i} variant="outline">
                        {add}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">No additives found.</span>
                )}
              </div>
            </Card>

            {/* Alternatives Section */}
            {alternatives.length > 0 && (
              <div className="space-y-3 pt-4">
                <h3 className="font-semibold px-1">Healthier Alternatives</h3>
                {alternatives.map((alt, i) => (
                  <Card key={i} className="p-4 border-healthy/30 bg-healthy/5">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">{alt.name}</h4>
                      <Badge className="bg-healthy text-white">Better Score</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{alt.reason}</p>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* -- TAB 4: ECO -- */}
          <TabsContent value="eco" className="space-y-4 pt-2 animate-fade-in">
            <CarbonFootprintCard productData={productData} />

            {productData?.packaging && (
              <Card className="card-material p-5">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4" /> Packaging
                </h3>
                <p className="text-sm text-muted-foreground">{productData.packaging}</p>
              </Card>
            )}
          </TabsContent>

        </Tabs>

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
              <SheetDescription>Ask questions about this product's nutritional value and health impact.</SheetDescription>
            </SheetHeader>
            <HealthChatbot
              userProfile={fullUserProfile}
              productData={productData || ocrResult}
              className="h-full pb-10"
            />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}