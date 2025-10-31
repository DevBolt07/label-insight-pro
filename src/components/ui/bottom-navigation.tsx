import { cn } from "@/lib/utils";
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
    <div className="fixed bottom-0 left-0 right-0 bg-card/98 backdrop-blur-lg border-t border-border/50 z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around py-2 px-4 max-w-screen-sm mx-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 h-auto py-2 px-3 rounded-xl transition-all duration-200 min-w-[60px]",
                isActive 
                  ? "bg-primary/15 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 transition-transform duration-200",
                isActive && "scale-110"
              )} />
              <span className={cn(
                "text-[10px] font-medium leading-tight text-center",
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