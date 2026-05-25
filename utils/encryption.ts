import CryptoJS from 'crypto-js';

// Use a strong encryption key - in production, this should be from env variables
const ENCRYPTION_KEY = process.env.EXPO_PUBLIC_ENCRYPTION_KEY || 'ambrosia-wallet-encryption-key-2024';

/**
 * Encrypt sensitive data
 * @param data - The data to encrypt
 * @returns Encrypted string
 */
export function encrypt(data: string): string {
  return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
}

/**
 * Decrypt sensitive data
 * @param encryptedData - The encrypted data
 * @returns Decrypted string
 */
export function decrypt(encryptedData: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}
