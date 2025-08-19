import React from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, Check, X } from 'lucide-react';
import { StatusBadge } from '@/lib/status-utils';

// Text cell renderer
export const TextCellRenderer = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined) return '—';
  return <span>{String(value)}</span>;
};

// Date cell renderer
export const DateCellRenderer = ({ 
  value, 
  format: customFormat 
}: { 
  value: string | Date | null; 
  format?: string;
}) => {
  if (!value) return '—';
  
  try {
    const date = typeof value === 'string' ? parseISO(value) : value;
    if (customFormat) {
      return format(date, customFormat, { locale: es });
    }
    return formatDate(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '—';
  }
};

// DateTime cell renderer
export const DateTimeCellRenderer = ({ 
  value, 
  format: customFormat = 'dd/MM/yyyy HH:mm' 
}: { 
  value: string | Date | null; 
  format?: string;
}) => {
  if (!value) return '—';
  
  try {
    const date = typeof value === 'string' ? parseISO(value) : value;
    return format(date, customFormat, { locale: es });
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return '—';
  }
};

// Money cell renderer
export const MoneyCellRenderer = ({ 
  value,
  currency = '$',
  locale = 'es-CO',
  minimumFractionDigits = 2,
  maximumFractionDigits = 2
}: { 
  value: number; 
  currency?: string;
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}) => {
  if (value === null || value === undefined) return '—';
  
  try {
    return formatCurrency(value, currency, {
      locale,
      minimumFractionDigits,
      maximumFractionDigits
    });
  } catch (error) {
    console.error('Error formatting currency:', error);
    return '—';
  }
};

// Status cell renderer with badge
export const StatusCellRenderer = ({ 
  value,
  statusMap = {},
  translations = {}
}: { 
  value: string; 
  statusMap?: Record<string, string>;
  translations?: Record<string, string>;
}) => {
  if (!value) return '—';
  
  return (
    <StatusBadge 
      status={value}
      statusMap={statusMap}
      translations={translations}
    />
  );
};

// Boolean cell renderer
export const BooleanCellRenderer = ({ 
  value,
  trueLabel = 'Sí',
  falseLabel = 'No',
  useIcons = true
}: { 
  value: boolean; 
  trueLabel?: string;
  falseLabel?: string;
  useIcons?: boolean;
}) => {
  if (value === null || value === undefined) return '—';
  
  if (useIcons) {
    return value ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-red-600" />;
  }
  
  return <span>{value ? trueLabel : falseLabel}</span>;
};

// Number cell renderer
export const NumberCellRenderer = ({
  value,
  minimumFractionDigits = 0,
  maximumFractionDigits = 2
}: {
  value: number;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}) => {
  if (value === null || value === undefined) return '—';
  
  try {
    return value.toLocaleString('es-CO', {
      minimumFractionDigits,
      maximumFractionDigits
    });
  } catch (error) {
    console.error('Error formatting number:', error);
    return '—';
  }
};

// Percentage cell renderer
export const PercentCellRenderer = ({
  value,
  minimumFractionDigits = 2,
  maximumFractionDigits = 2,
  multiplier = false
}: {
  value: number;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  multiplier?: boolean;
}) => {
  if (value === null || value === undefined) return '—';
  
  try {
    const displayValue = multiplier ? value * 100 : value;
    return `${displayValue.toLocaleString('es-CO', {
      minimumFractionDigits,
      maximumFractionDigits
    })}%`;
  } catch (error) {
    console.error('Error formatting percentage:', error);
    return '—';
  }
};

// ID cell renderer
export const IdCellRenderer = ({
  value,
  prefix = ''
}: {
  value: string | number;
  prefix?: string;
}) => {
  if (value === null || value === undefined) return '—';
  return <span className="font-mono text-xs">{prefix}{value}</span>;
};

// Email cell renderer
export const EmailCellRenderer = ({
  value,
  linkify = true
}: {
  value: string;
  linkify?: boolean;
}) => {
  if (!value) return '—';
  
  if (linkify) {
    return (
      <a 
        href={`mailto:${value}`} 
        className="flex items-center text-blue-600 hover:underline"
      >
        <Mail className="h-3.5 w-3.5 mr-1 inline" />
        <span>{value}</span>
      </a>
    );
  }
  
  return <span>{value}</span>;
};

// Phone cell renderer
export const PhoneCellRenderer = ({
  value,
  linkify = true
}: {
  value: string;
  linkify?: boolean;
}) => {
  if (!value) return '—';
  
  if (linkify) {
    return (
      <a 
        href={`tel:${value}`} 
        className="flex items-center text-blue-600 hover:underline"
      >
        <Phone className="h-3.5 w-3.5 mr-1 inline" />
        <span>{value}</span>
      </a>
    );
  }
  
  return <span>{value}</span>;
}; 