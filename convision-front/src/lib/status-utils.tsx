import React from 'react';
import { Badge } from '@/components/ui/badge';

// Define the allowed badge variants from the Badge component
export type BadgeVariant = 
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'info';

// Common status mappings
export const commonStatusMap: Record<string, BadgeVariant> = {
  'pending': 'warning',
  'completed': 'success',
  'cancelled': 'destructive',
  'partial': 'info',
  'paid': 'success',
  'refunded': 'secondary',
  'active': 'success',
  'inactive': 'destructive'
};

// Common status translations
export const commonStatusTranslations: Record<string, string> = {
  'pending': 'Pendiente',
  'completed': 'Completada',
  'cancelled': 'Cancelada',
  'partial': 'Parcial',
  'paid': 'Pagada',
  'refunded': 'Reembolsada',
  'active': 'Activo',
  'inactive': 'Inactivo'
};

// Status badge component with consistent styling
export const StatusBadge = ({ 
  status, 
  statusMap = commonStatusMap,
  translations = commonStatusTranslations
}: { 
  status: string; 
  statusMap?: Record<string, string>;
  translations?: Record<string, string>;
}) => {
  if (!status) return null;
  
  // Default to 'default' if the mapped value doesn't exist
  const variant = statusMap[status] || 'default';
  const displayText = translations[status] || status;
  
  // Since we've updated the Badge component to support our variants, we can use it directly
  return (
    <Badge className="capitalize" variant={variant as BadgeVariant}>
      {displayText}
    </Badge>
  );
}; 