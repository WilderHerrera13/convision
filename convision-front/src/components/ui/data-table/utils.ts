import { formatCurrency as formatCurrencyUtil } from '@/lib/utils';

/**
 * Status label mappings for Spanish translations
 */
export const statusLabels = {
  // Quote statuses
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  expired: 'Expirada',
  converted: 'Convertida',
  
  // Sale statuses
  completed: 'Completada',
  cancelled: 'Cancelada',
  
  // Payment statuses
  paid: 'Pagada',
  partial: 'Parcial',
  
  // Order statuses
  processing: 'En proceso',
  delivered: 'Entregada',
  
  // Common statuses
  active: 'Activo',
  inactive: 'Inactivo',
  draft: 'Borrador',
  sent: 'Enviada',
  accepted: 'Aceptada',
};

/**
 * Status variant mappings for consistent styling
 */
export const statusVariants = {
  // Quote statuses
  pending: 'warning',
  approved: 'success', 
  rejected: 'destructive',
  expired: 'outline',
  converted: 'secondary',
  
  // Sale statuses
  completed: 'success',
  cancelled: 'destructive',
  
  // Payment statuses
  paid: 'success',
  partial: 'warning',
  
  // Order statuses
  processing: 'warning',
  delivered: 'success',
  
  // Common statuses
  active: 'success',
  inactive: 'destructive',
  draft: 'outline',
  sent: 'info',
  accepted: 'success',
};

/**
 * Helper function to format date strings
 */
export const formatDate = (dateString: string) => {
  if (!dateString) return '—';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    return '—';
  }
};

/**
 * Helper function to format date and time strings
 */
export const formatDateTime = (dateString: string) => {
  if (!dateString) return '—';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return '—';
  }
};

/**
 * Helper function to format currency values
 */
export const formatCurrency = (value: number | string | null | undefined) => {
  return formatCurrencyUtil(value);
}; 