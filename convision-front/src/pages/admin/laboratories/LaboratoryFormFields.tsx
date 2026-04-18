import React from 'react';
import { UseFormReturn } from 'react-hook-form';
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
import type { LaboratoryFormInput } from './laboratorySchemas';

type Props = {
  form: UseFormReturn<LaboratoryFormInput>;
  onSubmit: (v: LaboratoryFormInput) => void | Promise<void>;
};

const LaboratoryFormFields: React.FC<Props> = ({ form, onSubmit }) => (
  <Form {...form}>
    <form id="laboratory-admin-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
      <div className="border-b border-[#f0f0f2] px-8 pb-6 pt-6">
        <p className="text-[13px] font-semibold text-[#0f0f12]">Datos del laboratorio</p>
        <div className="mt-4 space-y-5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[11px] font-medium text-[#121215]">Nombre del laboratorio *</FormLabel>
                <FormControl>
                  <Input
                    className="h-9 rounded-md border-[#e0e0e5] text-[12px]"
                    placeholder="Ej. Óptica Visión S.A.S."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contact_person"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[11px] font-medium text-[#121215]">Persona de contacto</FormLabel>
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
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-medium text-[#121215]">Número de teléfono</FormLabel>
                  <FormControl>
                    <Input
                      className="h-9 rounded-md border-[#e0e0e5] text-[12px]"
                      placeholder="Ej. +57 311 234 5678"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-medium text-[#121215]">Correo electrónico</FormLabel>
                  <FormControl>
                    <Input
                      className="h-9 rounded-md border-[#e0e0e5] text-[12px]"
                      placeholder="Ej. contacto@laboratorio.com"
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
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[11px] font-medium text-[#121215]">Dirección</FormLabel>
                <FormControl>
                  <Textarea
                    className="min-h-[68px] rounded-md border-[#e0e0e5] text-[12px]"
                    placeholder="Ingrese la dirección del laboratorio"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
      <div className="px-8 pb-8 pt-6">
        <p className="text-[13px] font-semibold text-[#0f0f12]">Configuración</p>
        <div className="mt-4 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-medium text-[#121215]">Estado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-9 rounded-md border-[#e0e0e5] text-[12px]">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
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
                <FormLabel className="text-[11px] font-medium text-[#121215]">Notas</FormLabel>
                <FormControl>
                  <Textarea
                    className="min-h-[68px] rounded-md border-[#e0e0e5] text-[12px]"
                    placeholder="Ingrese notas adicionales sobre el laboratorio"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </form>
  </Form>
);

export default LaboratoryFormFields;
