import { useState } from "react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Card } from "@/components/ui/card";
import { Scan, Image, Zap, Loader2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { OCRScanner } from "@/components/ocr-scanner";
import { openFoodFactsService } from "@/services/openFoodFacts";
import { BarcodeScanResult } from "@/hooks/useBarcodeScanner";
import { useToast } from "@/hooks/use-toast";
import { scanHistoryService } from "@/services/scanHistoryService";
import { productService } from "@/services/productService";
import { OCRResult } from "@/services/ocrService";
import type { User } from "@supabase/supabase-js";
import { analyzeProductWithBackend, UserProfile } from "@/services/backendApi";
import { useBackendHealth } from "@/hooks/useBackendHealth";
import { useTranslation } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";

interface ScannerProps {
  onNavigate: (page: string, data?: any) => void;
  user: User;
}

export function Scanner({ onNavigate, user }: ScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showOCRScanner, setShowOCRScanner] = useState(false);
  const { toast } = useToast();
  useBackendHealth();

  const handleBarcodeScan = () => {
    setShowBarcodeScanner(true);
  };

  const handleBarcodeScanResult = async (result: BarcodeScanResult) => {
    setShowBarcodeScanner(false);
    setIsScanning(true);

    try {
      try {
        const userProfile: UserProfile = {
          age: 30, // TODO: Fetch real profile
          hasDiabetes: false,
          hasHighBP: false,
          isChild: false,
          hasHeartDisease: false,
          isPregnant: false,
          allergies: [],
        };

        const backendResult = await analyzeProductWithBackend(result.code, userProfile);
        
        const savedProduct = await productService.createOrUpdateProduct({
          barcode: result.code,
          name: backendResult.product_name,
          brand: "",
          image_url: "",
          categories: "",
          ingredients: JSON.stringify(backendResult.ingredients),
          grade: "",
          health_score: backendResult.health_risk_score,
          nutriscore: "",
          nova_group: 0,
          allergens: [],
          additives: [],
          health_warnings: backendResult.alerts,
          nutrition_facts: backendResult.nutritional_info || {},
        });

        await scanHistoryService.addScanToHistory({
          user_id: user.id,
          product_id: savedProduct.id,
          scan_method: 'barcode',
        });

        setIsScanning(false);
        
        onNavigate("results", {
          productData: {
            ...savedProduct,
            healthWarnings: backendResult.alerts,
            suggestions: backendResult.suggestions,
          },
          scanned: true,
          fromBackend: true,
        });
        
        return;
        
      } catch (backendError) {
        console.log('Backend analysis failed, falling back to OpenFoodFacts:', backendError);
      }

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
          nutrition_facts: productData.nutritionFacts,
        });

        await scanHistoryService.addScanToHistory({
          user_id: user.id,
          product_id: savedProduct.id,
          scan_method: 'barcode',
        });

        setIsScanning(false);
        
        onNavigate("results", {
          productData,
          scanned: true,
          fromBackend: false,
        });
      } else {
        setIsScanning(false);
        toast({
          title: "Product Not Found",
          description: `No product found for barcode: ${result.code}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      setIsScanning(false);
      toast({
        title: "Scan Error",
        description: "Failed to fetch product information. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBarcodeScannerClose = () => {
    setShowBarcodeScanner(false);
  };

  const handleOCRScan = () => {
    setShowOCRScanner(true);
  };

  const handleOCRImageSelect = async (file: File) => {
    setShowOCRScanner(false);
    setIsScanning(true);

    try {
      const { data: ocrResult, error } = await supabase.functions.invoke('analyze-nutrition-label', {
          body: file,
      });

      if (error) throw error;
      
      const normalizedProduct = {
        name: ocrResult.product_name || "Scanned Product",
        brand: "Detected via OCR",
        image_url: URL.createObjectURL(file),
        ingredients: JSON.stringify(ocrResult.ingredients || []),
        grade: "", 
        health_score: ocrResult.health_score,
        nutrition_facts: ocrResult.nutritional_info,
        health_warnings: ocrResult.alerts || [],
        allergens: ocrResult.allergens || [],
        additives: [],
        categories: "",
        nova_group: 0,
        ai_analysis: ocrResult.health_analysis,
        suggestions: ocrResult.suggestions
      };

      setIsScanning(false);
      
      onNavigate("results", {
        productData: normalizedProduct,
        scanned: true,
        scanMethod: 'ocr',
        fromBackend: true,
        // *** PASS RAW TEXT HERE ***
        rawText: ocrResult.raw_text 
      });

    } catch (error) {
      setIsScanning(false);
      console.error("Error during OCR analysis:", error);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze the image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleOCRScannerClose = () => {
    setShowOCRScanner(false);
  };

  const { t } = useTranslation();

  const scanOptions = [
    {
      id: "ocr",
      icon: FileText,
      title: t("nutrition_ocr"),
      description: t("nutrition_ocr_desc"),
      action: handleOCRScan,
      gradient: "bg-gradient-primary",
    },
    {
      id: "barcode",
      icon: Scan,
      title: t("scan_barcode"),
      description: t("scan_barcode_desc"),
      action: handleBarcodeScan,
      gradient: "bg-gradient-warning",
    },
  ];

  if (isScanning) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <MobileHeader 
          title="Scanning..."
          showBack
          onBack={() => {
            setIsScanning(false);
            onNavigate("home");
          }}
        />
        
        <div className="px-4 py-12 max-w-md mx-auto">
          <Card className="card-material">
            <div className="p-8 text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center animate-pulse">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-headline-medium text-foreground">Analyzing Product</h3>
                <p className="text-body-large text-muted-foreground">
                  Our AI is processing the nutrition label and checking for health alerts...
                </p>
              </div>
              
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>Extracting ingredients</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>Checking health claims</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>Calculating health score</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader 
        title="Scan Product"
        subtitle="Choose scanning method"
        showBack
        onBack={() => onNavigate("home")}
      />

      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        <div className="space-y-4">
          {scanOptions.map((option, index) => {
            const Icon = option.icon;
            return (
              <Card
                key={option.id}
                className={cn(
                  "card-material cursor-pointer group",
                  `animate-stagger-${index + 1}`
                )}
                onClick={option.action}
              >
                <div className="p-5 flex items-center gap-4">
                  <div className={cn(
                    "p-4 rounded-2xl shrink-0 transition-all duration-300 group-hover:scale-110 group-active:scale-95",
                    option.gradient
                  )}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{option.title}</h4>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="card-material">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Image className="h-5 w-5 text-primary" />
              <h3 className="text-title-large text-foreground">Scanning Tips</h3>
            </div>
            
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                <span>Ensure good lighting and clear focus</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                <span>Capture the entire ingredients list</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                <span>Avoid shadows and reflections</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                <span>For barcodes, center it in the frame</span>
              </div>
            </div>
          </div>
        </Card>

        {showBarcodeScanner && (
          <BarcodeScanner
            onScanSuccess={handleBarcodeScanResult}
            onClose={handleBarcodeScannerClose}
          />
        )}

        {showOCRScanner && (
          <OCRScanner
            onImageSelect={handleOCRImageSelect}
            onClose={handleOCRScannerClose}
            isProcessing={isScanning}
          />
        )}
      </div>
    </div>
  );
}