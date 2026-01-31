const translations: Record<string, Record<string, string>> = {
  en: {
    'home.title': 'Label Insight Pro',
    'home.subtitle': 'Scan food labels to understand what you eat',
    'scanner.title': 'Scanner',
    'scanner.searchPlaceholder': 'Search products...',
    'scanner.scanBarcode': 'Scan Barcode',
    'scanner.scanLabel': 'Scan Label',
    'results.title': 'Results',
    'history.title': 'History',
    'profile.title': 'Profile',
    'settings.title': 'Settings',
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.retry': 'Retry',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
  },
  es: {
    'home.title': 'Label Insight Pro',
    'home.subtitle': 'Escanea etiquetas de alimentos para entender lo que comes',
    'scanner.title': 'Escáner',
    'scanner.searchPlaceholder': 'Buscar productos...',
    'scanner.scanBarcode': 'Escanear Código',
    'scanner.scanLabel': 'Escanear Etiqueta',
    'results.title': 'Resultados',
    'history.title': 'Historial',
    'profile.title': 'Perfil',
    'settings.title': 'Configuración',
    'common.loading': 'Cargando...',
    'common.error': 'Ocurrió un error',
    'common.retry': 'Reintentar',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
  },
  fr: {
    'home.title': 'Label Insight Pro',
    'home.subtitle': 'Scannez les étiquettes alimentaires pour comprendre ce que vous mangez',
    'scanner.title': 'Scanner',
    'scanner.searchPlaceholder': 'Rechercher des produits...',
    'scanner.scanBarcode': 'Scanner Code-barres',
    'scanner.scanLabel': 'Scanner Étiquette',
    'results.title': 'Résultats',
    'history.title': 'Historique',
    'profile.title': 'Profil',
    'settings.title': 'Paramètres',
    'common.loading': 'Chargement...',
    'common.error': 'Une erreur est survenue',
    'common.retry': 'Réessayer',
    'common.save': 'Sauvegarder',
    'common.cancel': 'Annuler',
  },
};

export function useTranslation() {
  const getLanguage = () => {
    return localStorage.getItem('language') || 'en';
  };

  const t = (key: string): string => {
    const language = getLanguage();
    return translations[language]?.[key] || translations['en']?.[key] || key;
  };

  return { t, language: getLanguage() };
}
