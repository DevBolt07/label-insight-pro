// Local storage utilities for scan history and caching

export interface ScanHistoryItem {
  id: string;
  barcode: string;
  productName: string;
  scannedAt: string;
  healthScore?: number;
  grade?: string;
  imageUrl?: string;
}

export interface CachedProduct {
  barcode: string;
  data: any;
  cachedAt: string;
  expiresAt: string;
}

// Scan History Management
export const scanHistoryStorage = {
  getAll: (): ScanHistoryItem[] => {
    try {
      const stored = localStorage.getItem('nutriLabel_scanHistory');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to load scan history:', error);
      return [];
    }
  },

  add: (item: Omit<ScanHistoryItem, 'id' | 'scannedAt'>): void => {
    try {
      const history = scanHistoryStorage.getAll();
      const newItem: ScanHistoryItem = {
        ...item,
        id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        scannedAt: new Date().toISOString()
      };
      
      // Add to beginning, limit to 100 items
      const updatedHistory = [newItem, ...history].slice(0, 100);
      localStorage.setItem('nutriLabel_scanHistory', JSON.stringify(updatedHistory));
    } catch (error) {
      console.warn('Failed to save scan to history:', error);
    }
  },

  remove: (id: string): void => {
    try {
      const history = scanHistoryStorage.getAll();
      const filtered = history.filter(item => item.id !== id);
      localStorage.setItem('nutriLabel_scanHistory', JSON.stringify(filtered));
    } catch (error) {
      console.warn('Failed to remove scan from history:', error);
    }
  },

  clear: (): void => {
    try {
      localStorage.removeItem('nutriLabel_scanHistory');
    } catch (error) {
      console.warn('Failed to clear scan history:', error);
    }
  }
};

// Product Data Caching (24 hour expiry)
export const productCacheStorage = {
  get: (barcode: string): any | null => {
    try {
      const stored = localStorage.getItem(`nutriLabel_cache_${barcode}`);
      if (!stored) return null;

      const cached: CachedProduct = JSON.parse(stored);
      
      // Check if expired
      if (new Date() > new Date(cached.expiresAt)) {
        localStorage.removeItem(`nutriLabel_cache_${barcode}`);
        return null;
      }

      return cached.data;
    } catch (error) {
      console.warn('Failed to load cached product:', error);
      return null;
    }
  },

  set: (barcode: string, data: any): void => {
    try {
      const cached: CachedProduct = {
        barcode,
        data,
        cachedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      };
      
      localStorage.setItem(`nutriLabel_cache_${barcode}`, JSON.stringify(cached));
    } catch (error) {
      console.warn('Failed to cache product data:', error);
    }
  },

  clear: (): void => {
    try {
      // Remove all cached products
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('nutriLabel_cache_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear product cache:', error);
    }
  }
};

// Settings Storage
export const settingsStorage = {
  get: () => {
    try {
      const stored = localStorage.getItem('nutriLabel_settings');
      return stored ? JSON.parse(stored) : {
        preferredCamera: 'environment',
        torchDefaultOn: false,
        showScanHistory: true,
        cacheProducts: true,
        darkMode: false,
        highContrast: false,
        textSize: 'medium',
        language: 'en'
      };
    } catch (error) {
      console.warn('Failed to load settings:', error);
      return {};
    }
  },

  set: (settings: any): void => {
    try {
      localStorage.setItem('nutriLabel_settings', JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save settings:', error);
    }
  }
};