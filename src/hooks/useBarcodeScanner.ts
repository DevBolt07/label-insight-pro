import { useState, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { useSettings } from '@/context/settings';
import { playScanSound } from '@/utils/scanSounds';

export interface BarcodeScanResult {
  code: string;
  format: string;
}

// Trigger haptic feedback (vibration) on mobile devices
const triggerHapticFeedback = () => {
  try {
    if ('vibrate' in navigator) {
      // Short vibration pattern: 50ms vibrate, 30ms pause, 50ms vibrate
      navigator.vibrate([50, 30, 50]);
    }
  } catch (error) {
    console.warn('Haptic feedback not available:', error);
  }
};

export function useBarcodeScanner() {
  const { scanSound, scanSoundType, hapticFeedback } = useSettings();
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const startScanning = useCallback(async (
    onSuccess: (result: BarcodeScanResult) => void
  ) => {
    try {
      setIsScanning(true);
      setError(null);
      
      if (!codeReader.current) {
        codeReader.current = new BrowserMultiFormatReader();
      }
      
      if (!videoRef.current) {
        throw new Error('Video element not available');
      }

      // Use facingMode constraint to prefer back camera, with fallback to front
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' }, // Prefer back camera
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        }
      };

      try {
        // Try back camera first
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Check torch support
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        setTorchSupported('torch' in capabilities);

        // Use decodeFromConstraints for better compatibility
        await codeReader.current.decodeFromConstraints(
          constraints,
          videoRef.current,
          (result, error) => {
            if (result) {
              if (scanSound) playScanSound(scanSoundType);
              if (hapticFeedback) triggerHapticFeedback();
              onSuccess({
                code: result.getText(),
                format: result.getBarcodeFormat().toString()
              });
              stopScanning();
            } else if (error && !(error instanceof NotFoundException)) {
              console.warn('Barcode scanning error:', error);
            }
          }
        );
      } catch (backCameraError) {
        // Fallback to front camera if back camera fails
        console.warn('Back camera not available, trying front camera:', backCameraError);
        
        const frontConstraints: MediaStreamConstraints = {
          video: {
            facingMode: 'user', // Front camera
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(frontConstraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Check torch support
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        setTorchSupported('torch' in capabilities);

        await codeReader.current.decodeFromConstraints(
          frontConstraints,
          videoRef.current,
          (result, error) => {
            if (result) {
              if (scanSound) playScanSound(scanSoundType);
              if (hapticFeedback) triggerHapticFeedback();
              onSuccess({
                code: result.getText(),
                format: result.getBarcodeFormat().toString()
              });
              stopScanning();
            } else if (error && !(error instanceof NotFoundException)) {
              console.warn('Barcode scanning error:', error);
            }
          }
        );
      }
    } catch (err) {
      console.error('Error starting barcode scanner:', err);
      setError(err instanceof Error ? err.message : 'Failed to start camera');
      setIsScanning(false);
    }
  }, [scanSound, scanSoundType, hapticFeedback]);

  const toggleTorch = useCallback(async () => {
    if (!torchSupported || !streamRef.current) return;

    try {
      const track = streamRef.current.getVideoTracks()[0];
      await track.applyConstraints({
        advanced: [{ torch: !torchOn } as any]
      });
      setTorchOn(!torchOn);
    } catch (error) {
      console.warn('Failed to toggle torch:', error);
    }
  }, [torchSupported, torchOn]);

  const stopScanning = useCallback(() => {
    if (codeReader.current) {
      codeReader.current.reset();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
    setError(null);
    setTorchOn(false);
  }, []);

  return {
    isScanning,
    error,
    videoRef,
    startScanning,
    stopScanning,
    torchSupported,
    torchOn,
    toggleTorch
  };
}