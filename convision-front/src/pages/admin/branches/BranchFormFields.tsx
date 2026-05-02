import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { BranchFormInput } from './branchSchemas';

type Props = {
  form: UseFormReturn<BranchFormInput>;
};

const BranchFormFields: React.FC<Props> = ({ form }) => (
  <div className="space-y-4">
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Nombre</FormLabel>
          <FormControl>
            <Input placeholder="Nombre de la sede" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField
        control={form.control}
        name="city"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Ciudad</FormLabel>
            <FormControl>
              <Input placeholder="Ciudad" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Teléfono</FormLabel>
            <FormControl>
              <Input placeholder="Teléfono" {...field} />
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
          <FormLabel>Dirección</FormLabel>
          <FormControl>
            <Input placeholder="Dirección" {...field} />
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
          <FormLabel>Correo</FormLabel>
          <FormControl>
            <Input type="email" placeholder="correo@dominio.com" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="is_active"
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center justify-between rounded-md border border-[#e5e5e9] px-3 py-2">
            <div className="flex flex-col space-y-0.5 pr-3">
              <FormLabel className="text-sm font-medium text-[#121215]">Sede activa</FormLabel>
              <span className="text-xs font-normal text-[#7d7d87]">
                Las sedes inactivas no estarán disponibles para selección.
              </span>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  </div>
);

export default BranchFormFields;
