import { useState, useEffect } from "react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { ProductCard } from "@/components/ui/product-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, Upload, Scan, Shield, Heart, Baby, Settings, TrendingUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { scanHistoryService } from "@/services/scanHistoryService";
import { useToast } from "@/hooks/use-toast";
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
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadRecentScans();
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

  const quickActions = [
    {
      id: "camera",
      icon: Camera,
      title: "Scan Label",
      description: "Take photo of nutrition label",
      gradient: "bg-gradient-primary",
      onClick: () => onNavigate("scan")
    },
    {
      id: "upload",
      icon: Upload,
      title: "Upload Image",
      description: "Choose from gallery",
      gradient: "bg-gradient-healthy",
      onClick: () => onNavigate("scan")
    },
    {
      id: "barcode",
      icon: Scan,
      title: "Scan Barcode", 
      description: "Quick product lookup",
      gradient: "bg-gradient-warning",
      onClick: () => onNavigate("scan")
    }
  ];

  const healthFeatures = [
    {
      icon: Shield,
      title: "AI Claim Checker",
      description: "Detect contradictions in product claims"
    },
    {
      icon: Heart,
      title: "Health Alerts",
      description: "Personalized warnings based on your profile"
    },
    {
      icon: Baby,
      title: "Child Mode",
      description: "Kid-friendly interface with safety focus"
    }
  ];

  const featuredProducts = [
    {
      id: "1",
      name: "Organic Tulsi Green Tea",
      description: "Premium Indian Tulsi green tea with natural antioxidants and immunity boosters",
      image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop",
      category: "Beverages",
      score: 95,
      grade: "A" as const,
      price: "₹299",
      trending: true,
      amazonLink: "https://www.amazon.in/s?k=organic+tulsi+green+tea"
    },
    {
      id: "2", 
      name: "Whole Grain Dalia Cereal",
      description: "Traditional Indian dalia with high fiber and natural ingredients, no artificial additives",
      image: "https://images.unsplash.com/photo-1549741072-aae3d327526b?w=400&h=300&fit=crop",
      category: "Breakfast",
      score: 88,
      grade: "A" as const,
      price: "₹199",
      amazonLink: "https://www.amazon.in/s?k=organic+dalia+cereal"
    },
    {
      id: "3",
      name: "Coconut Water (Fresh)",
      description: "Pure coconut water from Kerala, rich in electrolytes and potassium, no added sugars",
      image: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=300&fit=crop",
      category: "Beverages", 
      score: 92,
      grade: "A" as const,
      price: "₹45",
      trending: true,
      amazonLink: "https://www.amazon.in/s?k=fresh+coconut+water"
    },
    {
      id: "4",
      name: "Almonds & Dates Mix",
      description: "Premium Kashmiri almonds with Medjool dates, perfect healthy snack with natural sweetness",
      image: "https://images.unsplash.com/photo-1448043552756-e747b7a2b2b8?w=400&h=300&fit=crop",
      category: "Snacks",
      score: 90,
      grade: "A" as const,
      price: "₹599",
      amazonLink: "https://www.amazon.in/s?k=kashmiri+almonds+dates"
    }
  ];

  const handleAnalyzeProduct = (productId: string) => {
    const product = featuredProducts.find(p => p.id === productId);
    if (product) {
      onNavigate("results", {
        productData: {
          name: product.name,
          brand: "Featured Product",
          image_url: product.image,
          grade: product.grade,
          health_score: product.score,
          categories: product.category,
          nutrition_facts: {
            per_100g: {
              energy: product.name.includes('Green Tea') ? '2 kcal' : product.name.includes('Coconut') ? '19 kcal' : product.name.includes('Almond') ? '576 kcal' : '350 kcal',
              protein: product.name.includes('Almond') ? '21g' : '2.1g',
              carbohydrates: product.name.includes('Green Tea') ? '0g' : product.name.includes('Coconut') ? '3.7g' : '60g',
              fat: product.name.includes('Almond') ? '50g' : '0.2g',
              fiber: product.name.includes('Almond') ? '12g' : '2g',
              sugar: product.name.includes('Green Tea') ? '0g' : product.name.includes('Coconut') ? '2.6g' : '5g'
            }
          },
          health_warnings: product.score > 85 ? [] : ['Contains natural sugars'],
          ingredients: product.name.includes('Green Tea') ? 'Organic Green Tea Leaves, Tulsi Leaves' : 
                      product.name.includes('Coconut') ? 'Fresh Coconut Water' :
                      product.name.includes('Almond') ? 'Kashmiri Almonds, Medjool Dates' : 'Whole Grain Wheat, Natural Fibers'
        },
        amazonLink: product.amazonLink,
        featured: true
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

        {/* Featured Products */}
        <div className="space-y-4 animate-slide-up animate-stagger-2">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-title-large text-foreground font-semibold">Featured Products</h3>
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div className="grid gap-4">
            {featuredProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                {...product}
                onAnalyze={handleAnalyzeProduct}
                className={cn("animate-scale-in", `animate-stagger-${index + 1}`)}
              />
            ))}
          </div>
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
      </div>
    </div>
  );
}