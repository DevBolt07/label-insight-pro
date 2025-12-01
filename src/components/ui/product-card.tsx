import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Scan, Star, TrendingUp } from "lucide-react";

interface ProductCardProps {
  id: string;
  name: string;
  description: string;
  image: string;
  category: string;
  score?: number;
  grade?: 'A' | 'B' | 'C' | 'D' | 'E';
        price?: string;
        trending?: boolean;
        amazonLink?: string;
        onAnalyze: (id: string) => void;
  className?: string;
}

export function ProductCard({
  id,
  name,
  description,
  image,
  category,
  score,
  grade,
  price,
  trending,
  amazonLink,
  onAnalyze,
  className
}: ProductCardProps) {
  const getGradeColor = (grade?: string) => {
    switch (grade) {
      case 'A': return 'bg-gradient-healthy text-healthy-foreground';
      case 'B': return 'bg-gradient-primary text-primary-foreground';
      case 'C': return 'bg-gradient-warning text-warning-foreground';
      case 'D': case 'E': return 'bg-gradient-danger text-danger-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className={cn("card-product group", className)}>
      {/* Product Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted/30 flex items-center justify-center">
        {image ? (
          <>
            <img 
              src={image} 
              alt={name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </>
        ) : (
          <div className="text-center space-y-1">
            <Scan className="h-8 w-8 text-muted-foreground mx-auto" />
            <span className="text-xs text-muted-foreground">No Image</span>
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {trending && (
            <Badge className="bg-primary/90 text-primary-foreground backdrop-blur-sm">
              <TrendingUp className="h-3 w-3 mr-1" />
              Trending
            </Badge>
          )}
          {grade && (
            <Badge className={cn("backdrop-blur-sm", getGradeColor(grade))}>
              {grade}
            </Badge>
          )}
        </div>

      </div>

      {/* Product Info */}
      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <h3 className="font-semibold text-foreground line-clamp-1">{name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {category}
            </Badge>
            {price && (
              <span className="text-sm font-medium text-foreground">{price}</span>
            )}
          </div>
        </div>

        {/* Analyze Button */}
        <Button 
          onClick={() => onAnalyze(id)}
          className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground rounded-xl h-11 font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Scan className="h-4 w-4 mr-2" />
          Analyze Nutrition
        </Button>

        {/* Amazon Link */}
        {amazonLink && (
          <Button 
            onClick={() => window.open(amazonLink, '_blank')}
            variant="outline"
            className="w-full rounded-xl h-10 font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            🛒 Buy on Amazon
          </Button>
        )}
      </div>
    </Card>
  );
}