import { useState, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

export interface BarcodeScanResult {
  code: string;
  format: string;
}

export function useBarcodeScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);
  
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

      // Prefer back camera if available
      const selectedDevice = videoInputDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear')
      ) || videoInputDevices[0];

      // Start scanning
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

  const stopScanning = useCallback(() => {
    if (codeReader.current) {
      codeReader.current.reset();
    }
    setIsScanning(false);
    setError(null);
  }, []);

  return {
    isScanning,
    error,
    videoRef,
    startScanning,
    stopScanning
  };
}