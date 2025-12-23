import React, { createContext, useContext, useEffect, useState } from "react";
import { settingsStorage } from "@/utils/storage";
import type { ScanSoundType } from "@/utils/scanSounds";

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
  scanSound: boolean;
  setScanSound: (v: boolean) => void;
  scanSoundType: ScanSoundType;
  setScanSoundType: (v: ScanSoundType) => void;
  hapticFeedback: boolean;
  setHapticFeedback: (v: boolean) => void;
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
  scanSound: true,
  setScanSound: () => {},
  scanSoundType: "scanner",
  setScanSoundType: () => {},
  hapticFeedback: true,
  setHapticFeedback: () => {}
};

const SettingsContext = createContext<SettingsState>(defaultState);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [darkMode, setDarkModeState] = useState<boolean>(() => settingsStorage.get().darkMode ?? false);
  const [highContrast, setHighContrastState] = useState<boolean>(() => settingsStorage.get().highContrast ?? false);
  const [textSize, setTextSizeState] = useState<TextSize>(() => settingsStorage.get().textSize ?? "medium");
  const [language, setLanguageState] = useState<string>(() => settingsStorage.get().language ?? "en");
  const [scanSound, setScanSoundState] = useState<boolean>(() => settingsStorage.get().scanSound ?? true);
  const [scanSoundType, setScanSoundTypeState] = useState<ScanSoundType>(() => settingsStorage.get().scanSoundType ?? "scanner");
  const [hapticFeedback, setHapticFeedbackState] = useState<boolean>(() => settingsStorage.get().hapticFeedback ?? true);

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

    // persist (merge with existing stored settings)
    const prev = settingsStorage.get() || {};
    settingsStorage.set({
      ...prev,
      darkMode,
      highContrast,
      textSize,
      language,
      scanSound,
      scanSoundType,
      hapticFeedback
    });
  }, [darkMode, highContrast, textSize, language, scanSound, scanSoundType, hapticFeedback]);

  const setDarkMode = (v: boolean) => setDarkModeState(v);
  const setHighContrast = (v: boolean) => setHighContrastState(v);
  const setTextSize = (v: TextSize) => setTextSizeState(v);
  const setLanguage = (lang: string) => setLanguageState(lang);
  const setScanSound = (v: boolean) => setScanSoundState(v);
  const setScanSoundType = (v: ScanSoundType) => setScanSoundTypeState(v);
  const setHapticFeedback = (v: boolean) => setHapticFeedbackState(v);

  return (
    <SettingsContext.Provider value={{ 
      darkMode, setDarkMode, 
      highContrast, setHighContrast, 
      textSize, setTextSize, 
      language, setLanguage,
      scanSound, setScanSound,
      scanSoundType, setScanSoundType,
      hapticFeedback, setHapticFeedback
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);

export default SettingsContext;
