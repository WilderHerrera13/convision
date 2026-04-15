import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import type { SetURLSearchParams } from 'react-router-dom';
import { SHIFT_SET } from '@/pages/receptionist/dailyQuickAttentionHelpers';

type ToastFn = (args: { title: string; description: string }) => void;

/**
 * Valida una sola vez la query frente al estado ya corregido; si hay incoherencia, toast + URL canónica.
 * La sincronización al cambiar fecha/jornada la hace el caller con `syncQuery`.
 */
export function useDailyQuickAttentionQuerySync(
  searchParams: URLSearchParams,
  setSearchParams: SetURLSearchParams,
  reportDate: Date,
  shift: string,
  toast: ToastFn,
): void {
  const urlValidatedRef = useRef(false);

  useEffect(() => {
    if (urlValidatedRef.current) return;
    urlValidatedRef.current = true;

    const rawDate = searchParams.get('date');
    const rawShift = searchParams.get('shift');
    const canonicalDate = format(reportDate, 'yyyy-MM-dd');
    const canonicalShift = shift;

    const dateMismatch = rawDate !== null && rawDate !== canonicalDate;
    const shiftMismatch = rawShift !== null && !SHIFT_SET.has(rawShift);

    if (dateMismatch || shiftMismatch) {
      const parts: string[] = [];
      if (dateMismatch) {
        parts.push('La fecha del enlace no es válida; se usó una fecha permitida.');
      }
      if (shiftMismatch) {
        parts.push('La jornada del enlace no es válida; se usó «Mañana» u otra jornada permitida.');
      }
      toast({
        title: 'Parámetros del enlace ajustados',
        description: parts.join(' '),
      });
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('date', canonicalDate);
          next.set('shift', canonicalShift);
          return next;
        },
        { replace: true },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una pasada al montar
  }, []);
}

export function buildQuickAttentionQuerySync(
  setSearchParams: SetURLSearchParams,
): (nextDate: Date, nextShift: string) => void {
  return (nextDate: Date, nextShift: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('date', format(nextDate, 'yyyy-MM-dd'));
        next.set('shift', nextShift);
        return next;
      },
      { replace: true },
    );
  };
}
