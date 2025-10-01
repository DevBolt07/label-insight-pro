import { useState, useEffect } from "react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { ProductCard } from "@/components/ui/product-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Scan, Shield, Heart, Sparkles, Settings, TrendingUp, Loader2, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { scanHistoryService } from "@/services/scanHistoryService";
import { recommendationService, SmartRecommendation } from "@/services/recommendationService";
import { useToast } from "@/hooks/use-toast";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { OCRScanner } from "@/components/ocr-scanner";
import { openFoodFactsService } from "@/services/openFoodFacts";
import { BarcodeScanResult } from "@/hooks/useBarcodeScanner";
import { productService } from "@/services/productService";
import { ocrService, OCRResult } from "@/services/ocrService";
import type { User } from '@supabase/supabase-js';

interface HomeProps {
  onNavigate: (page: string, data?: any) => void;
  user: User;
}

export function Home({ onNavigate, user }: HomeProps) {
  const [greeting, setGreeting] = useState(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  });
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showOCRScanner, setShowOCRScanner] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadRecentScans();
    loadRecommendations();
  }, [user.id]);

  const loadRecentScans = async () => {
    try {
      setIsLoading(true);
      const scans = await scanHistoryService.getRecentScans(user.id, 3);
      setRecentScans(scans);
    } catch (error) {
      console.error('Error loading recent scans:', error);
      toast({
        title: "Error",
        description: "Failed to load recent scans.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecommendations = async () => {
    try {
      setIsLoadingRecs(true);
      const recs = await recommendationService.getPersonalizedRecommendations(user.id);
      setRecommendations(recs);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setIsLoadingRecs(false);
    }
  };

  const handleOCRScan = () => {
    setShowOCRScanner(true);
  };

  const handleBarcodeScan = () => {
    setShowBarcodeScanner(true);
  };

  const handleBarcodeScanResult = async (result: BarcodeScanResult) => {
    setShowBarcodeScanner(false);
    setIsScanning(true);

    try {
      const productData = await openFoodFactsService.getProductByBarcode(result.code);
      
      if (productData) {
        const savedProduct = await productService.createOrUpdateProduct({
          barcode: result.code,
          name: productData.name,
          brand: productData.brand,
          image_url: productData.image,
          categories: productData.categories,
          ingredients: productData.ingredients,
          grade: productData.grade,
          health_score: productData.healthScore,
          nutriscore: productData.nutriscore,
          nova_group: productData.nova_group,
          allergens: productData.allergens,
          additives: productData.additives,
          health_warnings: productData.healthWarnings,
          nutrition_facts: productData.nutritionFacts
        });

        await scanHistoryService.addScanToHistory({
          user_id: user.id,
          product_id: savedProduct.id,
          scan_method: 'barcode'
        });

        setIsScanning(false);
        onNavigate("results", {
          productData,
          scanned: true
        });
      } else {
        setIsScanning(false);
        toast({
          title: "Product Not Found",
          description: `No product found for barcode: ${result.code}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      setIsScanning(false);
      toast({
        title: "Scan Error",
        description: "Failed to fetch product information. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleOCRImageSelect = async (file: File) => {
    setShowOCRScanner(false);
    setIsScanning(true);

    try {
      const ocrResult: OCRResult = await ocrService.processImage(file);
      setIsScanning(false);
      onNavigate("results", {
        ocrResult,
        scanned: true,
        scanMethod: 'ocr'
      });
    } catch (error) {
      setIsScanning(false);
      toast({
        title: "OCR Error",
        description: "Failed to process nutrition label. Please try again.",
        variant: "destructive"
      });
    }
  };

  const quickActions = [
    {
      id: "ocr",
      icon: FileText,
      title: "Nutrition Label OCR",
      description: "Extract text from nutrition labels",
      gradient: "bg-gradient-primary",
      onClick: handleOCRScan
    },
    {
      id: "barcode",
      icon: Scan,
      title: "Scan Barcode", 
      description: "Quick product lookup",
      gradient: "bg-gradient-warning",
      onClick: handleBarcodeScan
    }
  ];

  const healthFeatures = [
    {
      icon: Shield,
      title: "AI Analysis",
      description: "Advanced ingredient analysis powered by AI"
    },
    {
      icon: Heart,
      title: "Personalized Alerts",
      description: "Health warnings based on your unique profile"
    },
    {
      icon: Sparkles,
      title: "Smart Recommendations",
      description: "Get healthier alternatives tailored for you"
    }
  ];

  const handleAnalyzeRecommendation = (recommendationId: string) => {
    const recommendation = recommendations.find(r => r.id === recommendationId);
    if (recommendation) {
      onNavigate("results", {
        productData: {
          name: recommendation.name,
          brand: "Recommended Product",
          image_url: recommendation.image,
          grade: recommendation.grade,
          health_score: recommendation.score,
          categories: recommendation.category,
          nutrition_facts: {},
          health_warnings: [],
          ingredients: recommendation.description
        },
        amazonLink: recommendation.amazonLink,
        featured: true,
        recommendation: recommendation
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader 
        title="NutriLabel Analyzer"
        subtitle="Smart food safety scanner"
        rightAction={
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-10 w-10 p-0 rounded-full"
            onClick={() => onNavigate("profile")}
          >
            <Settings className="h-5 w-5" />
          </Button>
        }
      />

      <div className="px-4 py-6 max-w-md mx-auto space-y-8">
        {/* Welcome Section */}
        <div className="text-center space-y-3 animate-fade-in">
          <h2 className="text-headline-medium text-foreground font-semibold">
            {greeting}! 👋
          </h2>
          <p className="text-body-large text-muted-foreground leading-relaxed">
            Scan any food label to get instant health insights and safety alerts
          </p>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4 animate-slide-up animate-stagger-1">
          <h3 className="text-title-large text-foreground font-semibold px-2">Quick Scan</h3>
          <div className="grid gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Card 
                  key={action.id}
                  className={cn(
                    "card-material cursor-pointer group animate-scale-in",
                    `animate-stagger-${index + 1}`
                  )}
                  onClick={action.onClick}
                >
                  <div className="p-5 flex items-center gap-4">
                    <div className={cn(
                      "p-4 rounded-2xl shrink-0 transition-all duration-300 group-hover:scale-110 group-active:scale-95",
                      action.gradient
                    )}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{action.title}</h4>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Smart Recommendations */}
        <div className="space-y-4 animate-slide-up animate-stagger-2">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary animate-pulse-glow" />
              <h3 className="text-title-large text-foreground font-semibold">For You</h3>
            </div>
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          
          {isLoadingRecs ? (
            <Card className="card-material">
              <div className="p-8 text-center space-y-3">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Finding personalized recommendations...
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4">
              {recommendations.map((recommendation, index) => (
                <ProductCard
                  key={recommendation.id}
                  id={recommendation.id}
                  name={recommendation.name}
                  description={`${recommendation.description} • ${recommendation.reason}`}
                  image={recommendation.image}
                  category={recommendation.category}
                  score={recommendation.score}
                  grade={recommendation.grade}
                  price={recommendation.price}
                  trending={recommendation.trending}
                  amazonLink={recommendation.amazonLink}
                  onAnalyze={handleAnalyzeRecommendation}
                  className={cn("animate-scale-in hover-lift", `animate-stagger-${index + 1}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Features Overview */}
        <div className="space-y-4 animate-slide-up animate-stagger-3">
          <h3 className="text-title-large text-foreground font-semibold px-2">Key Features</h3>
          <div className="grid gap-3">
            {healthFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className={cn("card-material animate-scale-in", `animate-stagger-${index + 1}`)}>
                  <div className="p-4 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 shrink-0 transition-transform hover:scale-110">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground text-sm">{feature.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4 animate-slide-up animate-stagger-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-title-large text-foreground font-semibold">Recent Scans</h3>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onNavigate("history")}
              className="text-primary hover:text-primary/80 transition-colors"
            >
              View All
            </Button>
          </div>
          
          {isLoading ? (
            <Card className="card-material">
              <div className="p-8 text-center space-y-3">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
                <h4 className="font-semibold text-foreground">Loading Recent Scans</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Fetching your scan history...
                </p>
              </div>
            </Card>
          ) : recentScans.length > 0 ? (
            <div className="space-y-3">
              {recentScans.map((scan: any, index: number) => (
                <Card key={scan.id} className="card-material cursor-pointer group" onClick={() => onNavigate("history")}>
                  <div className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-muted/30 flex items-center justify-center shrink-0 overflow-hidden">
                      {scan.products?.image_url ? (
                        <img src={scan.products.image_url} alt={scan.products.name} className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground text-sm truncate">
                        {scan.products?.name || "Unknown Product"}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {new Date(scan.scanned_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-foreground">{scan.products?.health_score || 0}</div>
                      <div className="text-xs text-muted-foreground">Score</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="card-material">
              <div className="p-8 text-center space-y-3">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center">
                  <Camera className="h-8 w-8 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground">No scans yet</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Start by scanning your first food label to get personalized health insights!
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* Barcode Scanner Modal */}
        {showBarcodeScanner && (
          <BarcodeScanner
            onScanSuccess={handleBarcodeScanResult}
            onClose={() => setShowBarcodeScanner(false)}
          />
        )}

        {/* OCR Scanner Modal */}
        {showOCRScanner && (
          <OCRScanner
            onImageSelect={handleOCRImageSelect}
            onClose={() => setShowOCRScanner(false)}
            isProcessing={isScanning}
          />
        )}
      </div>
    </div>
  );
}