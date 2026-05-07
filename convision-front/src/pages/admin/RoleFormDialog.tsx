import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { ChevronDown } from 'lucide-react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { AccordionContent, AccordionItem } from '@/components/ui/accordion';
import rolesApi, { Role, Permission, CreateRoleInput } from '@/services/roles';

const roleSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  description: z.string().min(1, 'Descripción es requerida'),
  permission_ids: z.array(z.number()),
});

type RoleFormValues = z.infer<typeof roleSchema>;

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: Role | null;
  onSubmit: (data: CreateRoleInput) => void;
  isPending: boolean;
}

function moduleLabel(mod: string) {
  return mod.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function groupByModule(permissions: Permission[]): Record<string, Permission[]> {
  return permissions.reduce((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {} as Record<string, Permission[]>);
}

const RoleFormDialog: React.FC<RoleFormDialogProps> = ({
  open, onOpenChange, role, onSubmit, isPending,
}) => {
  const isEditing = !!role;

  const { data: permissions = [], isLoading: loadingPerms } = useQuery({
    queryKey: ['permissions'],
    queryFn: rolesApi.getPermissions,
    staleTime: 5 * 60 * 1000,
  });

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: '', description: '', permission_ids: [] },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: role?.name ?? '',
        description: role?.description ?? '',
        permission_ids: role?.permissions?.map(p => p.id) ?? [],
      });
    }
  }, [open, role]);

  const permIds = form.watch('permission_ids');
  const grouped = groupByModule(permissions);

  const togglePermission = (id: number, checked: boolean) => {
    const current = form.getValues('permission_ids');
    form.setValue('permission_ids', checked ? [...current, id] : current.filter(p => p !== id), { shouldDirty: true });
  };

  const toggleModule = (modPerms: Permission[], checked: boolean) => {
    const current = form.getValues('permission_ids');
    const modIds = modPerms.map(p => p.id);
    if (checked) {
      form.setValue('permission_ids', [...new Set([...current, ...modIds])], { shouldDirty: true });
    } else {
      form.setValue('permission_ids', current.filter(id => !modIds.includes(id)), { shouldDirty: true });
    }
  };

  const handleSubmit = (values: RoleFormValues) => {
    onSubmit({ name: values.name, description: values.description, permission_ids: values.permission_ids });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar rol' : 'Nuevo rol'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4 flex-1 min-h-0">
          <div className="space-y-2">
            <Label htmlFor="role-name">Nombre</Label>
            <Input id="role-name" {...form.register('name')} placeholder="Nombre del rol" />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="role-desc">Descripción</Label>
            <Input id="role-desc" {...form.register('description')} placeholder="Descripción del rol" />
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1 flex-1 min-h-0">
            <Label>Permisos</Label>
            {loadingPerms ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Cargando permisos...
              </div>
            ) : (
              <div className="overflow-y-auto border rounded-md">
                <AccordionPrimitive.Root type="multiple" className="w-full">
                  {Object.entries(grouped).map(([mod, modPerms]) => {
                    const allChecked = modPerms.every(p => permIds.includes(p.id));
                    const someChecked = modPerms.some(p => permIds.includes(p.id));
                    return (
                      <AccordionItem key={mod} value={mod} className="border-b last:border-b-0">
                        <AccordionPrimitive.Header className="flex items-center px-4 py-2 gap-2">
                          <div onClick={e => e.stopPropagation()}>
                            <Checkbox
                              checked={allChecked ? true : someChecked ? 'indeterminate' : false}
                              onCheckedChange={(checked) => toggleModule(modPerms, !!checked)}
                            />
                          </div>
                          <AccordionPrimitive.Trigger className="flex flex-1 items-center justify-between text-sm font-medium [&[data-state=open]>svg]:rotate-180">
                            <span>{moduleLabel(mod)}</span>
                            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                          </AccordionPrimitive.Trigger>
                        </AccordionPrimitive.Header>
                        <AccordionContent className="px-4 pb-3">
                          <div className="flex flex-col gap-2 pl-6">
                            {modPerms.map(perm => (
                              <div key={perm.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`perm-${perm.id}`}
                                  checked={permIds.includes(perm.id)}
                                  onCheckedChange={(checked) => togglePermission(perm.id, !!checked)}
                                />
                                <Label htmlFor={`perm-${perm.id}`} className="font-normal text-sm cursor-pointer">
                                  {perm.action}
                                  {perm.description && (
                                    <span className="ml-1 text-muted-foreground text-xs">— {perm.description}</span>
                                  )}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </AccordionPrimitive.Root>
              </div>
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || loadingPerms}>
              {isPending ? <><Loader2 className="size-4 mr-2 animate-spin" />Guardando...</> : isEditing ? 'Guardar cambios' : 'Crear rol'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RoleFormDialog;
