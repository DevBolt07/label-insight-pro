import { useState, useEffect } from 'react';
import { checkBackendHealth } from '@/services/backendApi';

export interface BackendHealthState {
  isHealthy: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
}

export function useBackendHealth(checkInterval = 30000) {
  const [healthState, setHealthState] = useState<BackendHealthState>({
    isHealthy: false,
    isChecking: true,
    lastChecked: null,
  });

  const checkHealth = async () => {
    setHealthState(prev => ({ ...prev, isChecking: true }));

    try {
      const healthy = await checkBackendHealth();
      setHealthState({
        isHealthy: healthy,
        isChecking: false,
        lastChecked: new Date(),
      });
    } catch (error) {
      setHealthState({
        isHealthy: false,
        isChecking: false,
        lastChecked: new Date(),
      });
    }
  };

  useEffect(() => {
    checkHealth();

    const interval = setInterval(checkHealth, checkInterval);

    return () => clearInterval(interval);
  }, [checkInterval]);

  return {
    ...healthState,
    recheckHealth: checkHealth,
  };
}
