import React, { useState, useRef, useCallback, useTransition } from 'react';
import { OcrCameraCapture } from "./ocr-camera-capture";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Camera, Upload, X, RotateCcw, Loader2 } from "lucide-react";
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
  const [showCamera, setShowCamera] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setIsOptimizing(true);
      
      // Use startTransition to prevent UI blocking
      startTransition(() => {
        resizeImage(file, 800).then((resizedFile) => {
          setSelectedFile(resizedFile);
          
          // Create a smaller thumbnail for preview (separate from OCR file)
          createThumbnail(resizedFile, 400).then((thumbnailUrl) => {
            setPreviewImage(thumbnailUrl);
            setIsOptimizing(false);
          });
        });
      });
    }
  }, []);

  // Optimized image resize with better quality settings
  const resizeImage = (file: File, maxDimension: number): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions maintaining aspect ratio
          if (width > height && width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          // Use high-quality image scaling
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
          }
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const resizedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(resizedFile);
              }
            },
            'image/jpeg',
            0.75 // Slightly higher quality for OCR accuracy
          );
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // Create a smaller thumbnail for fast preview
  const createThumbnail = (file: File, maxDimension: number): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCameraClick = () => {
    setShowCamera(true);
  };

  const handleCameraCapture = (file: File) => {
    setShowCamera(false);
    onImageSelect(file);
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
      {showCamera ? (
        <OcrCameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      ) : (
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
                    aria-label="Open camera to take photo"
                  >
                    <Camera className="h-6 w-6" />
                    <span className="text-xs">Camera</span>
                  </Button>

                  <Button
                    onClick={handleUploadClick}
                    variant="outline"
                    className="h-20 flex-col gap-2"
                    disabled={isProcessing}
                    aria-label="Upload image from device"
                  >
                    <Upload className="h-6 w-6" />
                    <span className="text-xs">Upload</span>
                  </Button>
                </div>

                {/* File input for uploading from gallery/files */}
                <label htmlFor="file-upload" className="sr-only">
                  Upload image from device
                </label>
                <input
                  id="file-upload"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
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
            ) : isOptimizing ? (
              <div className="space-y-4">
                <div className="relative">
                  <Skeleton className="w-full h-64 rounded-lg" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm">Optimizing image...</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <img
                    src={previewImage}
                    alt="Nutrition label preview"
                    className="w-full max-h-64 object-contain rounded-lg border"
                    loading="lazy"
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
                    className="flex-1 bg-gradient-primary"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : 'Analyze'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}