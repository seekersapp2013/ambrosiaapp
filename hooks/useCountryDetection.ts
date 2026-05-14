import { useState, useEffect } from 'react';
import { DEFAULT_COUNTRY_CODE, DEFAULT_PHONE_PREFIX, getPhonePrefixForCountry } from '@/utils/countryPhone';

/**
 * Hook to detect user's country and provide appropriate phone prefix
 * Falls back to default (Nigeria) if detection fails
 */
export function useCountryDetection() {
    const [country, setCountry] = useState<string>(DEFAULT_COUNTRY_CODE);
    const [phonePrefix, setPhonePrefix] = useState<string>(DEFAULT_PHONE_PREFIX);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        detectCountry();
    }, []);

    const detectCountry = async () => {
        try {
            // Try to dynamically import expo-localization
            // This will only work if the package is installed
            const Localization = await import('expo-localization');

            // Get the region/country code from the device locale
            const region = Localization.region || DEFAULT_COUNTRY_CODE;

            setCountry(region);
            setPhonePrefix(getPhonePrefixForCountry(region));
        } catch (error) {
            // If expo-localization is not installed or fails, use default (Nigeria)
            console.log('Country detection not available, using default (Nigeria)');
            setCountry(DEFAULT_COUNTRY_CODE);
            setPhonePrefix(DEFAULT_PHONE_PREFIX);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        country,
        phonePrefix,
        isLoading,
    };
}
