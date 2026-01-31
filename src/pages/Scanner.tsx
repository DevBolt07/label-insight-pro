import { useState, useEffect, useRef } from "react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Scan, Image, Zap, Loader2, FileText, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { OCRScanner } from "@/components/ocr-scanner";
import { openFoodFactsService } from "@/services/openFoodFacts";
import { BarcodeScanResult } from "@/hooks/useBarcodeScanner";
import { useToast } from "@/hooks/use-toast";
import { scanHistoryService } from "@/services/scanHistoryService";
import { productService } from "@/services/productService";
import { ocrService, OCRResult } from "@/services/ocrService";
import type { User } from "@supabase/supabase-js";
import { analyzeProductWithBackend, UserProfile } from "@/services/backendApi";
import { useBackendHealth } from "@/hooks/useBackendHealth";
import { useTranslation } from "@/i18n";
import { useDebounce } from "@/hooks/useDebounce";

interface ScannerProps {
  onNavigate: (page: string, data?: any) => void;
  user: User;
}

interface SearchResult {
  code: string;
  product_name: string;
  brands?: string;
  image_url?: string;
}

export function Scanner({ onNavigate, user }: ScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showOCRScanner, setShowOCRScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  useBackendHealth();

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Fetch autocomplete suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedSearchQuery.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      setIsFetchingSuggestions(true);
      try {
        const results = await productService.searchProduct(debouncedSearchQuery);
        setSuggestions(results?.slice(0, 5) || []);
      } catch (error) {
        console.error("Autocomplete error:", error);
        setSuggestions([]);
      } finally {
        setIsFetchingSuggestions(false);
      }
    };

    fetchSuggestions();
  }, [debouncedSearchQuery]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const handleBarcodeScan = () => {
    setShowBarcodeScanner(true);
  };

  const handleSearchByName = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await productService.searchProduct(searchQuery);
      setSearchResults(results || []);
      
      if (!results || results.length === 0) {
        toast({
          title: "No Results",
          description: `No products found for "${searchQuery}"`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search Error",
        description: "Failed to search products. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = async (result: SearchResult) => {
    setIsScanning(true);
    setSearchResults([]);
    setSearchQuery("");
    
    try {
      const userProfile: UserProfile = {
        age: 30,
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
        name: backendResult.product_name || result.product_name,
        brand: result.brands || "",
        image_url: result.image_url || "",
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
        scan_method: 'search',
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
      
    } catch (backendError) {
      console.log('Backend analysis failed, falling back to OpenFoodFacts:', backendError);
      
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
            nutrition_facts: productData.nutritionFacts,
          });

          await scanHistoryService.addScanToHistory({
            user_id: user.id,
            product_id: savedProduct.id,
            scan_method: 'search',
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
            description: "Could not fetch product details.",
            variant: "destructive",
          });
        }
      } catch (error) {
        setIsScanning(false);
        toast({
          title: "Error",
          description: "Failed to fetch product information.",
          variant: "destructive",
        });
      }
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
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
        title="Label Insight Pro"
        subtitle="Scan or search products"
        showBack
        onBack={() => onNavigate("home")}
      />

      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Search by Name */}
        <Card className="card-material">
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              <h3 className="text-title-large text-foreground">Search by Name</h3>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  ref={searchInputRef}
                  placeholder="e.g., Maggi, Coca-Cola, Oreo..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setShowSuggestions(false);
                      handleSearchByName();
                    }
                  }}
                  className="pr-8"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                
                {/* Autocomplete Suggestions */}
                {showSuggestions && searchQuery.length >= 2 && (suggestions.length > 0 || isFetchingSuggestions) && (
                  <div
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-1 bg-background border border-border rounded-xl shadow-lg overflow-hidden"
                  >
                    {isFetchingSuggestions && suggestions.length === 0 ? (
                      <div className="p-3 flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Searching...</span>
                      </div>
                    ) : (
                      suggestions.map((suggestion, index) => (
                        <div
                          key={suggestion.code || index}
                          className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer transition-colors border-b border-border last:border-b-0"
                          onClick={() => {
                            setShowSuggestions(false);
                            handleSelectSearchResult(suggestion);
                          }}
                        >
                          {suggestion.image_url ? (
                            <img
                              src={suggestion.image_url}
                              alt={suggestion.product_name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                              <Search className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate text-sm">{suggestion.product_name}</p>
                            {suggestion.brands && (
                              <p className="text-xs text-muted-foreground truncate">{suggestion.brands}</p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              <Button onClick={() => { setShowSuggestions(false); handleSearchByName(); }} disabled={isSearching || !searchQuery.trim()}>
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </Card>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <Card className="card-material">
            <div className="p-4 space-y-3">
              <h3 className="text-title-medium text-foreground">
                Results ({searchResults.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <div
                    key={result.code || index}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => handleSelectSearchResult(result)}
                  >
                    {result.image_url ? (
                      <img
                        src={result.image_url}
                        alt={result.product_name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        <Search className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{result.product_name}</p>
                      {result.brands && (
                        <p className="text-sm text-muted-foreground truncate">{result.brands}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Scan Options */}
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