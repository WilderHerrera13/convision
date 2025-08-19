/**
 * Translation utilities for consistent i18n handling
 */

import { PaymentMethod } from '@/services/saleService';

/**
 * Maps English payment method names to Spanish
 */
const PAYMENT_METHOD_TRANSLATIONS: Record<string, string> = {
  'Cash': 'Efectivo',
  'Credit Card': 'Tarjeta de Crédito',
  'Bank Transfer': 'Transferencia Bancaria',
  'Wire Transfer': 'Transferencia Bancaria',
  'Debit Card': 'Tarjeta de Débito',
  'App Payment': 'Pago por Aplicación',
  'Mobile Payment': 'Pago Móvil',
  'Check': 'Cheque',
  'Gift Card': 'Tarjeta de Regalo',
  'Store Credit': 'Crédito de Tienda',
  'PayPal': 'PayPal',
  'Apple Pay': 'Apple Pay',
  'Google Pay': 'Google Pay',
};

/**
 * Translates a payment method name from English to Spanish
 * @param name The payment method name in English
 * @returns The translated name in Spanish, or the original if no translation exists
 */
export function translatePaymentMethodName(name: string): string {
  return PAYMENT_METHOD_TRANSLATIONS[name] || name;
}

/**
 * Translates a collection of payment methods from English to Spanish
 * @param methods Array of payment methods
 * @returns Array of payment methods with translated names
 */
export function translatePaymentMethods(methods: PaymentMethod[]): PaymentMethod[] {
  return methods.map(method => ({
    ...method,
    name: translatePaymentMethodName(method.name)
  }));
} 