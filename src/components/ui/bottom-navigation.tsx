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
  <div className="fixed left-0 right-0 bg-card/98 backdrop-blur-lg border-t border-border/50 z-50 shadow-lg safe-bottom">
      <div className="flex items-center justify-around py-2 px-2 max-w-screen-sm mx-auto">
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
                "flex flex-col items-center gap-1.5 h-auto py-2.5 px-4 rounded-2xl transition-all duration-300 hover-scale min-w-[64px]",
                isActive 
                  ? "bg-primary/15 text-primary shadow-md" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 transition-transform duration-300",
                isActive && "scale-110"
              )} />
              <span className={cn(
                "text-[10px] font-medium tracking-wide",
                isActive && "font-semibold"
              )}>{item.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}