import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { Home } from "./pages/Home";
import { Profile } from "./pages/Profile";
import { Scanner } from "./pages/Scanner";
import { Results } from "./pages/Results";
import { History } from "./pages/History";

const queryClient = new QueryClient();

const App = () => {
  const [activeTab, setActiveTab] = useState("home");
  const [currentPage, setCurrentPage] = useState("home");
  const [pageData, setPageData] = useState<any>(null);

  const handleNavigate = (page: string, data?: any) => {
    setCurrentPage(page);
    setPageData(data);
    
    // Update active tab for bottom navigation
    const tabMapping: Record<string, string> = {
      "home": "home",
      "scan": "scan", 
      "results": "scan", // Results page is part of scan flow
      "history": "history",
      "profile": "profile",
      "settings": "settings"
    };
    
    if (tabMapping[page]) {
      setActiveTab(tabMapping[page]);
    }
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case "home":
        return <Home onNavigate={handleNavigate} />;
      case "profile":
        return <Profile onNavigate={handleNavigate} />;
      case "scan":
        return <Scanner onNavigate={handleNavigate} />;
      case "results":
        return <Results onNavigate={handleNavigate} data={pageData} />;
      case "history":
        return <History onNavigate={handleNavigate} />;
      default:
        return <Home onNavigate={handleNavigate} />;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <div className="relative min-h-screen bg-background">
          {renderCurrentPage()}
          <BottomNavigation 
            activeTab={activeTab} 
            onTabChange={(tab) => {
              setActiveTab(tab);
              // Map bottom nav tabs to pages
              const pageMapping: Record<string, string> = {
                "home": "home",
                "scan": "scan",
                "history": "history", 
                "profile": "profile",
                "settings": "profile" // Settings goes to profile for now
              };
              if (pageMapping[tab]) {
                handleNavigate(pageMapping[tab]);
              }
            }} 
          />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
