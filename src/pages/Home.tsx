import { useState } from "react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { ProductCard } from "@/components/ui/product-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, Upload, Scan, Shield, Heart, Baby, Settings, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface HomeProps {
  onNavigate: (page: string) => void;
}

export function Home({ onNavigate }: HomeProps) {
  const [greeting, setGreeting] = useState(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  });

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
      name: "Organic Green Tea",
      description: "Premium organic green tea with antioxidants",
      image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop",
      category: "Beverages",
      score: 92,
      grade: "A" as const,
      price: "$4.99",
      trending: true
    },
    {
      id: "2", 
      name: "Whole Grain Cereal",
      description: "High fiber breakfast cereal with natural ingredients",
      image: "https://images.unsplash.com/photo-1549741072-aae3d327526b?w=400&h=300&fit=crop",
      category: "Breakfast",
      score: 78,
      grade: "B" as const,
      price: "$3.49"
    },
    {
      id: "3",
      name: "Energy Drink",
      description: "High caffeine energy drink with artificial additives",
      image: "https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=400&h=300&fit=crop",
      category: "Beverages", 
      score: 34,
      grade: "D" as const,
      price: "$2.99"
    }
  ];

  const handleAnalyzeProduct = (productId: string) => {
    // Navigate to scanner or results with product data
    onNavigate("scan");
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

        {/* Recent Activity Placeholder */}
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
        </div>
      </div>
    </div>
  );
}