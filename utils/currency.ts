/**
 * Shared currency config for wallet screens.
 * Single source of truth — import from here, never duplicate.
 */

export const CURRENCIES = ["USD", "NGN", "GBP", "EUR", "CAD", "GHS", "KES", "GMD", "ZAR"] as const;
export type Currency = typeof CURRENCIES[number];

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: "$", NGN: "₦", GBP: "£", EUR: "€",
  CAD: "CA$", GHS: "₵", KES: "KSh", GMD: "D", ZAR: "R",
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  USD: "US Dollar",        NGN: "Nigerian Naira",    GBP: "British Pound",
  EUR: "Euro",             CAD: "Canadian Dollar",   GHS: "Ghanaian Cedi",
  KES: "Kenyan Shilling",  GMD: "Gambian Dalasi",    ZAR: "South African Rand",
};

export function formatAmount(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency as Currency] ?? (currency + " ");
  return `${sym}${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
