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
    <div className="fixed inset-x-0 bottom-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/50 pb-safe pb-10 shadow-lg">
      <div className="flex items-center justify-between h-16 px-4 mx-auto max-w-screen-sm">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 gap-1 py-2 transition-all duration-300",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-primary to-primary/70 rounded-full shadow-lg shadow-primary/30" />
              )}
              
              <div
                className={cn(
                  "p-2 rounded-2xl transition-all duration-300",
                  isActive 
                    ? "bg-primary/15 shadow-inner" 
                    : "hover:bg-muted/50"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-all duration-300",
                    isActive && "scale-110 drop-shadow-sm"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium transition-all duration-300",
                  isActive
                    ? "text-primary font-semibold"
                    : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
