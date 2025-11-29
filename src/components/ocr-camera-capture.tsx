import React, { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Camera, RotateCcw, Crop } from "lucide-react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";

interface OcrCameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export const OcrCameraCapture: React.FC<OcrCameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null); // base64
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [showCrop, setShowCrop] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        setError("Unable to access camera. Please check permissions.");
      }
    })();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line
  }, []);

  // Capture image from video
  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      setCapturedImage(dataUrl);
      setShowCrop(true);
    }
  };

  // Crop complete callback
  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

    // Get cropped image as file
  const getCroppedImg = async (): Promise<File | null> => {
    if (!capturedImage || !croppedAreaPixels) return null;
    const image = new window.Image();
    image.src = capturedImage;
    await new Promise((resolve) => (image.onload = resolve));
    
    // Calculate scaling to keep max dimension at 800px
    const maxDimension = 800;
    let targetWidth = croppedAreaPixels.width;
    let targetHeight = croppedAreaPixels.height;
    
    if (targetWidth > maxDimension || targetHeight > maxDimension) {
      const scale = Math.min(maxDimension / targetWidth, maxDimension / targetHeight);
      targetWidth = Math.floor(targetWidth * scale);
      targetHeight = Math.floor(targetHeight * scale);
    }
    
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Convert to grayscale to reduce token usage
    ctx.filter = 'grayscale(100%)';

    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      targetWidth,
      targetHeight
    );
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], `ocr-crop-${Date.now()}.jpg`, { type: "image/jpeg" }));
        } else {
          resolve(null);
        }
      }, "image/jpeg", 0.6); // Reduced JPEG quality
    });
  };

  // Confirm crop and send to OCR
  const handleCropConfirm = async () => {
    const file = await getCroppedImg();
    if (file) {
      onCapture(file);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setShowCrop(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <Card className="w-full max-w-md mx-4 bg-background">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">Take Nutrition Label Photo</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {error ? (
            <div className="text-destructive text-center mb-4">{error}</div>
          ) : (
            <>
              {!capturedImage && (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg bg-black"
                    style={{ aspectRatio: "4/3", maxHeight: 320 }}
                  />
                  <div className="flex gap-2 mt-4">
                    <Button onClick={handleCapture} className="flex-1">
                      <Camera className="h-5 w-5 mr-2" /> Capture
                    </Button>
                  </div>
                </>
              )}
              {capturedImage && showCrop && (
                <>
                  <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden mb-4">
                    <Cropper
                      image={capturedImage}
                      crop={crop}
                      zoom={zoom}
                      aspect={4 / 3}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={onCropComplete}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleRetake} variant="outline" className="flex-1">
                      <RotateCcw className="h-4 w-4 mr-2" /> Retake
                    </Button>
                    <Button onClick={handleCropConfirm} className="flex-1">
                      <Crop className="h-4 w-4 mr-2" /> Use Crop
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
};
