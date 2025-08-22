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
  const [selectedCameraIndex, setSelectedCameraIndex] = useState(-1); // -1 means not initialized
  const [alwaysPreferBack, setAlwaysPreferBack] = useState(true);
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

      // Select camera: prefer back/environment; reuse user selection only when explicitly switched
      let selectedDevice: MediaDeviceInfo;
      let deviceIndex = -1;

      const lower = (s: string) => s.toLowerCase();
      const backIndex = videoInputDevices.findIndex(d => {
        const label = lower(d.label);
        return label.includes('back') || label.includes('rear') || label.includes('environment') || label.includes('main');
      });
      const frontIndex = videoInputDevices.findIndex(d => {
        const label = lower(d.label);
        return label.includes('front') || label.includes('user') || label.includes('selfie');
      });

      if (!alwaysPreferBack && selectedCameraIndex >= 0 && selectedCameraIndex < videoInputDevices.length) {
        deviceIndex = selectedCameraIndex;
      } else if (backIndex >= 0) {
        deviceIndex = backIndex;
      } else if (frontIndex >= 0) {
        deviceIndex = frontIndex;
      } else {
        deviceIndex = 0; // fallback to first available
      }

      selectedDevice = videoInputDevices[deviceIndex];
      const isBackCamera = backIndex >= 0 && deviceIndex === backIndex;

      setSelectedCameraIndex(deviceIndex);

      // Optimized constraints for mobile barcode scanning
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: { exact: selectedDevice.deviceId },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          facingMode: isBackCamera ? 'environment' : 'user'
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
  }, [selectedCameraIndex]);

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
    setAlwaysPreferBack(false);
    const nextIndex = (selectedCameraIndex + 1) % cameras.length;
    setSelectedCameraIndex(nextIndex);
    // Scanning will restart due to the selectedCameraIndex dependency
  }, [cameras.length, selectedCameraIndex]);

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
    setAlwaysPreferBack(true);
    setSelectedCameraIndex(-1);
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