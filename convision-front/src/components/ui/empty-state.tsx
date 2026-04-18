import React from 'react';
import { Filter, Clock, CalendarPlus, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRoleTheme } from '@/hooks/useRoleTheme';

export type EmptyStateVariant = 'table-filter' | 'history' | 'appointments' | 'patients' | 'default';

interface EmptyStateConfig {
  title: string;
  description: string;
  actionLabel?: string;
  secondaryLabel?: string;
  useRoleColor: boolean;
  fixedColor?: string;
}

const VARIANT_CONFIG: Record<EmptyStateVariant, EmptyStateConfig> = {
  'table-filter': {
    title: 'Sin resultados',
    description: 'No hay registros que coincidan con los filtros aplicados.',
    actionLabel: 'Limpiar filtros',
    secondaryLabel: 'Ver todos los registros',
    useRoleColor: true,
  },
  history: {
    title: 'Sin historial clínico',
    description: 'Este paciente aún no tiene consultas registradas.',
    actionLabel: 'Registrar primera consulta',
    useRoleColor: false,
    fixedColor: '#0f8f64',
  },
  appointments: {
    title: 'Sin citas programadas',
    description: 'No hay citas agendadas para este período.',
    actionLabel: '+ Nueva cita',
    secondaryLabel: 'Ver calendario',
    useRoleColor: true,
  },
  patients: {
    title: 'Sin pacientes registrados',
    description: 'Comienza agregando el primer paciente al sistema.',
    actionLabel: '+ Nuevo paciente',
    useRoleColor: true,
  },
  default: {
    title: 'Sin datos',
    description: 'No hay elementos para mostrar.',
    useRoleColor: false,
    fixedColor: '#7d7d87',
  },
};

const ICON_BY_VARIANT: Record<EmptyStateVariant, React.ElementType | null> = {
  'table-filter': Filter,
  history: Clock,
  appointments: CalendarPlus,
  patients: UserRound,
  default: null,
};

export interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  className?: string;
  accentColor?: string;
  leadingIcon?: React.ElementType;
  actionLeftIcon?: React.ReactNode;
}

const DOT_PATTERN: React.CSSProperties = {
  backgroundImage: 'radial-gradient(circle, #d4d4db 1.5px, transparent 1.5px)',
  backgroundSize: '44px 44px',
};

export function EmptyState({
  variant = 'default',
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  className,
  accentColor,
  leadingIcon: LeadingIconOverride,
  actionLeftIcon,
}: EmptyStateProps) {
  const roleTheme = useRoleTheme();
  const cfg = VARIANT_CONFIG[variant];
  const IconComp = LeadingIconOverride ?? ICON_BY_VARIANT[variant];

  const color =
    accentColor ?? (cfg.useRoleColor ? roleTheme.primary : (cfg.fixedColor ?? '#7d7d87'));

  const resolvedTitle = title ?? cfg.title;
  const resolvedDescription = description ?? cfg.description;
  const resolvedActionLabel = actionLabel ?? cfg.actionLabel;
  const resolvedSecondaryLabel = secondaryLabel ?? cfg.secondaryLabel;

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center w-full overflow-hidden rounded-lg py-10 px-6',
        className,
      )}
      style={DOT_PATTERN}
    >
      {/* Concentric glow circles */}
      <div className="relative flex items-center justify-center mb-4">
        <div
          className="absolute rounded-full"
          style={{ width: 160, height: 160, background: `${color}0f` }}
        />
        <div
          className="absolute rounded-full"
          style={{ width: 110, height: 110, background: `${color}1a` }}
        />
        <div
          className="relative flex items-center justify-center rounded-full bg-white"
          style={{ width: 64, height: 64, border: `1.5px solid ${color}`, zIndex: 1 }}
        >
          {IconComp && <IconComp className="w-5 h-5" style={{ color }} />}
        </div>
      </div>

      <p className="text-[15px] font-semibold text-[#0f0f12] text-center mt-2">
        {resolvedTitle}
      </p>

      <p className="text-[12px] font-normal text-[#7d7d87] text-center mt-1 max-w-xs">
        {resolvedDescription}
      </p>

      {resolvedActionLabel && onAction && (
        <Button
          onClick={onAction}
          size="sm"
          className="mt-5 flex h-[34px] items-center justify-center gap-1.5 rounded-[7px] px-4 text-[12px] font-semibold text-white"
          style={{ background: color, boxShadow: `0 4px 12px ${color}4d`, border: 'none' }}
        >
          {actionLeftIcon ? <span className="flex shrink-0 items-center">{actionLeftIcon}</span> : null}
          {resolvedActionLabel}
        </Button>
      )}

      {resolvedSecondaryLabel && onSecondary && (
        <button
          onClick={onSecondary}
          className="mt-3 text-[11px] font-medium underline underline-offset-2 transition-opacity hover:opacity-70"
          style={{ color }}
        >
          {resolvedSecondaryLabel}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
