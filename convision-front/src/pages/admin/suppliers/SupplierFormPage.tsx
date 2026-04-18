import React, { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageLayout from '@/components/layouts/PageLayout';
import SupplierHelpAside from './SupplierHelpAside';
import type { SupplierFormInput } from './supplierSchemas';
import { cn } from '@/lib/utils';

type Props = {
  form: UseFormReturn<SupplierFormInput>;
  onSubmit: (v: SupplierFormInput) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  title: string;
  breadcrumb: string;
  submitLabel: string;
};

const SectionRule: React.FC = () => <div className="my-4 h-px w-full bg-[#e5e5e9]" />;

const SupplierFormPage: React.FC<Props> = ({
  form,
  onSubmit,
  onCancel,
  isSubmitting,
  title,
  breadcrumb,
  submitLabel,
}) => {
  const [tab, setTab] = useState<'info' | 'contact'>('info');

  return (
    <PageLayout
      title={title}
      subtitle={breadcrumb}
      topbarClassName="h-auto min-h-[56px] py-3"
      titleStackClassName="gap-1"
      actions={
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-9 min-w-[160px] rounded-md text-[13px] font-semibold"
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="supplier-admin-form"
            className="h-9 min-w-[160px] rounded-md bg-[#3a71f7] text-[13px] font-semibold text-white hover:bg-[#2f62db]"
            disabled={isSubmitting}
          >
            {submitLabel}
          </Button>
        </div>
      }
    >
      <Form {...form}>
        <form id="supplier-admin-form" onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-col">
          <div className="flex min-h-[calc(100%-2rem)] w-full flex-col gap-6 lg:flex-row lg:items-start lg:gap-6">
            <Card className="min-w-0 w-full flex-1 overflow-hidden rounded-lg border border-[#ebebee] shadow-sm">
              <div className="flex border-b border-[#e5e5e9] bg-[#fafafb]">
                <button
                  type="button"
                  className={cn(
                    'relative h-12 min-w-[200px] px-5 text-left text-[12px] font-semibold transition-colors',
                    tab === 'info' ? 'bg-white text-[#0f0f12]' : 'text-[#7d7d87] hover:text-[#121215]',
                  )}
                  onClick={() => setTab('info')}
                >
                  Información del proveedor
                  {tab === 'info' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3a71f7]" aria-hidden />
                  )}
                </button>
                <button
                  type="button"
                  className={cn(
                    'relative h-12 min-w-[200px] px-5 text-left text-[12px] font-semibold transition-colors',
                    tab === 'contact' ? 'bg-white text-[#0f0f12]' : 'text-[#7d7d87] hover:text-[#121215]',
                  )}
                  onClick={() => setTab('contact')}
                >
                  Datos de contacto
                  {tab === 'contact' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3a71f7]" aria-hidden />
                  )}
                </button>
              </div>
              <CardContent className="p-0">
                {tab === 'info' && (
                  <div className="space-y-0 px-8 pb-8 pt-6">
                    <p className="text-[13px] font-semibold text-[#0f0f12]">Datos básicos</p>
                    <SectionRule />
                    <div className="space-y-5">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] font-medium text-[#121215]">
                              Nombre del proveedor *
                            </FormLabel>
                            <FormControl>
                              <Input
                                className="h-9 rounded-md border-[#e0e0e5] text-[12px]"
                                placeholder="Ej. Distribuidora Óptica S.A."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid gap-5 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="nit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] font-medium text-[#121215]">NIT / R.U.T. *</FormLabel>
                              <FormControl>
                                <Input
                                  className="h-9 rounded-md border-[#e0e0e5] text-[12px]"
                                  placeholder="Ej. 900.123.456-7"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="personType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] font-medium text-[#121215]">Tipo de empresa</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || undefined}>
                                <FormControl>
                                  <SelectTrigger className="h-9 rounded-md border-[#e0e0e5] text-[12px]">
                                    <SelectValue placeholder="Seleccionar..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="juridica">Persona jurídica</SelectItem>
                                  <SelectItem value="natural">Persona natural</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="companySubtype"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] font-medium text-[#121215]">Forma societaria</FormLabel>
                            <FormControl>
                              <Input
                                className="h-9 rounded-md border-[#e0e0e5] text-[12px]"
                                placeholder="Ej. S.A.S., S.A., Ltda."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid gap-5 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] font-medium text-[#121215]">País *</FormLabel>
                              <FormControl>
                                <Input
                                  className="h-9 rounded-md border-[#e0e0e5] text-[12px]"
                                  placeholder="Colombia"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] font-medium text-[#121215]">Ciudad *</FormLabel>
                              <FormControl>
                                <Input
                                  className="h-9 rounded-md border-[#e0e0e5] text-[12px]"
                                  placeholder="Ej. Bogotá"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <p className="mt-8 text-[13px] font-semibold text-[#0f0f12]">Información comercial</p>
                    <SectionRule />
                    <div className="space-y-5">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="paymentMethod"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] font-medium text-[#121215]">Forma de pago *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || undefined}>
                                <FormControl>
                                  <SelectTrigger className="h-9 rounded-md border-[#e0e0e5] text-[12px]">
                                    <SelectValue placeholder="Seleccionar..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Contado">Contado</SelectItem>
                                  <SelectItem value="Crédito">Crédito</SelectItem>
                                  <SelectItem value="Transferencia">Transferencia</SelectItem>
                                  <SelectItem value="Mixto">Mixto</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="paymentTermDays"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] font-medium text-[#121215]">
                                Plazo de pago (días) *
                              </FormLabel>
                              <FormControl>
                                <Input
                                  className="h-9 rounded-md border-[#e0e0e5] text-[12px]"
                                  placeholder="Ej. 30"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="discountPercent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] font-medium text-[#121215]">
                                Descuento acordado (%)
                              </FormLabel>
                              <FormControl>
                                <Input
                                  className="h-9 rounded-md border-[#e0e0e5] text-[12px]"
                                  placeholder="Ej. 10"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="creditLimit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] font-medium text-[#121215]">
                                Límite de crédito (COP)
                              </FormLabel>
                              <FormControl>
                                <Input
                                  className="h-9 rounded-md border-[#e0e0e5] text-[12px]"
                                  placeholder="Ej. 5.000.000"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] font-medium text-[#121215]">
                              Notas u observaciones
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                className="min-h-[68px] rounded-md border-[#e0e0e5] text-[12px]"
                                placeholder="Agregar notas sobre el proveedor..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {tab === 'contact' && (
                  <div className="space-y-0 px-8 pb-8 pt-6">
                    <p className="text-[13px] font-semibold text-[#0f0f12]">Persona de contacto</p>
                    <SectionRule />
                    <div className="space-y-5">
                      <FormField
                        control={form.control}
                        name="contactName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] font-medium text-[#121215]">
                              Nombre del contacto *
                            </FormLabel>
                            <FormControl>
                              <Input
                                className="h-9 rounded-md border-[#e0e0e5] text-[12px]"
                                placeholder="Ej. Juan Pérez"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid gap-5 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="jobTitle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] font-medium text-[#121215]">Cargo / Rol</FormLabel>
                              <FormControl>
                                <Input
                                  className="h-9 rounded-md border-[#e0e0e5] text-[12px]"
                                  placeholder="Ej. Gerente comercial"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="department"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] font-medium text-[#121215]">Departamento</FormLabel>
                              <FormControl>
                                <Input
                                  className="h-9 rounded-md border-[#e0e0e5] text-[12px]"
                                  placeholder="Ej. Ventas"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <p className="mt-8 text-[13px] font-semibold text-[#0f0f12]">Información de contacto</p>
                    <SectionRule />
                    <div className="space-y-5">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] font-medium text-[#121215]">
                                Teléfono principal *
                              </FormLabel>
                              <FormControl>
                                <Input
                                  className="h-9 rounded-md border-[#e0e0e5] text-[12px]"
                                  placeholder="Ej. +57 310 222 3344"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phoneAlt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] font-medium text-[#121215]">
                                Teléfono alternativo
                              </FormLabel>
                              <FormControl>
                                <Input
                                  className="h-9 rounded-md border-[#e0e0e5] text-[12px]"
                                  placeholder="Ej. +57 320 111 5566"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] font-medium text-[#121215]">
                                Correo electrónico *
                              </FormLabel>
                              <FormControl>
                                <Input
                                  className="h-9 rounded-md border-[#e0e0e5] text-[12px]"
                                  placeholder="Ej. contacto@proveedor.com"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="website"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] font-medium text-[#121215]">Sitio web</FormLabel>
                              <FormControl>
                                <Input
                                  className="h-9 rounded-md border-[#e0e0e5] text-[12px]"
                                  placeholder="Ej. www.proveedor.com"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <p className="mt-8 text-[13px] font-semibold text-[#0f0f12]">Dirección</p>
                    <SectionRule />
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[11px] font-medium text-[#121215]">Dirección *</FormLabel>
                          <FormControl>
                            <Input
                              className="h-9 rounded-md border-[#e0e0e5] text-[12px]"
                              placeholder="Ej. Cra. 15 # 93-75, Bogotá"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
            <SupplierHelpAside tab={tab} />
          </div>
          <div className="mt-8 w-full border-t border-[#e5e5e9] pt-4 text-[12px] text-[#7d7d87]">
            Los campos marcados con * son obligatorios
          </div>
        </form>
      </Form>
    </PageLayout>
  );
};

export default SupplierFormPage;
