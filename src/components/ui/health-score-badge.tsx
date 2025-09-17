import { cn } from "@/lib/utils";

interface HealthScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const HealthScoreBadge: React.FC<HealthScoreBadgeProps> = ({ 
  score, 
  size = "md", 
  className 
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-healthy border-healthy bg-healthy/10";
    if (score >= 60) return "text-moderate border-moderate bg-moderate/10";
    if (score >= 40) return "text-warning border-warning bg-warning/10";
    return "text-danger border-danger bg-danger/10";
  };

  const sizeClasses = {
    sm: "h-6 px-2 text-xs",
    md: "h-8 px-3 text-sm",
    lg: "h-10 px-4 text-base"
  };

  return (
    <div className={cn(
      "inline-flex items-center justify-center rounded-full border font-semibold",
      getScoreColor(score),
      sizeClasses[size],
      className
    )}>
      {score}/100
    </div>
  );
};