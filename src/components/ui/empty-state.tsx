import { cn } from "@/lib/utils";
import { Button } from "./button";
import { LucideIcon, Camera, History, Heart, Scan, Search, FileText } from "lucide-react";

interface EmptyStateProps {
  type: "history" | "favorites" | "search" | "scan";
  onAction?: () => void;
  className?: string;
}

const emptyStates = {
  history: {
    icon: History,
    title: "No Scan History Yet",
    description: "Start exploring food labels to build your personalized health timeline",
    actionLabel: "Start Scanning",
    actionIcon: Camera,
    illustration: "📊"
  },
  favorites: {
    icon: Heart,
    title: "No Favorites Saved",
    description: "Save products you love for quick access and health tracking",
    actionLabel: "Discover Products",
    actionIcon: Scan,
    illustration: "💚"
  },
  search: {
    icon: Search,
    title: "No Results Found",
    description: "Try adjusting your search terms or scan the product directly",
    actionLabel: "Scan Instead",
    actionIcon: Camera,
    illustration: "🔍"
  },
  scan: {
    icon: FileText,
    title: "Ready to Scan",
    description: "Point your camera at any nutrition label or barcode to get instant health insights",
    actionLabel: "Start Scanning",
    actionIcon: Camera,
    illustration: "📱"
  }
};

export function EmptyState({ type, onAction, className }: EmptyStateProps) {
  const config = emptyStates[type];
  const Icon = config.icon;
  const ActionIcon = config.actionIcon;

  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-6 text-center",
      className
    )}>
      {/* Animated Illustration Container */}
      <div className="relative mb-6">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-2xl scale-150" />
        
        {/* Main icon container */}
        <div className="relative w-24 h-24 bg-gradient-to-br from-muted/80 to-muted/40 rounded-3xl flex items-center justify-center border border-border/50 shadow-lg animate-fade-in">
          <span className="text-4xl animate-pulse">{config.illustration}</span>
        </div>
        
        {/* Floating accent icon */}
        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg animate-scale-in">
          <Icon className="h-5 w-5 text-primary-foreground" />
        </div>
      </div>

      {/* Text content */}
      <div className="space-y-2 mb-6 max-w-xs">
        <h3 className="text-xl font-semibold text-foreground">{config.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {config.description}
        </p>
      </div>

      {/* Action button */}
      {onAction && (
        <Button 
          onClick={onAction}
          className="bg-gradient-primary text-primary-foreground rounded-xl px-6 py-3 font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
        >
          <ActionIcon className="h-4 w-4 mr-2" />
          {config.actionLabel}
        </Button>
      )}

      {/* Decorative dots */}
      <div className="flex gap-1.5 mt-8">
        <div className="w-2 h-2 rounded-full bg-primary/30 animate-pulse" />
        <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" style={{ animationDelay: "0.2s" }} />
        <div className="w-2 h-2 rounded-full bg-primary/30 animate-pulse" style={{ animationDelay: "0.4s" }} />
      </div>
    </div>
  );
}
