import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ScanSoundType } from '@/utils/scanSounds';

interface SettingsContextType {
  // Sound settings
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  scanSound: boolean;
  setScanSound: (enabled: boolean) => void;
  scanSoundType: ScanSoundType;
  setScanSoundType: (type: ScanSoundType) => void;
  
  // Haptic feedback
  vibrationEnabled: boolean;
  setVibrationEnabled: (enabled: boolean) => void;
  hapticFeedback: boolean;
  setHapticFeedback: (enabled: boolean) => void;
  
  // Language
  language: string;
  setLanguage: (language: string) => void;
  
  // Appearance
  darkMode: boolean;
  setDarkMode: (enabled: boolean) => void;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  textSize: string;
  setTextSize: (size: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  // Sound settings
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem('soundEnabled');
    return stored !== null ? JSON.parse(stored) : true;
  });
  
  const [scanSound, setScanSound] = useState(() => {
    const stored = localStorage.getItem('scanSound');
    return stored !== null ? JSON.parse(stored) : true;
  });
  
  const [scanSoundType, setScanSoundType] = useState<ScanSoundType>(() => {
    const stored = localStorage.getItem('scanSoundType');
    return (stored as ScanSoundType) || 'scanner';
  });
  
  // Haptic feedback
  const [vibrationEnabled, setVibrationEnabled] = useState(() => {
    const stored = localStorage.getItem('vibrationEnabled');
    return stored !== null ? JSON.parse(stored) : true;
  });
  
  const [hapticFeedback, setHapticFeedback] = useState(() => {
    const stored = localStorage.getItem('hapticFeedback');
    return stored !== null ? JSON.parse(stored) : true;
  });
  
  // Language
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'en';
  });
  
  // Appearance
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('darkMode');
    return stored !== null ? JSON.parse(stored) : false;
  });
  
  const [highContrast, setHighContrast] = useState(() => {
    const stored = localStorage.getItem('highContrast');
    return stored !== null ? JSON.parse(stored) : false;
  });
  
  const [textSize, setTextSize] = useState(() => {
    return localStorage.getItem('textSize') || 'medium';
  });

  // Persist all settings to localStorage
  useEffect(() => {
    localStorage.setItem('soundEnabled', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('scanSound', JSON.stringify(scanSound));
  }, [scanSound]);

  useEffect(() => {
    localStorage.setItem('scanSoundType', scanSoundType);
  }, [scanSoundType]);

  useEffect(() => {
    localStorage.setItem('vibrationEnabled', JSON.stringify(vibrationEnabled));
  }, [vibrationEnabled]);

  useEffect(() => {
    localStorage.setItem('hapticFeedback', JSON.stringify(hapticFeedback));
  }, [hapticFeedback]);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    // Apply dark mode to document
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('highContrast', JSON.stringify(highContrast));
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [highContrast]);

  useEffect(() => {
    localStorage.setItem('textSize', textSize);
    document.documentElement.setAttribute('data-text-size', textSize);
  }, [textSize]);

  return (
    <SettingsContext.Provider value={{
      soundEnabled,
      setSoundEnabled,
      scanSound,
      setScanSound,
      scanSoundType,
      setScanSoundType,
      vibrationEnabled,
      setVibrationEnabled,
      hapticFeedback,
      setHapticFeedback,
      language,
      setLanguage,
      darkMode,
      setDarkMode,
      highContrast,
      setHighContrast,
      textSize,
      setTextSize,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
