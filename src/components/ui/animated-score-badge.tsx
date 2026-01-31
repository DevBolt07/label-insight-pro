import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface AnimatedScoreBadgeProps {
  score: number;
  maxScore?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  showAnimation?: boolean;
}

export function AnimatedScoreBadge({ 
  score, 
  maxScore = 100,
  size = "md", 
  className,
  showAnimation = true
}: AnimatedScoreBadgeProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const [strokeDashoffset, setStrokeDashoffset] = useState(100);
  
  const percentage = (score / maxScore) * 100;
  const circumference = 2 * Math.PI * 45; // radius of 45
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return { stroke: "hsl(var(--healthy))", text: "text-healthy" };
    if (score >= 60) return { stroke: "hsl(var(--moderate))", text: "text-moderate" };
    if (score >= 40) return { stroke: "hsl(var(--warning))", text: "text-warning" };
    return { stroke: "hsl(var(--danger))", text: "text-danger" };
  };

  const sizeConfig = {
    sm: { width: 80, fontSize: "text-lg", strokeWidth: 6 },
    md: { width: 120, fontSize: "text-2xl", strokeWidth: 8 },
    lg: { width: 160, fontSize: "text-4xl", strokeWidth: 10 }
  };

  const config = sizeConfig[size];
  const colors = getScoreColor(score);

  useEffect(() => {
    if (!showAnimation) {
      setDisplayScore(score);
      setStrokeDashoffset(100 - percentage);
      return;
    }

    // Animate the score counter
    const duration = 1500;
    const startTime = Date.now();
    
    const animateScore = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      
      setDisplayScore(Math.round(score * easeOutCubic));
      setStrokeDashoffset(100 - (percentage * easeOutCubic));
      
      if (progress < 1) {
        requestAnimationFrame(animateScore);
      }
    };

    requestAnimationFrame(animateScore);
  }, [score, percentage, showAnimation]);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg 
        width={config.width} 
        height={config.width} 
        viewBox="0 0 100 100"
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={config.strokeWidth}
          className="opacity-20"
        />
        {/* Animated progress circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={colors.stroke}
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray="100"
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-100 drop-shadow-lg"
          style={{
            filter: `drop-shadow(0 0 6px ${colors.stroke})`
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-bold tabular-nums", config.fontSize, colors.text)}>
          {displayScore}
        </span>
        <span className="text-xs text-muted-foreground">/ {maxScore}</span>
      </div>
    </div>
  );
}
