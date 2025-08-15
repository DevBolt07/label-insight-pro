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

interface ResultsProps {
  onNavigate: (page: string) => void;
  data?: any;
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
  const [alerts, setAlerts] = useState(mockAlerts);
  const [loading, setLoading] = useState(false);

  const handleDismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

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
            {data?.image ? (
              <img src={data.image} alt="Product" className="w-full h-full object-cover" />
            ) : (
              <img 
                src="https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=400&h=300&fit=crop" 
                alt="Energy Drink Sample" 
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
          <div className="p-5">
            <h2 className="text-headline-medium text-foreground font-semibold mb-3">
              {data?.productName || "Energy Drink Sample"}
            </h2>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="rounded-full">Beverage</Badge>
              <Badge variant="outline" className="rounded-full text-warning border-warning/50">High Sugar</Badge>
              <Badge variant="secondary" className="rounded-full">Scanned</Badge>
            </div>
          </div>
        </Card>

        {/* Health Scores */}
        <div className="grid gap-4 animate-slide-up animate-stagger-1">
          <HealthScoreCard
            score={34}
            grade="D"
            title="Nutri-Score"
            description="Overall nutritional quality"
            className="animate-scale-in"
          />
          
          <Card className="card-material p-5 animate-scale-in animate-stagger-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-title-large text-foreground font-semibold">Health Impact Forecast</h3>
              <Badge variant="outline" className="bg-gradient-warning text-warning-foreground rounded-full">
                Moderate Risk
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Regular consumption (daily) may increase risk of:
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center p-2 rounded-lg bg-warning/5">
                <span className="font-medium">Type 2 Diabetes</span>
                <span className="text-warning font-semibold">+15%</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-warning/5">
                <span className="font-medium">Dental Issues</span>
                <span className="text-warning font-semibold">+22%</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-danger/5">
                <span className="font-medium">Weight Gain</span>
                <span className="text-danger font-semibold">+8%</span>
              </div>
            </div>
          </Card>
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
                <div className="flex flex-wrap gap-2">
                  {mockIngredients.map((ingredient, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {ingredient}
                    </Badge>
                  ))}
                </div>
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