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
}

const defaultState: SettingsState = {
  darkMode: false,
  setDarkMode: () => {},
  highContrast: false,
  setHighContrast: () => {},
  textSize: "medium",
  setTextSize: () => {},
  language: "en",
  setLanguage: () => {}
};

const SettingsContext = createContext<SettingsState>(defaultState);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [darkMode, setDarkModeState] = useState<boolean>(() => settingsStorage.get().darkMode ?? false);
  const [highContrast, setHighContrastState] = useState<boolean>(() => settingsStorage.get().highContrast ?? false);
  const [textSize, setTextSizeState] = useState<TextSize>(() => settingsStorage.get().textSize ?? "medium");
  const [language, setLanguageState] = useState<string>(() => settingsStorage.get().language ?? "en");

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
      language
    });
  }, [darkMode, highContrast, textSize, language]);

  const setDarkMode = (v: boolean) => setDarkModeState(v);
  const setHighContrast = (v: boolean) => setHighContrastState(v);
  const setTextSize = (v: TextSize) => setTextSizeState(v);
  const setLanguage = (lang: string) => setLanguageState(lang);

  return (
    <SettingsContext.Provider value={{ darkMode, setDarkMode, highContrast, setHighContrast, textSize, setTextSize, language, setLanguage }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);

export default SettingsContext;
