import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { Badge } from "./badge";
import { AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdditiveDetailModalProps {
  additive: string;
  isOpen: boolean;
  onClose: () => void;
}

// Common food additives database
const ADDITIVES_DATABASE: Record<string, {
  name: string;
  category: string;
  risk: 'low' | 'moderate' | 'high';
  description: string;
  sources?: string;
  concerns?: string[];
}> = {
  'e100': { name: 'Curcumin', category: 'Natural Color', risk: 'low', description: 'Natural yellow-orange color from turmeric root', sources: 'Turmeric' },
  'e122': { name: 'Azorubine (Carmoisine)', category: 'Synthetic Color', risk: 'high', description: 'Synthetic red dye', concerns: ['May cause allergic reactions', 'Hyperactivity in children', 'Banned in some countries'] },
  'e150d': { name: 'Caramel IV (Sulfite Ammonia Caramel)', category: 'Color', risk: 'moderate', description: 'Brown coloring made with ammonia and sulfites', concerns: ['May contain 4-MEI (potential carcinogen)', 'Made with ammonia process'] },
  'e200': { name: 'Sorbic Acid', category: 'Preservative', risk: 'low', description: 'Natural preservative to prevent mold and yeast' },
  'e202': { name: 'Potassium Sorbate', category: 'Preservative', risk: 'low', description: 'Salt of sorbic acid, prevents mold growth' },
  'e211': { name: 'Sodium Benzoate', category: 'Preservative', risk: 'moderate', description: 'Common preservative', concerns: ['May form benzene when combined with vitamin C', 'Linked to hyperactivity'] },
  'e250': { name: 'Sodium Nitrite', category: 'Preservative & Color Fixative', risk: 'high', description: 'Preservative used in cured meats', concerns: ['May form carcinogenic nitrosamines', 'High intake linked to cancer risk'] },
  'e290': { name: 'Carbon Dioxide', category: 'Acidity Regulator', risk: 'low', description: 'Used to carbonate drinks and as a preservative' },
  'e300': { name: 'Ascorbic Acid (Vitamin C)', category: 'Antioxidant', risk: 'low', description: 'Natural antioxidant and vitamin' },
  'e322': { name: 'Lecithin', category: 'Emulsifier', risk: 'low', description: 'Natural emulsifier from soybeans or eggs' },
  'e330': { name: 'Citric Acid', category: 'Acidity Regulator', risk: 'low', description: 'Natural acid found in citrus fruits' },
  'e338': { name: 'Phosphoric Acid', category: 'Acidity Regulator', risk: 'moderate', description: 'Acid used in soft drinks', concerns: ['High consumption linked to lower bone density', 'May affect calcium absorption'] },
  'e412': { name: 'Guar Gum', category: 'Thickener', risk: 'low', description: 'Natural thickener from guar beans' },
  'e440': { name: 'Pectin', category: 'Gelling Agent', risk: 'low', description: 'Natural gelling agent from fruits' },
  'e451': { name: 'Triphosphates', category: 'Stabilizer', risk: 'moderate', description: 'Stabilizer and moisture retention agent', concerns: ['High phosphate intake may affect kidney function'] },
  'e500': { name: 'Sodium Carbonates', category: 'Acidity Regulator', risk: 'low', description: 'Baking soda and related compounds' },
  'e501': { name: 'Potassium Carbonates', category: 'Acidity Regulator', risk: 'low', description: 'Acidity regulator and stabilizer' },
  'e508': { name: 'Potassium Chloride', category: 'Salt Substitute', risk: 'low', description: 'Used as salt substitute or flavor enhancer' },
  'e621': { name: 'Monosodium Glutamate (MSG)', category: 'Flavor Enhancer', risk: 'moderate', description: 'Flavor enhancer', concerns: ['May cause sensitivity reactions in some people', 'Headaches reported by some consumers'] },
  'e635': { name: 'Disodium 5\'-Ribonucleotides', category: 'Flavor Enhancer', risk: 'moderate', description: 'Flavor enhancer often used with MSG', concerns: ['Not suitable for people with gout', 'May trigger asthma'] },
};

export function AdditiveDetailModal({ additive, isOpen, onClose }: AdditiveDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const additiveCode = additive.toLowerCase().replace(/[^a-z0-9]/g, '');
  const additiveData = ADDITIVES_DATABASE[additiveCode];

  const getRiskColor = (risk: 'low' | 'moderate' | 'high') => {
    switch (risk) {
      case 'low':
        return 'text-healthy border-healthy/20 bg-healthy/10';
      case 'moderate':
        return 'text-warning border-warning/20 bg-warning/10';
      case 'high':
        return 'text-danger border-danger/20 bg-danger/10';
    }
  };

  const getRiskIcon = (risk: 'low' | 'moderate' | 'high') => {
    switch (risk) {
      case 'low':
        return <CheckCircle2 className="h-5 w-5 text-healthy" />;
      case 'moderate':
        return <Info className="h-5 w-5 text-warning" />;
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-danger" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-muted-foreground font-mono text-sm">{additive.toUpperCase()}</span>
            {additiveData && (
              <Badge variant="outline" className="ml-auto">
                {additiveData.category}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : additiveData ? (
          <div className="space-y-4">
            {/* Name */}
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">{additiveData.name}</h3>
              <p className="text-sm text-muted-foreground">{additiveData.description}</p>
            </div>

            {/* Risk Level */}
            <div className={cn("p-4 rounded-lg border", getRiskColor(additiveData.risk))}>
              <div className="flex items-center gap-2 mb-2">
                {getRiskIcon(additiveData.risk)}
                <span className="font-semibold">
                  {additiveData.risk === 'low' && 'Generally Recognized as Safe'}
                  {additiveData.risk === 'moderate' && 'Use with Caution'}
                  {additiveData.risk === 'high' && 'Potential Health Concerns'}
                </span>
              </div>
            </div>

            {/* Sources */}
            {additiveData.sources && (
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">Sources</h4>
                <p className="text-sm text-muted-foreground">{additiveData.sources}</p>
              </div>
            )}

            {/* Health Concerns */}
            {additiveData.concerns && additiveData.concerns.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-danger" />
                  Health Concerns
                </h4>
                <ul className="space-y-2">
                  {additiveData.concerns.map((concern, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-danger mt-0.5">•</span>
                      <span>{concern}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Additional Info */}
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                This information is provided for educational purposes. Always consult with healthcare professionals for personalized advice.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Info className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              No detailed information available for this additive code.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Code: <span className="font-mono">{additive.toUpperCase()}</span>
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
