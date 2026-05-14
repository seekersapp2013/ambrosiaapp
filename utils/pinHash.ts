import CryptoJS from 'crypto-js';

/**
 * Hash a PIN for secure storage
 * @param pin - The 4-digit PIN to hash
 * @returns Hashed PIN string
 */
export function hashPin(pin: string): string {
  return CryptoJS.SHA256(pin).toString();
}

/**
 * Verify a PIN against a stored hash
 * @param pin - The PIN to verify
 * @param hash - The stored hash to compare against
 * @returns True if PIN matches the hash
 */
export function verifyPin(pin: string, hash: string): boolean {
  return hashPin(pin) === hash;
}
