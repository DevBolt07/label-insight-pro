import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { Home } from "./pages/Home";
import { Profile } from "./pages/Profile";
import { Scanner } from "./pages/Scanner";
import { Results } from "./pages/Results";
import { History } from "./pages/History";
import { Auth } from "./pages/Auth";
import { Settings } from "./pages/Settings";
import { Onboarding } from "./pages/Onboarding";
import { useAuth } from "./hooks/useAuth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useProductAnalysis } from "./hooks/useProductAnalysis";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();
 
const App = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("home");
  const [currentPage, setCurrentPage] = useState("home");
  const [pageData, setPageData] = useState<any>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  
  // Use the product analysis hook
  const { analyzeProduct, loading: analysisLoading } = useProductAnalysis();

  // Check if user has completed onboarding
  useEffect(() => {
    if (user) {
      checkOnboardingStatus();
    }
  }, [user]);

  const checkOnboardingStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      setOnboardingCompleted(data?.onboarding_completed ?? false);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setOnboardingCompleted(false);
    }
  };

  const handleOnboardingComplete = () => {
    setOnboardingCompleted(true);
    handleNavigate('home');
  };

  const handleNavigate = (page: string, data?: any) => {
    setCurrentPage(page);
    setPageData(data);
    
    // Update active tab for bottom navigation
    const tabMapping: Record<string, string> = {
      "home": "home",
      "scan": "scan", 
      "results": "scan",
      "history": "history",
      "profile": "profile",
      "settings": "profile"
    };
    
    if (tabMapping[page]) {
      setActiveTab(tabMapping[page]);
    }
  };

  // Handle product scanning and analysis
  const handleProductScan = async (barcode: string) => {
    try {
      // Analyze the product (health conditions will be fetched in the service)
      const productData = await analyzeProduct(barcode, []);
      
      // Navigate to results page with the data
      handleNavigate("results", productData);
    } catch (error) {
      console.error("Error analyzing product:", error);
    }
  };

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="min-h-screen bg-background flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // Show auth page if user is not authenticated
  if (!user) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Auth onNavigate={handleNavigate} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // Show onboarding if not completed
  if (onboardingCompleted === null) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="min-h-screen bg-background flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  if (!onboardingCompleted) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Onboarding onComplete={handleOnboardingComplete} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case "home":
        return <Home onNavigate={handleNavigate} user={user} />;
      case "profile":
        return <Profile onNavigate={handleNavigate} user={user} />;
      case "scan":
        return <Scanner onNavigate={handleNavigate} onProductScan={handleProductScan} loading={analysisLoading} user={user} />;
      case "results":
        return <Results onNavigate={handleNavigate} data={pageData} user={user} />;
      case "history":
        return <History onNavigate={handleNavigate} user={user} />;
      case "settings":
        return <Settings onNavigate={handleNavigate} user={user} />;
      default:
        return <Home onNavigate={handleNavigate} user={user} />;
    }
  };

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <div className="relative min-h-screen bg-background main-content-padding">
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
                "settings": "settings"
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