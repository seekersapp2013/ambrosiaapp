export interface BankOption {
  name: string;
  slug: string;
  code: string;
}

const POPULAR_BANK_SLUGS = [
  "access-bank",
  "guaranty-trust-bank",
  "first-bank-of-nigeria",
  "united-bank-for-africa",
  "zenith-bank",
];

export function getBankLogoUrl(slug: string): string {
  return `https://cdn.jsdelivr.net/gh/wovenfinance/cdn@main/logos/${slug}.png`;
}

export function isPopularBank(slug: string): boolean {
  return POPULAR_BANK_SLUGS.includes(slug);
}

export function sortBanksWithPopularFirst(banks: BankOption[]): BankOption[] {
  return [...banks].sort((a, b) => {
    const aPopular = isPopularBank(a.slug);
    const bPopular = isPopularBank(b.slug);
    if (aPopular && !bPopular) return -1;
    if (!aPopular && bPopular) return 1;
    return a.name.localeCompare(b.name);
  });
}
