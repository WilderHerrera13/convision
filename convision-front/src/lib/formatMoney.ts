import { formatCurrency, formatIntegerEsCO } from '@/lib/utils';

export function formatCOP(amount: number): string {
  return formatCurrency(amount, 'COP', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatCOPGroupedInput(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return '';
  return formatIntegerEsCO(amount);
}

export function digitsOnlyMoneyInput(raw: string, maxLen = 14): string {
  return raw.replace(/\D/g, '').slice(0, maxLen);
}
