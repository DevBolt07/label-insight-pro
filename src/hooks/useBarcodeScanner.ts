import { useState, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { useSettings } from '@/context/settings';

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

// Play a realistic barcode scanner sound using Web Audio API
const playScanSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = audioContext.currentTime;
    
    // Create master gain for overall volume
    const masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    masterGain.gain.setValueAtTime(0.4, now);
    
    // First tone - quick ascending chirp
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.connect(gain1);
    gain1.connect(masterGain);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(800, now);
    osc1.frequency.exponentialRampToValueAtTime(1400, now + 0.08);
    gain1.gain.setValueAtTime(0.5, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc1.start(now);
    osc1.stop(now + 0.1);
    
    // Second tone - confirmation beep
    const osc2 = audioContext.createOscillator();
    const gain2 = audioContext.createGain();
    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1200, now + 0.1);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0.6, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.25);
    
    // Third tone - harmonic layer for richness
    const osc3 = audioContext.createOscillator();
    const gain3 = audioContext.createGain();
    osc3.connect(gain3);
    gain3.connect(masterGain);
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(600, now + 0.1);
    gain3.gain.setValueAtTime(0, now);
    gain3.gain.setValueAtTime(0.3, now + 0.1);
    gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc3.start(now + 0.1);
    osc3.stop(now + 0.2);
    
  } catch (error) {
    console.warn('Could not play scan sound:', error);
  }
};

export function useBarcodeScanner() {
  const { scanSound, hapticFeedback } = useSettings();
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
              if (scanSound) playScanSound();
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
              if (scanSound) playScanSound();
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
  }, [scanSound, hapticFeedback]);

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