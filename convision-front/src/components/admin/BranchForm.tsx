import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const branchSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  address: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Correo inválido').or(z.literal('')),
  is_active: z.boolean(),
});

export type BranchFormValues = z.infer<typeof branchSchema>;

interface BranchFormProps {
  initialValues?: BranchFormValues;
  isSubmitting: boolean;
  submitLabel: string;
  onSubmit: (values: BranchFormValues) => void;
  onCancel: () => void;
}

const defaultValues: BranchFormValues = {
  name: '',
  address: '',
  city: '',
  phone: '',
  email: '',
  is_active: true,
};

const BranchForm: React.FC<BranchFormProps> = ({
  initialValues,
  isSubmitting,
  submitLabel,
  onSubmit,
  onCancel,
}) => {
  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: initialValues ?? defaultValues,
  });

  React.useEffect(() => {
    form.reset(initialValues ?? defaultValues);
  }, [form, initialValues]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="branch-name">Nombre</Label>
        <Input id="branch-name" {...form.register('name')} placeholder="Nombre de la sede" />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="branch-city">Ciudad</Label>
          <Input id="branch-city" {...form.register('city')} placeholder="Ciudad" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="branch-phone">Teléfono</Label>
          <Input id="branch-phone" {...form.register('phone')} placeholder="Teléfono" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="branch-address">Dirección</Label>
        <Input id="branch-address" {...form.register('address')} placeholder="Dirección" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="branch-email">Correo</Label>
        <Input id="branch-email" {...form.register('email')} placeholder="correo@dominio.com" />
        {form.formState.errors.email && (
          <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between rounded-md border border-[#e5e5e9] px-3 py-2">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-[#121215]">Sede activa</span>
          <span className="text-xs text-[#7d7d87]">Las sedes inactivas no estarán disponibles para selección.</span>
        </div>
        <Switch
          checked={form.watch('is_active')}
          onCheckedChange={(checked) => form.setValue('is_active', checked, { shouldDirty: true })}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
};

export default BranchForm;
