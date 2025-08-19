import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Camera } from "lucide-react";
import { useBarcodeScanner, BarcodeScanResult } from "@/hooks/useBarcodeScanner";
import { cn } from "@/lib/utils";

interface BarcodeScannerProps {
  onScanSuccess: (result: BarcodeScanResult) => void;
  onClose: () => void;
  className?: string;
}

export function BarcodeScanner({ onScanSuccess, onClose, className }: BarcodeScannerProps) {
  const { isScanning, error, videoRef, startScanning, stopScanning } = useBarcodeScanner();

  useEffect(() => {
    startScanning(onScanSuccess);
    
    return () => {
      stopScanning();
    };
  }, [startScanning, stopScanning, onScanSuccess]);

  return (
    <div className={cn("fixed inset-0 z-50 bg-black", className)}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-between text-white">
          <div>
            <h2 className="text-title-large font-semibold">Scan Barcode</h2>
            <p className="text-body-medium text-white/80">Position barcode in the center</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Video Scanner */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        playsInline
        muted
      />

      {/* Scanning Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Scanning frame */}
        <div className="flex items-center justify-center h-full">
          <div className="relative w-64 h-32 border-2 border-white rounded-lg">
            {/* Corner indicators */}
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />
            
            {/* Scanning line */}
            {isScanning && (
              <div className="absolute top-0 left-0 w-full h-0.5 bg-primary animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="absolute bottom-20 left-4 right-4">
          <Card className="p-4 bg-destructive/10 border-destructive/20">
            <div className="flex items-center gap-3 text-destructive">
              <Camera className="h-5 w-5" />
              <div>
                <p className="font-medium">Scanner Error</p>
                <p className="text-sm opacity-90">{error}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <div className="text-center text-white space-y-2">
          <p className="text-body-large">Hold steady and center the barcode</p>
          <p className="text-body-medium text-white/70">
            Make sure the barcode is clearly visible and well-lit
          </p>
        </div>
      </div>
    </div>
  );
}