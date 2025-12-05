import React, { createContext, useContext, useEffect, useState } from "react";
import { settingsStorage } from "@/utils/storage";

type TextSize = "small" | "medium" | "large";

interface SettingsState {
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
  textSize: TextSize;
  setTextSize: (v: TextSize) => void;
  language: string;
  setLanguage: (lang: string) => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  alertSensitivity: number;
  setAlertSensitivity: (v: number) => void;
  playScanSound: () => void;
}

const defaultState: SettingsState = {
  darkMode: false,
  setDarkMode: () => {},
  highContrast: false,
  setHighContrast: () => {},
  textSize: "medium",
  setTextSize: () => {},
  language: "en",
  setLanguage: () => {},
  soundEnabled: true,
  setSoundEnabled: () => {},
  alertSensitivity: 75,
  setAlertSensitivity: () => {},
  playScanSound: () => {}
};

const SettingsContext = createContext<SettingsState>(defaultState);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [darkMode, setDarkModeState] = useState<boolean>(() => settingsStorage.get().darkMode ?? false);
  const [highContrast, setHighContrastState] = useState<boolean>(() => settingsStorage.get().highContrast ?? false);
  const [textSize, setTextSizeState] = useState<TextSize>(() => settingsStorage.get().textSize ?? "medium");
  const [language, setLanguageState] = useState<string>(() => settingsStorage.get().language ?? "en");
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => settingsStorage.get().soundEnabled ?? true);
  const [alertSensitivity, setAlertSensitivityState] = useState<number>(() => settingsStorage.get().alertSensitivity ?? 75);

  // Create audio context for scan sound
  const playScanSound = () => {
    if (!soundEnabled) return;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 1000;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.log('Could not play scan sound:', error);
    }
  };

  // apply to document and persist
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add("dark"); else root.classList.remove("dark");

    if (highContrast) root.classList.add("high-contrast"); else root.classList.remove("high-contrast");

    // Text size -> adjust root font-size to scale rem-based typography
    switch (textSize) {
      case "small":
        root.style.fontSize = "14px";
        break;
      case "large":
        root.style.fontSize = "18px";
        break;
      default:
        root.style.fontSize = "16px";
    }

    // Set language attribute on html element
    root.setAttribute('lang', language);

    // persist (merge with existing stored settings)
    const prev = settingsStorage.get() || {};
    settingsStorage.set({
      ...prev,
      darkMode,
      highContrast,
      textSize,
      language,
      soundEnabled,
      alertSensitivity
    });
  }, [darkMode, highContrast, textSize, language, soundEnabled, alertSensitivity]);

  const setDarkMode = (v: boolean) => setDarkModeState(v);
  const setHighContrast = (v: boolean) => setHighContrastState(v);
  const setTextSize = (v: TextSize) => setTextSizeState(v);
  const setLanguage = (lang: string) => setLanguageState(lang);
  const setSoundEnabled = (v: boolean) => setSoundEnabledState(v);
  const setAlertSensitivity = (v: number) => setAlertSensitivityState(v);

  return (
    <SettingsContext.Provider value={{ 
      darkMode, setDarkMode, 
      highContrast, setHighContrast, 
      textSize, setTextSize, 
      language, setLanguage,
      soundEnabled, setSoundEnabled,
      alertSensitivity, setAlertSensitivity,
      playScanSound
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);

export default SettingsContext;