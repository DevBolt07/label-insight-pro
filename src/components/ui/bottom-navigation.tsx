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
    <div className="fixed inset-x-0 bottom-0 h-16 bg-white border-t border-gray-200 shadow-lg z-[9999]">
      <div className="flex items-center justify-around h-full py-1 px-2 max-w-screen-sm mx-auto">
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
                "flex flex-col items-center gap-1 h-14 py-1 px-2 rounded-lg transition-all duration-300 hover-scale min-w-[48px]",
                isActive 
                  ? "bg-primary/15 text-primary shadow-md" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <Icon className={cn(
                "h-4 w-4 transition-transform duration-300",
                isActive && "scale-110"
              )} />
              <span className={cn(
                "text-[9px] font-medium tracking-wide",
                isActive && "font-semibold"
              )}>{item.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}