import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MoreVertical } from "lucide-react";

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  className?: string;
}

export function MobileHeader({ 
  title, 
  subtitle, 
  showBack, 
  onBack, 
  rightAction,
  className 
}: MobileHeaderProps) {
  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b border-border/50 bg-card/90 backdrop-blur-xl supports-[backdrop-filter]:bg-card/80",
      className
    )}>
      <div className="flex h-16 items-center justify-between px-4 max-w-md mx-auto">
        <div className="flex items-center gap-3">
          {showBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-10 w-10 p-0 rounded-2xl hover:bg-primary/10 transition-all duration-300"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          
          <div>
            <h1 className="text-title-large font-semibold text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {rightAction || (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-10 w-10 p-0 rounded-2xl hover:bg-primary/10 transition-all duration-300"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}