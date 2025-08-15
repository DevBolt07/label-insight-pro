import { cn } from "@/lib/utils";
import { Badge } from "./badge";
import { Progress } from "./progress";

interface HealthScoreCardProps {
  score: number;
  grade: "A" | "B" | "C" | "D" | "E";
  title: string;
  description?: string;
  className?: string;
}

const gradeConfig = {
  A: { color: "healthy", label: "Excellent" },
  B: { color: "healthy", label: "Good" },
  C: { color: "warning", label: "Fair" },
  D: { color: "warning", label: "Poor" },
  E: { color: "danger", label: "Very Poor" }
};

export function HealthScoreCard({ score, grade, title, description, className }: HealthScoreCardProps) {
  const config = gradeConfig[grade];
  
  return (
    <div className={cn("card-material p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-title-large text-foreground">{title}</h3>
          {description && (
            <p className="text-body-large text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{score}</div>
            <div className="text-xs text-muted-foreground">/ 100</div>
          </div>
          <Badge 
            variant="secondary"
            className={cn(
              "text-lg font-bold px-3 py-1 rounded-full",
              config.color === "healthy" && "bg-gradient-healthy text-healthy-foreground",
              config.color === "warning" && "bg-gradient-warning text-warning-foreground",
              config.color === "danger" && "bg-gradient-danger text-danger-foreground"
            )}
          >
            {grade}
          </Badge>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Nutritional Quality</span>
          <span className={cn(
            "font-medium",
            config.color === "healthy" && "text-healthy",
            config.color === "warning" && "text-warning",
            config.color === "danger" && "text-danger"
          )}>
            {config.label}
          </span>
        </div>
        <Progress 
          value={score} 
          className={cn(
            "h-2",
            config.color === "healthy" && "[&>div]:bg-gradient-healthy",
            config.color === "warning" && "[&>div]:bg-gradient-warning", 
            config.color === "danger" && "[&>div]:bg-gradient-danger"
          )}
        />
      </div>
    </div>
  );
}