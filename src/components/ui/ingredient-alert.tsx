import { cn } from "@/lib/utils";
import { AlertTriangle, Shield, X } from "lucide-react";
import { Badge } from "./badge";

export interface IngredientAlert {
  id: string;
  ingredient: string;
  alias?: string;
  reason: string;
  severity: "low" | "medium" | "high";
  userProfile?: string[];
}

interface IngredientAlertCardProps {
  alert: IngredientAlert;
  onDismiss?: (id: string) => void;
  className?: string;
}

const severityConfig = {
  low: {
    icon: Shield,
    color: "warning",
    bgClass: "bg-gradient-warning",
    textClass: "text-warning-foreground",
    label: "Caution"
  },
  medium: {
    icon: AlertTriangle,
    color: "warning", 
    bgClass: "bg-gradient-warning",
    textClass: "text-warning-foreground",
    label: "Warning"
  },
  high: {
    icon: AlertTriangle,
    color: "danger",
    bgClass: "bg-gradient-danger", 
    textClass: "text-danger-foreground",
    label: "Alert"
  }
};

export function IngredientAlertCard({ alert, onDismiss, className }: IngredientAlertCardProps) {
  const config = severityConfig[alert.severity];
  const Icon = config.icon;

  return (
    <div className={cn(
      "card-material p-4 border-l-4",
      config.color === "warning" && "border-l-warning",
      config.color === "danger" && "border-l-danger",
      className
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-full shrink-0",
          config.bgClass
        )}>
          <Icon className={cn("h-4 w-4", config.textClass)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">
              {config.label}
            </Badge>
            {alert.userProfile && alert.userProfile.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {alert.userProfile.join(", ")}
              </Badge>
            )}
          </div>
          
          <h4 className="font-medium text-foreground mb-1">
            {alert.ingredient}
            {alert.alias && (
              <span className="text-muted-foreground font-normal"> (also known as {alert.alias})</span>
            )}
          </h4>
          
          <p className="text-sm text-muted-foreground leading-relaxed">
            {alert.reason}
          </p>
        </div>

        {onDismiss && (
          <button
            onClick={() => onDismiss(alert.id)}
            className="p-1 rounded-full hover:bg-muted transition-colors shrink-0"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}