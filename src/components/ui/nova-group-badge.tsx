import { cn } from "@/lib/utils";
import { AlertTriangle, Zap, Leaf, Apple } from "lucide-react";

interface NovaGroupBadgeProps {
  group: number;
  size?: 'sm' | 'md' | 'lg';
  showDescription?: boolean;
  className?: string;
}

export function NovaGroupBadge({ group, size = 'md', showDescription = false, className }: NovaGroupBadgeProps) {
  const getGroupConfig = (group: number) => {
    switch (group) {
      case 1:
        return {
          icon: Leaf,
          bg: 'bg-gradient-to-r from-green-500 to-emerald-500',
          text: 'text-white',
          label: 'Unprocessed',
          description: 'Fresh and minimally processed foods',
          color: 'text-green-600'
        };
      case 2:
        return {
          icon: Apple,
          bg: 'bg-gradient-to-r from-lime-500 to-green-500',
          text: 'text-white',
          label: 'Processed Culinary',
          description: 'Oils, butter, sugar, salt',
          color: 'text-lime-600'
        };
      case 3:
        return {
          icon: Zap,
          bg: 'bg-gradient-to-r from-yellow-500 to-orange-500',
          text: 'text-white',
          label: 'Processed',
          description: 'Canned vegetables, cheese, bread',
          color: 'text-yellow-600'
        };
      case 4:
        return {
          icon: AlertTriangle,
          bg: 'bg-gradient-to-r from-red-500 to-orange-500',
          text: 'text-white',
          label: 'Ultra-Processed',
          description: 'Packaged snacks, soft drinks, instant meals',
          color: 'text-red-600'
        };
      default:
        return {
          icon: AlertTriangle,
          bg: 'bg-gradient-to-r from-gray-400 to-gray-500',
          text: 'text-white',
          label: 'Unknown',
          description: 'Processing level not determined',
          color: 'text-gray-600'
        };
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const config = getGroupConfig(group);
  const Icon = config.icon;

  if (showDescription) {
    return (
      <div className={cn("space-y-1", className)}>
        <div className={cn(
          "inline-flex items-center gap-2 rounded-full font-bold shadow-lg",
          config.bg,
          config.text,
          sizeClasses[size]
        )}>
          <Icon className="h-4 w-4" />
          <span>NOVA {group}</span>
          <span className="opacity-90 font-medium">
            {config.label}
          </span>
        </div>
        <p className={cn("text-xs font-medium", config.color)}>
          {config.description}
        </p>
      </div>
    );
  }

  return (
    <div className={cn(
      "inline-flex items-center gap-2 rounded-full font-bold shadow-lg",
      config.bg,
      config.text,
      sizeClasses[size],
      className
    )}>
      <Icon className="h-4 w-4" />
      <span>NOVA {group}</span>
      <span className="opacity-90 font-medium">
        {config.label}
      </span>
    </div>
  );
}