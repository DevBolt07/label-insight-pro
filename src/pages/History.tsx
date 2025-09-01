import { useState } from "react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Calendar, Filter, Camera, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { User } from "@supabase/supabase-js";

interface HistoryProps {
  onNavigate: (page: string, data?: any) => void;
  user: User;
}

const mockHistory = [
  {
    id: "1",
    productName: "Energy Drink XYZ",
    brand: "Brand A",
    scannedAt: "2024-01-15T10:30:00Z",
    score: 34,
    grade: "D" as const,
    alerts: 3,
    image: "/placeholder.svg",
    category: "Beverages"
  },
  {
    id: "2", 
    productName: "Organic Granola Bar",
    brand: "Nature's Best",
    scannedAt: "2024-01-14T16:45:00Z",
    score: 78,
    grade: "B" as const,
    alerts: 0,
    image: "/placeholder.svg",
    category: "Snacks"
  },
  {
    id: "3",
    productName: "Instant Noodles",
    brand: "Quick Meal",
    scannedAt: "2024-01-13T12:15:00Z",
    score: 25,
    grade: "E" as const,
    alerts: 5,
    image: "/placeholder.svg",
    category: "Meals"
  },
  {
    id: "4",
    productName: "Greek Yogurt",
    brand: "Dairy Fresh",
    scannedAt: "2024-01-12T08:20:00Z",
    score: 89,
    grade: "A" as const,
    alerts: 0,
    image: "/placeholder.svg",
    category: "Dairy"
  }
];

const gradeColors = {
  A: "bg-gradient-healthy text-healthy-foreground",
  B: "bg-gradient-healthy text-healthy-foreground", 
  C: "bg-gradient-warning text-warning-foreground",
  D: "bg-gradient-warning text-warning-foreground",
  E: "bg-gradient-danger text-danger-foreground"
};

export function History({ onNavigate }: HistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredHistory, setFilteredHistory] = useState(mockHistory);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === "") {
      setFilteredHistory(mockHistory);
    } else {
      setFilteredHistory(
        mockHistory.filter(item =>
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

  const handleItemClick = (item: any) => {
    onNavigate("results", {
      productName: item.productName,
      image: item.image,
      fromHistory: true
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader 
        title="Scan History"
        subtitle={`${filteredHistory.length} products scanned`}
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
        <div className="grid grid-cols-3 gap-3">
          <Card className="card-material">
            <div className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground">{mockHistory.length}</div>
              <div className="text-xs text-muted-foreground">Total Scans</div>
            </div>
          </Card>
          <Card className="card-material">
            <div className="p-4 text-center">
              <div className="text-2xl font-bold text-danger">
                {mockHistory.reduce((sum, item) => sum + item.alerts, 0)}
              </div>
              <div className="text-xs text-muted-foreground">Health Alerts</div>
            </div>
          </Card>
          <Card className="card-material">
            <div className="p-4 text-center">
              <div className="text-2xl font-bold text-healthy">
                {Math.round(mockHistory.reduce((sum, item) => sum + item.score, 0) / mockHistory.length)}
              </div>
              <div className="text-xs text-muted-foreground">Avg Score</div>
            </div>
          </Card>
        </div>

        {/* History List */}
        <div className="space-y-3">
          {filteredHistory.length > 0 ? (
            filteredHistory.map((item) => (
              <Card 
                key={item.id} 
                className="card-material cursor-pointer group"
                onClick={() => handleItemClick(item)}
              >
                <div className="p-4 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center shrink-0 overflow-hidden">
                    {item.image ? (
                      <img src={item.image} alt={item.productName} className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-foreground truncate">{item.productName}</h3>
                        <p className="text-sm text-muted-foreground truncate">{item.brand}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <Badge className={cn("text-xs font-bold", gradeColors[item.grade])}>
                          {item.grade}
                        </Badge>
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
          ) : (
            <Card className="card-material">
              <div className="p-8 text-center space-y-2">
                <Search className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="text-title-large text-foreground">No Results Found</h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search terms
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* Empty State */}
        {mockHistory.length === 0 && (
          <Card className="card-material">
            <div className="p-8 text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center">
                <Camera className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-headline-medium text-foreground">No Scans Yet</h3>
                <p className="text-body-large text-muted-foreground">
                  Start scanning food labels to build your history
                </p>
              </div>
              <Button 
                onClick={() => onNavigate("scan")}
                className="bg-gradient-primary text-primary-foreground"
              >
                <Camera className="h-4 w-4 mr-2" />
                Start Scanning
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}