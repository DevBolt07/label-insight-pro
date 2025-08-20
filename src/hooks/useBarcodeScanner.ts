import { useState, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

export interface BarcodeScanResult {
  code: string;
  format: string;
}

export function useBarcodeScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState(0);
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

      // Get available video input devices
      const videoInputDevices = await codeReader.current.listVideoInputDevices();
      
      if (videoInputDevices.length === 0) {
        throw new Error('No camera found');
      }

      setCameras(videoInputDevices);

      // Select camera (prefer back camera on first launch)
      const selectedDevice = selectedCameraIndex < videoInputDevices.length 
        ? videoInputDevices[selectedCameraIndex]
        : videoInputDevices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('rear')
          ) || videoInputDevices[0];

      // Start scanning with enhanced constraints
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedDevice.deviceId,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: selectedDevice.label.toLowerCase().includes('back') ? 'environment' : 'user'
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Check torch support
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      setTorchSupported('torch' in capabilities);

      await codeReader.current.decodeFromVideoDevice(
        selectedDevice.deviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
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
    } catch (err) {
      console.error('Error starting barcode scanner:', err);
      setError(err instanceof Error ? err.message : 'Failed to start camera');
      setIsScanning(false);
    }
  }, []);

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

  const switchCamera = useCallback(() => {
    if (cameras.length <= 1) return;
    
    const nextIndex = (selectedCameraIndex + 1) % cameras.length;
    setSelectedCameraIndex(nextIndex);
    
    // Restart scanning with new camera
    if (isScanning) {
      stopScanning();
      // Will restart automatically due to dependency change
    }
  }, [cameras.length, selectedCameraIndex, isScanning]);

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
    toggleTorch,
    cameras,
    selectedCameraIndex,
    switchCamera
  };
}