import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Translates gender values from English to Spanish
 * @param gender The gender value in English
 * @returns The gender value in Spanish
 */
export function translateGender(gender: string | undefined): string {
  if (!gender) return '—';
  
  const translations: Record<string, string> = {
    'male': 'Masculino',
    'female': 'Femenino',
    'other': 'Otro'
  };
  
  return translations[gender.toLowerCase()] || gender;
}

/**
 * Formats a date consistently using DD/MM/YYYY format
 * @param date The date to format (Date object or date string)
 * @returns The formatted date string in DD/MM/YYYY format
 */
export function formatDate(date: Date | string | undefined | null): string {
  if (!date) return '—';
  
  try {
    const dateObj = new Date(date);
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return '—';
    }
    
    // Use the standard ES locale with the desired format
    return dateObj.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '—';
  }
}

/**
 * Safely formats a date using date-fns with proper error handling
 * @param date The date to format (Date object or date string)
 * @param formatPattern The date-fns format pattern (default: 'dd/MM/yyyy')
 * @returns The formatted date string or '—' if invalid
 */
export function safeDateFormat(date: Date | string | undefined | null, formatPattern: string = 'dd/MM/yyyy'): string {
  if (!date) return '—';
  
  try {
    const dateObj = new Date(date);
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return '—';
    }
    
    // Use date-fns format function
    return format(dateObj, formatPattern);
  } catch (error) {
    console.error('Error formatting date with date-fns:', error);
    return '—';
  }
}

/**
 * Translates error messages from English to Spanish
 * @param message The error message in English
 * @returns The translated error message in Spanish
 */
export function translateErrorMessage(message: string | undefined): string {
  if (!message) return 'Ha ocurrido un error';
  
  // Common backend error messages and their Spanish translations
  const errorTranslations: Record<string, string> = {
    // Authentication errors
    'Unauthenticated': 'No autenticado. Por favor, inicie sesión nuevamente.',
    'Unauthenticated.': 'No autenticado. Por favor, inicie sesión nuevamente.',
    'Unauthorized': 'No autorizado. Credenciales incorrectas.',
    'Invalid credentials': 'Credenciales incorrectas.',
    
    // Permission errors
    'Forbidden': 'Acceso denegado.',
    'You do not have permission to access this resource': 'No tienes permiso para acceder a este recurso.',
    
    // Resource errors
    'Not found': 'Recurso no encontrado.',
    'Resource not found': 'Recurso no encontrado.',
    
    // Appointment errors
    'Appointment not found': 'Cita no encontrada.',
    'Only specialists can take appointments': 'Solo los especialistas pueden tomar citas.',
    'You can only take appointments assigned to you': 'Solo puedes tomar citas asignadas a ti.',
    'Only scheduled appointments can be taken': 'Solo las citas programadas pueden ser tomadas.',
    'You already have an active appointment in progress': 'Ya tienes una cita activa en progreso.',
    'Only specialists can pause appointments': 'Solo los especialistas pueden pausar citas.',
    'You can only pause appointments assigned to you': 'Solo puedes pausar citas asignadas a ti.',
    'Only in-progress appointments can be paused': 'Solo las citas en progreso pueden ser pausadas.',
    'You can only pause appointments that you have taken': 'Solo puedes pausar citas que hayas tomado.',
    'Only specialists can resume appointments': 'Solo los especialistas pueden reanudar citas.',
    'You can only resume appointments assigned to you': 'Solo puedes reanudar citas asignadas a ti.',
    'Only paused appointments can be resumed': 'Solo las citas pausadas pueden ser reanudadas.',
    'You can only resume appointments that you have taken': 'Solo puedes reanudar citas que hayas tomado.',
    
    // Validation errors
    'The email field is required': 'El campo de correo electrónico es obligatorio.',
    'The password field is required': 'El campo de contraseña es obligatorio.',
    'The email must be a valid email address': 'El correo electrónico debe tener un formato válido.',
    'The password must be at least 8 characters': 'La contraseña debe tener al menos 8 caracteres.',
    'The email has already been taken': 'Este correo electrónico ya está en uso.',
    'The selected role is invalid': 'El rol seleccionado no es válido.',
    
    // Generic errors
    'Internal server error': 'Error interno del servidor.',
    'Something went wrong': 'Algo salió mal.',
    'Could not connect to the server': 'No se pudo conectar al servidor.',
    'Failed to fetch': 'Error al obtener datos del servidor.',
    'Network error': 'Error de red. Comprueba tu conexión a internet.',
    'Request timeout': 'La solicitud ha excedido el tiempo de espera.',
    'Service unavailable': 'Servicio no disponible en este momento.'
  };
  
  // Check for exact match
  if (errorTranslations[message]) {
    return errorTranslations[message];
  }
  
  // Partial matching for common patterns
  if (message.includes('already exists')) {
    return 'Este registro ya existe en el sistema.';
  }
  
  if (message.includes('required')) {
    return 'Faltan campos obligatorios en el formulario.';
  }
  
  if (message.includes('invalid')) {
    return 'Uno o más campos contienen información inválida.';
  }
  
  if (message.includes('not found')) {
    return 'El recurso solicitado no fue encontrado.';
  }
  
  if (message.includes('permission') || message.includes('unauthorized')) {
    return 'No tienes permisos suficientes para realizar esta acción.';
  }
  
  // Return the original message if no translation is found
  return message;
}

/**
 * Format a number as currency with thousands separators
 * @param amount The amount to format
 * @param currency The currency symbol to use (default: COP)
 * @param options Additional options for formatting
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number | string | null | undefined, 
  currency: string = 'COP', 
  options: {
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
): string {
  if (amount === null || amount === undefined || amount === '') return '—';
  
  const numValue = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  const {
    locale = 'es-CO',
    minimumFractionDigits = 0,
    maximumFractionDigits = 2
  } = options;

  return new Intl.NumberFormat(locale, { 
    style: 'currency', 
    currency,
    minimumFractionDigits,
    maximumFractionDigits 
  }).format(numValue);
}
