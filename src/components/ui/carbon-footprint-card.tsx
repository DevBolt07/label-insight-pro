import { Card } from "./card";
import { Badge } from "./badge";
import { cn } from "@/lib/utils";
import { Leaf, Car, Plane, Home, AlertTriangle, Package } from "lucide-react";
import { ProductData } from "@/services/openFoodFacts";

interface CarbonFootprintCardProps {
  productData: ProductData;
  className?: string;
}

export function CarbonFootprintCard({ productData, className }: CarbonFootprintCardProps) {
  const carbonFootprint = productData.carbonFootprint;
  
  if (!carbonFootprint) {
    return null;
  }

  // Calculate relatable comparisons
  const getComparisons = (co2Grams: number) => {
    // Car travel: average 120g CO2/km
    const carKm = (co2Grams / 120).toFixed(1);
    
    // Smartphone charging: ~8g CO2 per full charge
    const phoneCharges = Math.round(co2Grams / 8);
    
    // LED bulb: ~10g CO2 per hour
    const ledHours = Math.round(co2Grams / 10);
    
    return { carKm, phoneCharges, ledHours };
  };

  const comparisons = getComparisons(carbonFootprint);

  // Assess impact level
  const getImpactLevel = (co2Grams: number) => {
    if (co2Grams < 100) return { level: 'Low', color: 'healthy', label: 'Eco-friendly choice' };
    if (co2Grams < 500) return { level: 'Moderate', color: 'warning', label: 'Moderate environmental impact' };
    return { level: 'High', color: 'danger', label: 'High environmental impact' };
  };

  const impact = getImpactLevel(carbonFootprint);

  // Assess packaging impact (from product data if available)
  const packagingMaterials = productData.packaging?.toLowerCase() || '';
  const hasPlastic = packagingMaterials.includes('plastic');
  const hasRecyclable = packagingMaterials.includes('recyclable') || packagingMaterials.includes('cardboard');
  
  const packagingImpact = hasPlastic && !hasRecyclable ? 'High-impact packaging' :
                          hasPlastic && hasRecyclable ? 'Mixed-impact packaging' :
                          hasRecyclable ? 'Low-impact packaging' : 'Unknown packaging impact';

  return (
    <Card className={cn("card-material p-6 space-y-6", className)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-primary" />
            <h3 className="text-title-large font-semibold text-foreground">Carbon Footprint</h3>
          </div>
          <p className="text-sm text-muted-foreground">Environmental impact per 100g</p>
        </div>
        <Badge 
          variant="secondary"
          className={cn(
            "font-semibold",
            impact.color === 'healthy' && 'bg-healthy/10 text-healthy border-healthy/20',
            impact.color === 'warning' && 'bg-warning/10 text-warning border-warning/20',
            impact.color === 'danger' && 'bg-danger/10 text-danger border-danger/20'
          )}
        >
          {impact.level} Impact
        </Badge>
      </div>

      {/* CO2 Value */}
      <div className="text-center p-6 bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl border border-primary/10">
        <div className="text-4xl font-bold text-foreground mb-1">
          {carbonFootprint} g
        </div>
        <div className="text-sm text-muted-foreground">CO₂e per 100g</div>
        <p className="text-xs text-muted-foreground mt-2">{impact.label}</p>
      </div>

      {/* Relatable Comparisons */}
      <div className="space-y-3">
        <h4 className="font-semibold text-foreground text-sm">This is equivalent to:</h4>
        
        <div className="grid gap-3">
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <div className="p-2 bg-background rounded-lg">
              <Car className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Driving {comparisons.carKm} km</p>
              <p className="text-xs text-muted-foreground">in a petrol car</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <div className="p-2 bg-background rounded-lg">
              <Home className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{comparisons.ledHours} hours</p>
              <p className="text-xs text-muted-foreground">of LED bulb usage</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <div className="p-2 bg-background rounded-lg">
              <Plane className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{comparisons.phoneCharges} full charges</p>
              <p className="text-xs text-muted-foreground">of a smartphone</p>
            </div>
          </div>
        </div>
      </div>

      {/* Packaging Impact */}
      {productData.packaging && (
        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h4 className="font-semibold text-foreground text-sm">Packaging</h4>
          </div>
          
          <div className={cn(
            "p-3 rounded-lg border",
            hasPlastic && !hasRecyclable && "bg-danger/5 border-danger/20",
            hasRecyclable && "bg-healthy/5 border-healthy/20",
            !hasPlastic && !hasRecyclable && "bg-muted/30 border-border"
          )}>
            <p className="text-sm font-medium text-foreground mb-1">{packagingImpact}</p>
            <p className="text-xs text-muted-foreground capitalize">{productData.packaging}</p>
          </div>

          {hasPlastic && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-warning/5 p-3 rounded-lg border border-warning/20">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
              <p>This product contains plastic packaging. Consider recycling or choosing alternatives with sustainable packaging.</p>
            </div>
          )}
        </div>
      )}

      {/* Eco Tips */}
      <div className="pt-4 border-t border-border">
        <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Eco tip:</strong> Choose products with lower carbon footprints and sustainable packaging to reduce your environmental impact.
          </p>
        </div>
      </div>

      {/* Data Source */}
      <div className="text-xs text-muted-foreground text-center">
        Data from Open Food Facts • Comparisons based on average UK values
      </div>
    </Card>
  );
}
