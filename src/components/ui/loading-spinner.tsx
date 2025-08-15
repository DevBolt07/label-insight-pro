import { cn } from "@/lib/utils";
import { Loader2, Scan } from "lucide-react";

interface LoadingSpinnerProps {
  variant?: 'default' | 'analysis' | 'upload';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  message?: string;
}

export function LoadingSpinner({ 
  variant = 'default', 
  size = 'md', 
  className,
  message 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  };

  const containerSizes = {
    sm: 'p-4',
    md: 'p-8',
    lg: 'p-12'
  };

  const getIcon = () => {
    switch (variant) {
      case 'analysis':
        return <Scan className={cn(sizeClasses[size], "animate-spin text-primary")} />;
      case 'upload':
        return <Loader2 className={cn(sizeClasses[size], "animate-spin text-primary")} />;
      default:
        return <Loader2 className={cn(sizeClasses[size], "animate-spin text-primary")} />;
    }
  };

  const getMessage = () => {
    if (message) return message;
    
    switch (variant) {
      case 'analysis':
        return 'Analyzing nutrition facts...';
      case 'upload':
        return 'Uploading image...';
      default:
        return 'Loading...';
    }
  };

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      containerSizes[size],
      className
    )}>
      <div className="relative">
        {getIcon()}
        
        {/* Pulse ring effect */}
        <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
      </div>
      
      {(message !== null) && (
        <p className="mt-3 text-sm text-muted-foreground animate-pulse">
          {getMessage()}
        </p>
      )}
    </div>
  );
}