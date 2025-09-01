import { useState, useRef } from "react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, Upload, Scan, Image, Zap, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { openFoodFactsService } from "@/services/openFoodFacts";
import { BarcodeScanResult } from "@/hooks/useBarcodeScanner";
import { useToast } from "@/hooks/use-toast";
import { scanHistoryService } from "@/services/scanHistoryService";
import { productService } from "@/services/productService";
import type { User } from '@supabase/supabase-js';

interface ScannerProps {
  onNavigate: (page: string, data?: any) => void;
  user: User;
}

export function Scanner({ onNavigate, user }: ScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState<"camera" | "upload" | "barcode">("camera");
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Simulate processing
      setIsScanning(true);
      setTimeout(() => {
        setIsScanning(false);
        // Navigate to results with mock data
        onNavigate("results", {
          productName: "Sample Product",
          image: URL.createObjectURL(file),
          scanned: true
        });
      }, 2000);
    }
  };

  const handleCameraCapture = () => {
    setIsScanning(true);
    // Simulate camera capture and processing
    setTimeout(() => {
      setIsScanning(false);
      onNavigate("results", {
        productName: "Captured Product",
        image: "/placeholder.svg",
        scanned: true
      });
    }, 3000);
  };

  const handleBarcodeScanne = () => {
    setShowBarcodeScanner(true);
  };

  const handleBarcodeScanResult = async (result: BarcodeScanResult) => {
    setShowBarcodeScanner(false);
    setIsScanning(true);

    try {
      const productData = await openFoodFactsService.getProductByBarcode(result.code);
      
      if (productData) {
        // Save product to database
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

        // Add to scan history
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

  const handleBarcodeScannerClose = () => {
    setShowBarcodeScanner(false);
  };

  const scanOptions = [
    {
      id: "camera",
      icon: Camera,
      title: "Camera Scan",
      description: "Take a photo of nutrition label",
      action: handleCameraCapture,
      gradient: "bg-gradient-primary"
    },
    {
      id: "upload",
      icon: Upload,
      title: "Upload Image",
      description: "Choose image from gallery",
      action: () => fileInputRef.current?.click(),
      gradient: "bg-gradient-healthy"
    },
    {
      id: "barcode",
      icon: Scan,
      title: "Barcode Scanner",
      description: "Scan product barcode",
      action: handleBarcodeScanne,
      gradient: "bg-gradient-warning"
    }
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
        {/* Scan Options */}
        <div className="space-y-4">
          {scanOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Card 
                key={option.id}
                className="card-material cursor-pointer group"
                onClick={option.action}
              >
                <div className="p-6 flex items-center gap-4">
                  <div className={cn(
                    "p-4 rounded-3xl shrink-0 transition-transform group-hover:scale-110",
                    option.gradient
                  )}>
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-title-large text-foreground mb-1">{option.title}</h3>
                    <p className="text-body-large text-muted-foreground">{option.description}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Tips */}
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

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Barcode Scanner Modal */}
        {showBarcodeScanner && (
          <BarcodeScanner
            onScanSuccess={handleBarcodeScanResult}
            onClose={handleBarcodeScannerClose}
          />
        )}
      </div>
    </div>
  );
}