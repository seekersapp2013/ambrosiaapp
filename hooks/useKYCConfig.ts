import { useState, useEffect } from 'react';

export interface KYCFieldOption {
  value: string;
  label: string;
  icon?: string;
}

export interface KYCValidationRule {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  match?: string;
  minNumber?: number;
  message?: string;
}

export interface KYCFieldConfig {
  id: string;
  type: 'text' | 'email' | 'password' | 'phone' | 'pin' | 'number' | 'decimal' | 'url' | 'textarea' | 'toggle' | 'select' | 'multi-select' | 'currency-select' | 'schedule';
  label: string;
  placeholder?: string;
  required?: boolean;
  secureEntry?: boolean;
  maxLength?: number;
  dependsOn?: string;
  autoDetect?: string;
  availabilityCheck?: boolean;
  validation?: KYCValidationRule;
  options?: KYCFieldOption[];
  dbTable?: string;
  dbField?: string;
}

export interface KYCStepConfig {
  step: number;
  id: string;
  title: string;
  subtitle: string;
  skippable: boolean;
  fields: KYCFieldConfig[];
}

export interface KYCConfig {
  id: string;
  title: string;
  steps: KYCStepConfig[];
}

/**
 * Custom hook to load KYC JSON configurations on demand right before form render.
 * Loads once on mount when the form screen opens. NO background polling or periodic checks.
 */
export function useKYCConfig(configType: 'signup' | 'provider') {
  const [config, setConfig] = useState<KYCConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadConfig() {
      try {
        setLoading(true);
        let data: KYCConfig;
        if (configType === 'signup') {
          data = (await import('@/config/signupKYC.json')).default as unknown as KYCConfig;
        } else {
          data = (await import('@/config/providerKYC.json')).default as unknown as KYCConfig;
        }
        if (isMounted) {
          setConfig(data);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message ?? 'Failed to load KYC configuration');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadConfig();

    return () => {
      isMounted = false;
    };
  }, [configType]);

  return { config, loading, error };
}
