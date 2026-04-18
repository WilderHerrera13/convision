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
import { Mail, Phone, IdCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import UserFormAccessBlock from './UserFormAccessBlock';
import type { AdminUserFormInput } from './userSchemas';

type Props = {
  mode: 'create' | 'edit' | 'view';
  form: UseFormReturn<AdminUserFormInput>;
  onSubmit: (v: AdminUserFormInput) => void | Promise<void>;
};

const roInput = 'cursor-default bg-[#f5f5f6] text-[#121215]';

const UserFormFields: React.FC<Props> = ({ mode, form, onSubmit }) => {
  const view = mode === 'view';
  return (
  <Form {...form}>
    <form
      id="user-admin-form"
      onSubmit={view ? (e) => e.preventDefault() : form.handleSubmit(onSubmit)}
      className="space-y-0 bg-white px-8 py-8"
    >
      <p className="text-[13px] font-semibold text-[#0f0f12]">Datos personales</p>
      <div className="mb-8 mt-3 h-px bg-[#f0f0f2]" />
      <div className="grid gap-x-6 gap-y-6 md:grid-cols-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="space-y-2.5">
              <FormLabel className="text-[11px] font-medium text-[#121215]">Nombre *</FormLabel>
              <FormControl>
                <Input
                  readOnly={view}
                  placeholder="Ej. Carlos"
                  className={cn('h-9 rounded-md', view && roInput)}
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="last_name"
          render={({ field }) => (
            <FormItem className="space-y-2.5">
              <FormLabel className="text-[11px] font-medium text-[#121215]">Apellido *</FormLabel>
              <FormControl>
                <Input
                  readOnly={view}
                  placeholder="Ej. Andrade"
                  className={cn('h-9 rounded-md', view && roInput)}
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="identification"
          render={({ field }) => (
            <FormItem className="space-y-2.5">
              <FormLabel className="flex items-center gap-1.5 text-[11px] font-medium text-[#121215]">
                <IdCard className="h-3.5 w-3.5" />
                Número de identificación *
              </FormLabel>
              <FormControl>
                <Input
                  readOnly={view}
                  placeholder="Ej. 12345678"
                  className={cn('h-9 rounded-md', view && roInput)}
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem className="space-y-2.5">
              <FormLabel className="flex items-center gap-1.5 text-[11px] font-medium text-[#121215]">
                <Phone className="h-3.5 w-3.5" />
                Teléfono
              </FormLabel>
              <FormControl>
                <Input
                  readOnly={view}
                  placeholder="Ej. +57 311 234 5678"
                  className={cn('h-9 rounded-md', view && roInput)}
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem className="mt-6 space-y-2.5">
            <FormLabel className="flex items-center gap-1.5 text-[11px] font-medium text-[#121215]">
              <Mail className="h-3.5 w-3.5" />
              Correo electrónico *
            </FormLabel>
            <FormControl>
              <Input
                readOnly={view}
                placeholder="Ej. usuario@convision.com"
                type="email"
                className={cn('h-9 rounded-md', view && roInput)}
                {...field}
              />
            </FormControl>
            <FormMessage className="text-[10px]" />
          </FormItem>
        )}
      />

      <div className="pt-14">
        <UserFormAccessBlock mode={mode} control={form.control} />
      </div>
    </form>
  </Form>
  );
};

export default UserFormFields;
