import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface AnimatedNutriScoreProps {
  score: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showAnimation?: boolean;
}

export function AnimatedNutriScore({ 
  score, 
  size = 'md', 
  className,
  showAnimation = true 
}: AnimatedNutriScoreProps) {
  const [isAnimated, setIsAnimated] = useState(false);
  const scoreUpper = score?.toUpperCase() || 'UNKNOWN';
  
  const getScoreConfig = (score: string) => {
    switch (score) {
      case 'A':
        return {
          bg: 'bg-gradient-to-r from-emerald-500 to-green-500',
          glow: 'shadow-emerald-500/50',
          label: 'Excellent'
        };
      case 'B':
        return {
          bg: 'bg-gradient-to-r from-lime-500 to-emerald-500',
          glow: 'shadow-lime-500/50',
          label: 'Good'
        };
      case 'C':
        return {
          bg: 'bg-gradient-to-r from-yellow-500 to-lime-500',
          glow: 'shadow-yellow-500/50',
          label: 'Fair'
        };
      case 'D':
        return {
          bg: 'bg-gradient-to-r from-orange-500 to-yellow-500',
          glow: 'shadow-orange-500/50',
          label: 'Poor'
        };
      case 'E':
        return {
          bg: 'bg-gradient-to-r from-red-500 to-orange-500',
          glow: 'shadow-red-500/50',
          label: 'Bad'
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-gray-400 to-gray-500',
          glow: 'shadow-gray-500/50',
          label: 'Unknown'
        };
    }
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base'
  };

  const letterSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  const config = getScoreConfig(scoreUpper);

  useEffect(() => {
    if (showAnimation) {
      const timer = setTimeout(() => setIsAnimated(true), 100);
      return () => clearTimeout(timer);
    }
    setIsAnimated(true);
  }, [showAnimation]);

  return (
    <div 
      className={cn(
        "inline-flex items-center gap-3 rounded-full font-bold text-white transition-all duration-700",
        config.bg,
        sizeClasses[size],
        isAnimated ? `opacity-100 scale-100 shadow-lg ${config.glow}` : "opacity-0 scale-75",
        className
      )}
      style={{
        boxShadow: isAnimated ? `0 4px 20px -4px currentColor` : 'none'
      }}
    >
      <span 
        className={cn(
          "font-black transition-transform duration-500",
          letterSizes[size],
          isAnimated ? "scale-100" : "scale-0"
        )}
      >
        {scoreUpper}
      </span>
      <span className="opacity-90 font-medium">
        {config.label}
      </span>
    </div>
  );
}
