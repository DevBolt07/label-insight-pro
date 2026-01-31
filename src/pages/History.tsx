import { useState, useEffect } from "react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Search, Calendar, Filter, Camera, MoreVertical, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { User } from "@supabase/supabase-js";
import { scanHistoryService } from "@/services/scanHistoryService";
import { useToast } from "@/hooks/use-toast";

interface HistoryProps {
  onNavigate: (page: string, data?: any) => void;
  user: User;
}

const gradeColors = {
  A: "bg-gradient-healthy text-healthy-foreground",
  B: "bg-gradient-healthy text-healthy-foreground", 
  C: "bg-gradient-warning text-warning-foreground",
  D: "bg-gradient-warning text-warning-foreground",
  E: "bg-gradient-danger text-danger-foreground"
};


export function History({ onNavigate, user }: HistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadScanHistory();
  }, [user.id]);

  const loadScanHistory = async () => {
    try {
      setIsLoading(true);
      const history = await scanHistoryService.getUserScanHistory(user.id, 50);
      const formattedHistory = history.map((scan: any) => ({
        id: scan.id,
        productName: scan.products?.name || "Unknown Product",
        brand: scan.products?.brand || "Unknown Brand",
        scannedAt: scan.scanned_at,
        score: scan.products?.health_score || 0,
        grade: scan.products?.grade || "N/A",
        alerts: scan.products?.health_warnings?.length || 0,
        image: scan.products?.image_url || "/placeholder.svg",
        category: scan.products?.categories?.split(',')[0] || "Food",
        productId: scan.product_id,
        productData: scan.products
      }));
      setScanHistory(formattedHistory);
      setFilteredHistory(formattedHistory);
    } catch (error) {
      console.error('Error loading scan history:', error);
      toast({
        title: "Error",
        description: "Failed to load scan history.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === "") {
      setFilteredHistory(scanHistory);
    } else {
      setFilteredHistory(
        scanHistory.filter(item =>
          item.productName.toLowerCase().includes(query.toLowerCase()) ||
          item.brand.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase())
        )
      );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleItemClick = async (item: any) => {
    try {
      // If we have product data in the history item, use it
      if (item.productData) {
        onNavigate("results", {
          productData: {
            name: item.productData.name,
            brand: item.productData.brand,
            image: item.productData.image_url,
            categories: item.productData.categories,
            ingredients: item.productData.ingredients || "",
            grade: item.productData.grade,
            healthScore: item.productData.health_score,
            nutriscore: item.productData.nutriscore,
            nova_group: item.productData.nova_group,
            nutritionFacts: item.productData.nutrition_facts || {},
            healthWarnings: item.productData.health_warnings || [],
            allergens: item.productData.allergens || [],
            additives: item.productData.additives || []
          },
          fromHistory: true,
          scanned: true
        });
      } else {
        // Fallback to basic data
        onNavigate("results", {
          productData: {
            name: item.productName,
            image: item.image,
            brand: item.brand
          },
          fromHistory: true
        });
      }
    } catch (error) {
      console.error('Error loading product data:', error);
      // Fallback navigation
      onNavigate("results", {
        productData: {
          name: item.productName,
          image: item.image,
          brand: item.brand
        },
        fromHistory: true
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader 
        title="Scan History"
        subtitle="Label Insight Pro"
        rightAction={
          <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-full">
            <Filter className="h-5 w-5" />
          </Button>
        }
      />

      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products, brands..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 rounded-2xl border-border/50 focus:border-primary"
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="card-material">
            <div className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground">{scanHistory.length}</div>
              <div className="text-xs text-muted-foreground">Total Scans</div>
            </div>
          </Card>
          <Card className="card-material">
            <div className="p-4 text-center">
              <div className="text-2xl font-bold text-danger">
                {scanHistory.reduce((sum, item) => sum + item.alerts, 0)}
              </div>
              <div className="text-xs text-muted-foreground">Health Alerts</div>
            </div>
          </Card>
        </div>

        {/* History List */}
        <div className="space-y-3">
          {isLoading ? (
            <Card className="card-material">
              <div className="p-8 text-center space-y-2">
                <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
                <h3 className="text-title-large text-foreground">Loading History</h3>
                <p className="text-sm text-muted-foreground">
                  Fetching your scan history...
                </p>
              </div>
            </Card>
          ) : filteredHistory.length > 0 ? (
            filteredHistory.map((item) => (
              <Card 
                key={item.id} 
                className="card-material cursor-pointer group"
                onClick={() => handleItemClick(item)}
              >
                <div className="p-4 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center shrink-0 overflow-hidden">
                    {item.image && item.image !== "/placeholder.svg" ? (
                      <img src={item.image} alt={item.productName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <Camera className="h-6 w-6 text-muted-foreground mx-auto" />
                        <span className="text-xs text-muted-foreground mt-1">No Image</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-foreground truncate">{item.productName}</h3>
                        <p className="text-sm text-muted-foreground truncate">{item.brand}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(item.scannedAt)}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                      </div>
                      
                      {item.alerts > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {item.alerts} alerts
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : filteredHistory.length === 0 && searchQuery ? (
            <EmptyState 
              type="search"
              onAction={() => onNavigate("scan")}
            />
          ) : null}
        </div>

        {/* Empty State - No scans yet */}
        {!isLoading && scanHistory.length === 0 && (
          <EmptyState 
            type="history"
            onAction={() => onNavigate("scan")}
          />
        )}
      </div>
    </div>
  );
}