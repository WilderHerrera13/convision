import React from 'react';
import { Controller, UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import SearchableCombobox, { ComboboxOption } from '@/components/ui/SearchableCombobox';
import type { PromotionInput, PromotionType, PromotionScope, Promotion } from '@/services/promotionService';

export const TYPE_OPTIONS: ComboboxOption[] = [
  { value: 'cart_total', label: 'Por monto de compra' },
  { value: 'fixed_amount', label: 'Monto fijo de descuento' },
  { value: 'birthday', label: 'Cumpleaños' },
  { value: 'category', label: 'Por categoría / marca / tipo' },
  { value: 'second_pair', label: 'Segundo par' },
  { value: 'cross_product', label: 'Compra X → descuento en Y' },
];

const SCOPE_OPTIONS: ComboboxOption[] = [
  { value: 'cart', label: 'Todo el carrito' },
  { value: 'category', label: 'Categoría' },
  { value: 'brand', label: 'Marca' },
  { value: 'product_type', label: 'Tipo de producto' },
];

const TRIGGER_SCOPE_OPTIONS: ComboboxOption[] = SCOPE_OPTIONS.filter((o) => o.value !== 'cart');

const PRODUCT_TYPE_OPTIONS: ComboboxOption[] = [
  { value: 'lens', label: 'Lente' },
  { value: 'frame', label: 'Montura' },
  { value: 'contact_lens', label: 'Lente de contacto' },
  { value: 'liquid', label: 'Líquido' },
  { value: 'accessory', label: 'Accesorio' },
  { value: 'other', label: 'Otro' },
];

export const promotionSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  type: z.enum(['cart_total', 'fixed_amount', 'birthday', 'category', 'second_pair', 'cross_product']),
  active: z.boolean(),
  stackable: z.boolean(),
  priority: z.string().optional(),
  discount_percentage: z.string().optional(),
  discount_amount: z.string().optional(),
  min_cart_total: z.string().optional(),
  scope: z.enum(['cart', 'category', 'brand', 'product_type']),
  product_category_id: z.string().optional(),
  brand_id: z.string().optional(),
  product_type: z.string().optional(),
  trigger_scope: z.enum(['', 'category', 'brand', 'product_type']),
  trigger_product_category_id: z.string().optional(),
  trigger_brand_id: z.string().optional(),
  trigger_product_type: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  description: z.string().optional(),
});

export type PromotionFormValues = z.infer<typeof promotionSchema>;

export const emptyPromotionValues: PromotionFormValues = {
  name: '',
  type: 'cart_total',
  active: true,
  stackable: false,
  priority: '0',
  discount_percentage: '',
  discount_amount: '',
  min_cart_total: '',
  scope: 'cart',
  product_category_id: '',
  brand_id: '',
  product_type: '',
  trigger_scope: '',
  trigger_product_category_id: '',
  trigger_brand_id: '',
  trigger_product_type: '',
  start_date: '',
  end_date: '',
  description: '',
};

const numOrNull = (v?: string): number | null => {
  if (v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function toPromotionInput(v: PromotionFormValues): PromotionInput {
  return {
    name: v.name,
    type: v.type as PromotionType,
    active: v.active,
    stackable: v.stackable,
    priority: Number(v.priority || '0') || 0,
    discount_percentage: numOrNull(v.discount_percentage),
    discount_amount: numOrNull(v.discount_amount),
    min_cart_total: numOrNull(v.min_cart_total),
    scope: v.scope as PromotionScope,
    product_category_id: numOrNull(v.product_category_id) ?? undefined,
    brand_id: numOrNull(v.brand_id) ?? undefined,
    product_type: v.product_type || '',
    trigger_scope: (v.trigger_scope || '') as PromotionScope | '',
    trigger_product_category_id: numOrNull(v.trigger_product_category_id) ?? undefined,
    trigger_brand_id: numOrNull(v.trigger_brand_id) ?? undefined,
    trigger_product_type: v.trigger_product_type || '',
    start_date: v.start_date ? new Date(v.start_date).toISOString() : null,
    end_date: v.end_date ? new Date(v.end_date).toISOString() : null,
    description: v.description || '',
  };
}

export function promotionToFormValues(p: Promotion): PromotionFormValues {
  const toDate = (s: string | null) => (s ? s.slice(0, 10) : '');
  const toStr = (n: number | null) => (n === null || n === undefined ? '' : String(n));
  return {
    name: p.name,
    type: p.type,
    active: p.active,
    stackable: p.stackable ?? false,
    priority: String(p.priority ?? 0),
    discount_percentage: toStr(p.discount_percentage),
    discount_amount: toStr(p.discount_amount),
    min_cart_total: toStr(p.min_cart_total),
    scope: p.scope,
    product_category_id: toStr(p.product_category_id),
    brand_id: toStr(p.brand_id),
    product_type: p.product_type || '',
    trigger_scope: (p.trigger_scope || '') as PromotionFormValues['trigger_scope'],
    trigger_product_category_id: toStr(p.trigger_product_category_id),
    trigger_brand_id: toStr(p.trigger_brand_id),
    trigger_product_type: p.trigger_product_type || '',
    start_date: toDate(p.start_date),
    end_date: toDate(p.end_date),
    description: p.description || '',
  };
}

interface Props {
  form: UseFormReturn<PromotionFormValues>;
  brandOptions: ComboboxOption[];
  categoryOptions: ComboboxOption[];
}

const Field: React.FC<{ label: string; children: React.ReactNode; error?: string }> = ({ label, children, error }) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    {children}
    {error && <p className="text-sm text-destructive">{error}</p>}
  </div>
);

const PromotionFormFields: React.FC<Props> = ({ form, brandOptions, categoryOptions }) => {
  const { register, control, watch, formState: { errors } } = form;
  const type = watch('type');
  const scope = watch('scope');
  const triggerScope = watch('trigger_scope');

  const showMinCart = type === 'cart_total' || type === 'fixed_amount' || type === 'birthday';
  const minCartRequired = type === 'cart_total';
  const showScope = type === 'category' || type === 'second_pair' || type === 'cross_product';
  const showTrigger = type === 'cross_product';
  const showPercentage = type !== 'fixed_amount';
  const showAmount = true;

  return (
    <div className="space-y-4">
      <Field label="Nombre de la promoción" error={errors.name?.message}>
        <Input {...register('name')} placeholder="Ej: 10% en compras mayores a $500.000" data-testid="promo-name" />
      </Field>

      <Field label="Tipo de promoción">
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <SearchableCombobox options={TYPE_OPTIONS} value={field.value} onChange={field.onChange} placeholder="Seleccione un tipo" />
          )}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        {showPercentage && (
          <Field label="Descuento (%)" error={errors.discount_percentage?.message}>
            <Input type="number" step="0.01" min="0" max="100" {...register('discount_percentage')} placeholder="Ej: 10" data-testid="promo-percentage" />
          </Field>
        )}
        {showAmount && (
          <Field label="Descuento monto fijo ($)" error={errors.discount_amount?.message}>
            <Input type="number" step="0.01" min="0" {...register('discount_amount')} placeholder="Ej: 50000" data-testid="promo-amount" />
          </Field>
        )}
      </div>
      {type !== 'fixed_amount' && (
        <p className="text-[11px] text-[#7d7d87] -mt-2">Complete el porcentaje o el monto fijo (el monto fijo tiene prioridad).</p>
      )}

      {showMinCart && (
        <Field label={`Compra mínima ($)${minCartRequired ? '' : ' (opcional)'}`} error={errors.min_cart_total?.message}>
          <Input type="number" step="0.01" min="0" {...register('min_cart_total')} placeholder="Ej: 500000" data-testid="promo-min-cart" />
        </Field>
      )}

      {showTrigger && (
        <div className="rounded-md border border-[#e5e5e9] bg-[#fafafa] p-3 space-y-3">
          <p className="text-[12px] font-semibold text-[#121212]">Condición — el cliente compra:</p>
          <Field label="Tipo de condición">
            <Controller
              control={control}
              name="trigger_scope"
              render={({ field }) => (
                <SearchableCombobox options={TRIGGER_SCOPE_OPTIONS} value={field.value} onChange={field.onChange} placeholder="Seleccione la condición" />
              )}
            />
          </Field>
          {triggerScope === 'category' && (
            <Field label="Categoría que activa la promoción">
              <Controller
                control={control}
                name="trigger_product_category_id"
                render={({ field }) => (
                  <SearchableCombobox options={categoryOptions} value={field.value} onChange={field.onChange} placeholder="Seleccione una categoría" />
                )}
              />
            </Field>
          )}
          {triggerScope === 'brand' && (
            <Field label="Marca que activa la promoción">
              <Controller
                control={control}
                name="trigger_brand_id"
                render={({ field }) => (
                  <SearchableCombobox options={brandOptions} value={field.value} onChange={field.onChange} placeholder="Seleccione una marca" />
                )}
              />
            </Field>
          )}
          {triggerScope === 'product_type' && (
            <Field label="Tipo de producto que activa la promoción">
              <Controller
                control={control}
                name="trigger_product_type"
                render={({ field }) => (
                  <SearchableCombobox options={PRODUCT_TYPE_OPTIONS} value={field.value} onChange={field.onChange} placeholder="Seleccione el tipo" />
                )}
              />
            </Field>
          )}
        </div>
      )}

      {showScope && (
        <Field label={showTrigger ? 'Recompensa — el descuento aplica a' : 'Aplica a'}>
          <Controller
            control={control}
            name="scope"
            render={({ field }) => (
              <SearchableCombobox options={SCOPE_OPTIONS} value={field.value} onChange={field.onChange} placeholder="Seleccione el alcance" />
            )}
          />
        </Field>
      )}

      {showScope && scope === 'category' && (
        <Field label="Categoría">
          <Controller
            control={control}
            name="product_category_id"
            render={({ field }) => (
              <SearchableCombobox options={categoryOptions} value={field.value} onChange={field.onChange} placeholder="Seleccione una categoría" />
            )}
          />
        </Field>
      )}
      {showScope && scope === 'brand' && (
        <Field label="Marca">
          <Controller
            control={control}
            name="brand_id"
            render={({ field }) => (
              <SearchableCombobox options={brandOptions} value={field.value} onChange={field.onChange} placeholder="Seleccione una marca" />
            )}
          />
        </Field>
      )}
      {showScope && scope === 'product_type' && (
        <Field label="Tipo de producto">
          <Controller
            control={control}
            name="product_type"
            render={({ field }) => (
              <SearchableCombobox options={PRODUCT_TYPE_OPTIONS} value={field.value} onChange={field.onChange} placeholder="Seleccione el tipo" />
            )}
          />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Válida desde (opcional)">
          <Input type="date" {...register('start_date')} data-testid="promo-start" />
        </Field>
        <Field label="Válida hasta (opcional)">
          <Input type="date" {...register('end_date')} data-testid="promo-end" />
        </Field>
      </div>

      <Field label="Prioridad">
        <Input type="number" step="1" {...register('priority')} placeholder="0" />
      </Field>

      <Field label="Descripción (opcional)">
        <Textarea {...register('description')} rows={2} placeholder="Notas internas de la campaña" />
      </Field>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-[13px] text-[#121212]">
          <input type="checkbox" {...register('active')} className="size-4" data-testid="promo-active" />
          Activa
        </label>
        <label className="flex items-center gap-2 text-[13px] text-[#121212]" title="Si está marcada, esta promoción se acumula con otras en lugar de competir por los mismos productos.">
          <input type="checkbox" {...register('stackable')} className="size-4" data-testid="promo-stackable" />
          Acumulable con otras promociones
        </label>
      </div>
    </div>
  );
};

export default PromotionFormFields;
