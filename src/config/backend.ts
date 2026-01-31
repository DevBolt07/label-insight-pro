/// <reference types="vite/client" />

export const getBackendUrl = (): string => {
  const backendUrl = import.meta.env?.VITE_BACKEND_URL;

  if (!backendUrl) {
    console.warn('VITE_BACKEND_URL is not configured. Using default: http://localhost:8000');
    return 'http://localhost:8000';
  }

  return backendUrl;
};

export const isBackendConfigured = (): boolean => {
  return !!import.meta.env?.VITE_BACKEND_URL;
};

export const getBackendEndpoint = (path: string): string => {
  const baseUrl = getBackendUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};
