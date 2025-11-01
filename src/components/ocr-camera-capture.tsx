import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Camera, RotateCcw } from "lucide-react";

interface OcrCameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export const OcrCameraCapture: React.FC<OcrCameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (blob) {
          const file = new File([blob], `ocr-capture-${Date.now()}.jpg`, { type: "image/jpeg" });
          setCaptured(true);
          onCapture(file);
        }
      }, "image/jpeg", 0.95);
    }
  };

  const handleRetake = () => {
    setCaptured(false);
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
              {!captured ? (
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
              ) : (
                <>
                  <canvas ref={canvasRef} className="w-full rounded-lg border mb-4" style={{ display: "none" }} />
                  <div className="flex gap-2">
                    <Button onClick={handleRetake} variant="outline" className="flex-1">
                      <RotateCcw className="h-4 w-4 mr-2" /> Retake
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
