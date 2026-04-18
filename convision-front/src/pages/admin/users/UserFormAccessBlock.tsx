import React from 'react';
import { Control } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Lock, UserCog } from 'lucide-react';
import type { AdminUserFormInput } from './userSchemas';

type Props = {
  mode: 'create' | 'edit' | 'view';
  control: Control<AdminUserFormInput>;
};

const UserFormAccessBlock: React.FC<Props> = ({ mode, control }) => (
  <>
    <p className="text-[13px] font-semibold text-[#0f0f12]">Acceso al sistema</p>
    <div className="mb-8 mt-3 h-px bg-[#f0f0f2]" />

    {mode === 'view' ? (
      <>
        <p className="mt-4 text-[12px] text-[#7d7d87]">La contraseña no se muestra en vista de solo lectura.</p>
        <FormField
          control={control}
          name="role"
          render={({ field }) => (
            <FormItem className="mt-6 max-w-[350px] space-y-2.5">
              <FormLabel className="flex items-center gap-1.5 text-[11px] font-medium text-[#121215]">
                <UserCog className="h-3.5 w-3.5" />
                Tipo de usuario *
              </FormLabel>
              <Select value={field.value} onValueChange={field.onChange} disabled>
                <FormControl>
                  <SelectTrigger className="h-9 cursor-default rounded-md bg-[#f5f5f6]">
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="specialist">Especialista</SelectItem>
                  <SelectItem value="receptionist">Recepcionista</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )}
        />
        <p className="mt-3 text-[11px] text-[#b4b4bc]">Define los permisos y accesos del usuario en la plataforma</p>
      </>
    ) : mode === 'create' ? (
      <div className="grid gap-x-6 gap-y-6 md:grid-cols-2">
        <FormField
          control={control}
          name="password"
          render={({ field }) => (
            <FormItem className="space-y-2.5">
              <FormLabel className="flex items-center gap-1.5 text-[11px] font-medium text-[#121215]">
                <Lock className="h-3.5 w-3.5" />
                Contraseña *
              </FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" className="h-9 rounded-md" {...field} />
              </FormControl>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="confirm_password"
          render={({ field }) => (
            <FormItem className="space-y-2.5">
              <FormLabel className="text-[11px] font-medium text-[#121215]">Confirmar contraseña *</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" className="h-9 rounded-md" {...field} />
              </FormControl>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )}
        />
      </div>
    ) : (
      <>
        <p className="mt-2 text-[13px] font-semibold text-[#0f0f12]">Cambiar contraseña (opcional)</p>
        <div className="mb-4 mt-3 h-px bg-[#f0f0f2]" />
        <div className="grid gap-x-6 gap-y-6 md:grid-cols-2">
          <FormField
            control={control}
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-2.5">
                <FormLabel className="flex items-center gap-1.5 text-[11px] font-medium text-[#121215]">
                  <Lock className="h-3.5 w-3.5" />
                  Nueva contraseña
                </FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Opcional" className="h-9 rounded-md" {...field} />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="confirm_password"
            render={({ field }) => (
              <FormItem className="space-y-2.5">
                <FormLabel className="text-[11px] font-medium text-[#121215]">Confirmar nueva contraseña</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Opcional" className="h-9 rounded-md" {...field} />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground">
          Déjalo vacío si no deseas cambiar la contraseña del usuario
        </p>
      </>
    )}

    {mode !== 'view' ? (
      <>
        <FormField
          control={control}
          name="role"
          render={({ field }) => (
            <FormItem className="mt-8 max-w-[350px] space-y-2.5">
              <FormLabel className="flex items-center gap-1.5 text-[11px] font-medium text-[#121215]">
                <UserCog className="h-3.5 w-3.5" />
                Tipo de usuario *
              </FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-9 rounded-md">
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="specialist">Especialista</SelectItem>
                  <SelectItem value="receptionist">Recepcionista</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )}
        />
        <p className="mt-3 text-[11px] text-[#b4b4bc]">Define los permisos y accesos del usuario en la plataforma</p>
      </>
    ) : null}
  </>
);

export default UserFormAccessBlock;
