import React, { useState, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OCRScannerProps {
  onImageSelect: (file: File) => void;
  onClose: () => void;
  isProcessing?: boolean;
  className?: string;
}

export function OCRScanner({ 
  onImageSelect, 
  onClose, 
  isProcessing = false, 
  className 
}: OCRScannerProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleConfirm = () => {
    if (selectedFile) {
      onImageSelect(selectedFile);
    }
  };

  const handleRetake = () => {
    setPreviewImage(null);
    setSelectedFile(null);
  };

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center bg-black/80",
      className
    )}>
      <Card className="w-full max-w-md mx-4 bg-background">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">Scan Nutrition Label</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isProcessing}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {!previewImage ? (
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm text-center">
                Take a photo or upload an image of a nutrition label to analyze its contents
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleCameraClick}
                  variant="outline"
                  className="h-20 flex-col gap-2"
                  disabled={isProcessing}
                >
                  <Camera className="h-6 w-6" />
                  <span className="text-xs">Camera</span>
                </Button>
                
                <Button
                  onClick={handleUploadClick}
                  variant="outline"
                  className="h-20 flex-col gap-2"
                  disabled={isProcessing}
                >
                  <Upload className="h-6 w-6" />
                  <span className="text-xs">Upload</span>
                </Button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
              
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
              
              <div className="text-xs text-muted-foreground text-center space-y-1">
                <p>• Ensure the nutrition label is clearly visible</p>
                <p>• Good lighting improves accuracy</p>
                <p>• Hold camera steady when taking photo</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={previewImage}
                  alt="Nutrition label preview"
                  className="w-full max-h-64 object-contain rounded-lg border"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleRetake}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={isProcessing}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retake
                </Button>
                
                <Button
                  onClick={handleConfirm}
                  size="sm"
                  className="flex-1"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Analyze'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}