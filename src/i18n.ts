import { useSettings } from "@/context/settings";

const translations: Record<string, Record<string, string>> = {
  en: {
    quick_scan: "Quick Scan",
    nutrition_ocr: "Nutrition Label OCR",
    nutrition_ocr_desc: "Extract text from nutrition labels",
    scan_barcode: "Scan Barcode",
    scan_barcode_desc: "Quick product lookup",
    settings_title: "Settings",
    home_subtitle: "Smart food safety scanner",
  },
  hi: {
    quick_scan: "त्वरित स्कैन",
    nutrition_ocr: "पोषण लेबल OCR",
    nutrition_ocr_desc: "पोषण लेबल से पाठ निकालें",
    scan_barcode: "बारकोड स्कैन करें",
    scan_barcode_desc: "त्वरित उत्पाद खोज",
    settings_title: "सेटिंग्स",
    home_subtitle: "स्मार्ट फ़ूड सेफ़्टी स्कैनर",
  }
};

export function useTranslation() {
  const { language } = useSettings();

  const t = (key: string) => {
    const lang = language in translations ? language : 'en';
    return translations[lang][key] ?? translations['en'][key] ?? key;
  };

  return { t };
}

export default translations;
