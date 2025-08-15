import { useState } from "react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, Upload, Scan, Shield, Heart, Baby, Settings } from "lucide-react";
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

      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Welcome Section */}
        <div className="text-center space-y-2">
          <h2 className="text-headline-medium text-foreground">
            {greeting}! 👋
          </h2>
          <p className="text-body-large text-muted-foreground">
            Scan any food label to get instant health insights and safety alerts
          </p>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h3 className="text-title-large text-foreground px-2">Quick Scan</h3>
          <div className="grid gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Card 
                  key={action.id}
                  className="card-material cursor-pointer group"
                  onClick={action.onClick}
                >
                  <div className="p-4 flex items-center gap-4">
                    <div className={cn(
                      "p-3 rounded-2xl shrink-0 transition-transform group-hover:scale-110",
                      action.gradient
                    )}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{action.title}</h4>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Features Overview */}
        <div className="space-y-3">
          <h3 className="text-title-large text-foreground px-2">Key Features</h3>
          <div className="grid gap-3">
            {healthFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="card-material">
                  <div className="p-4 flex items-center gap-4">
                    <div className="p-2 rounded-xl bg-primary/10 shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground text-sm">{feature.title}</h4>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent Activity Placeholder */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-title-large text-foreground">Recent Scans</h3>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onNavigate("history")}
              className="text-primary hover:text-primary/80"
            >
              View All
            </Button>
          </div>
          <Card className="card-material">
            <div className="p-6 text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <Camera className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No recent scans yet. Start by scanning your first food label!
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}