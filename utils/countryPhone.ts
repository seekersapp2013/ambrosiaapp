/**
 * Country code to phone prefix mapping
 * Maps ISO 3166-1 alpha-2 country codes to international calling codes
 */
export const COUNTRY_TO_PHONE_PREFIX: Record<string, string> = {
    // Africa
    NG: '+234', // Nigeria (primary target market)
    ZA: '+27',  // South Africa
    KE: '+254', // Kenya
    GH: '+233', // Ghana
    EG: '+20',  // Egypt
    ET: '+251', // Ethiopia
    TZ: '+255', // Tanzania
    UG: '+256', // Uganda
    DZ: '+213', // Algeria
    MA: '+212', // Morocco

    // Europe
    GB: '+44',  // United Kingdom
    DE: '+49',  // Germany
    FR: '+33',  // France
    IT: '+39',  // Italy
    ES: '+34',  // Spain
    NL: '+31',  // Netherlands
    BE: '+32',  // Belgium
    SE: '+46',  // Sweden
    NO: '+47',  // Norway
    DK: '+45',  // Denmark
    FI: '+358', // Finland
    IE: '+353', // Ireland
    PT: '+351', // Portugal
    GR: '+30',  // Greece
    PL: '+48',  // Poland

    // North America
    US: '+1',   // United States
    CA: '+1',   // Canada
    MX: '+52',  // Mexico

    // Asia
    CN: '+86',  // China
    IN: '+91',  // India
    JP: '+81',  // Japan
    KR: '+82',  // South Korea
    ID: '+62',  // Indonesia
    MY: '+60',  // Malaysia
    SG: '+65',  // Singapore
    TH: '+66',  // Thailand
    VN: '+84',  // Vietnam
    PH: '+63',  // Philippines
    PK: '+92',  // Pakistan
    BD: '+880', // Bangladesh
    TR: '+90',  // Turkey
    SA: '+966', // Saudi Arabia
    AE: '+971', // United Arab Emirates

    // Oceania
    AU: '+61',  // Australia
    NZ: '+64',  // New Zealand

    // South America
    BR: '+55',  // Brazil
    AR: '+54',  // Argentina
    CO: '+57',  // Colombia
    CL: '+56',  // Chile
    PE: '+51',  // Peru
    VE: '+58',  // Venezuela
};

/**
 * Default country code (Nigeria - primary target market)
 */
export const DEFAULT_COUNTRY_CODE = 'NG';
export const DEFAULT_PHONE_PREFIX = '+234';

/**
 * Get phone prefix for a country code
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns Phone prefix (e.g., '+234') or default prefix if not found
 */
export function getPhonePrefixForCountry(countryCode: string): string {
    const upperCode = countryCode.toUpperCase();
    return COUNTRY_TO_PHONE_PREFIX[upperCode] || DEFAULT_PHONE_PREFIX;
}

/**
 * Format phone number with country code
 * @param phone - Phone number (with or without prefix)
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns Formatted phone number with country code
 */
export function formatPhoneWithCountryCode(phone: string, countryCode: string): string {
    const prefix = getPhonePrefixForCountry(countryCode);

    // Remove any existing prefix
    let cleanPhone = phone.trim();
    Object.values(COUNTRY_TO_PHONE_PREFIX).forEach(p => {
        if (cleanPhone.startsWith(p)) {
            cleanPhone = cleanPhone.slice(p.length);
        }
    });

    // Remove any leading zeros or plus signs
    cleanPhone = cleanPhone.replace(/^[+0]+/, '');

    return `${prefix}${cleanPhone}`;
}
