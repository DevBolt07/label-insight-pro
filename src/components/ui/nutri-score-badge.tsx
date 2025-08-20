import { cn } from "@/lib/utils";

interface NutriScoreBadgeProps {
  score: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function NutriScoreBadge({ score, size = 'md', className }: NutriScoreBadgeProps) {
  const scoreUpper = score?.toUpperCase() || 'UNKNOWN';
  
  const getScoreConfig = (score: string) => {
    switch (score) {
      case 'A':
        return {
          bg: 'bg-gradient-to-r from-emerald-500 to-green-500',
          text: 'text-white',
          label: 'Excellent'
        };
      case 'B':
        return {
          bg: 'bg-gradient-to-r from-lime-500 to-emerald-500',
          text: 'text-white',
          label: 'Good'
        };
      case 'C':
        return {
          bg: 'bg-gradient-to-r from-yellow-500 to-lime-500',
          text: 'text-white',
          label: 'Fair'
        };
      case 'D':
        return {
          bg: 'bg-gradient-to-r from-orange-500 to-yellow-500',
          text: 'text-white',
          label: 'Poor'
        };
      case 'E':
        return {
          bg: 'bg-gradient-to-r from-red-500 to-orange-500',
          text: 'text-white',
          label: 'Bad'
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-gray-400 to-gray-500',
          text: 'text-white',
          label: 'Unknown'
        };
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const config = getScoreConfig(scoreUpper);

  return (
    <div className={cn(
      "inline-flex items-center gap-2 rounded-full font-bold shadow-lg",
      config.bg,
      config.text,
      sizeClasses[size],
      className
    )}>
      <span className="font-black text-lg">
        {scoreUpper}
      </span>
      <span className="opacity-90 font-medium">
        {config.label}
      </span>
    </div>
  );
}