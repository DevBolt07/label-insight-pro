import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Home, Camera, History, Settings, User } from "lucide-react";

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navigationItems = [
  { id: "home", icon: Home, label: "Home" },
  { id: "scan", icon: Camera, label: "Scan" },
  { id: "history", icon: History, label: "History" },
  { id: "profile", icon: User, label: "Profile" },
  { id: "settings", icon: Settings, label: "Settings" },
];

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border/60 z-50 shadow-2xl safe-area-bottom">
      <div className="flex items-center justify-around py-3 px-2 max-w-screen-sm mx-auto h-16">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 h-12 px-3 rounded-xl transition-all duration-200 min-w-[60px]",
                isActive 
                  ? "bg-primary/20 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 transition-transform",
                isActive && "scale-110"
              )} />
              <span className={cn(
                "text-[11px] font-medium leading-tight whitespace-nowrap",
                isActive && "font-semibold"
              )}>
                {item.label}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}