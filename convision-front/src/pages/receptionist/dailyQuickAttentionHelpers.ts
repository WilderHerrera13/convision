import { isValid, parseISO } from 'date-fns';
import { isAxiosError } from 'axios';
import type { QuickAttentionItem } from '@/services/dailyActivityReportService';
import { RECEPCIONES_DINERO_META } from '@/services/dailyActivityReportService';

export const NOTE_MAX = 500;

export const QUICK_PROFILE_OPTIONS = [
  { value: 'hombre' as const, label: 'Hombre' },
  { value: 'mujer' as const, label: 'Mujer' },
  { value: 'nino' as const, label: 'Niño' },
];

export function quickAttentionNeedsProfile(item: QuickAttentionItem): boolean {
  return ['preguntas', 'cotizaciones', 'consultas_efectivas'].includes(item);
}

export function quickAttentionNeedsAmount(item: QuickAttentionItem): boolean {
  return RECEPCIONES_DINERO_META.some((m) => m.key === item);
}

export const SHIFT_SET = new Set(['morning', 'afternoon', 'full']);

export function parseReportDateFromSearch(raw: string | null): Date {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date();
  const parsed = parseISO(`${raw}T12:00:00`);
  return isValid(parsed) ? parsed : new Date();
}

export function quickAttentionErrorMessage(err: unknown): string {
  if (!isAxiosError(err)) return 'No se pudo registrar.';
  const data = err.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined;
  if (data?.errors) {
    const parts = Object.values(data.errors)
      .flat()
      .filter((s): s is string => typeof s === 'string' && s.length > 0);
    if (parts.length) return parts.join(' ');
  }
  if (typeof data?.message === 'string' && data.message.length > 0) return data.message;
  return 'No se pudo registrar.';
}
