import React, { useMemo, useState } from 'react';
import { Control, UseFormReturn, useWatch } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Building2, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Branch } from '@/services/branchService';
import type { AdminUserFormInput } from './userSchemas';

export type ViewBranchAssignment = {
  branch_id: number;
  name?: string;
  is_primary: boolean;
};

type Props = {
  mode: 'create' | 'edit' | 'view';
  control: Control<AdminUserFormInput>;
  form: UseFormReturn<AdminUserFormInput>;
  branches: Branch[];
  viewAssignments?: ViewBranchAssignment[];
};

const UserFormBranchesBlock: React.FC<Props> = ({ mode, control, form, branches, viewAssignments }) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const role = useWatch({ control, name: 'role' });
  const branchIds = useWatch({ control, name: 'branch_ids' }) ?? [];
  const primaryId = useWatch({ control, name: 'primary_branch_id' });

  const activeBranches = useMemo(() => branches.filter((b) => b.is_active), [branches]);

  const idToLabel = useMemo(() => {
    const m = new Map<number, string>();
    branches.forEach((b) => m.set(b.id, b.name));
    return m;
  }, [branches]);

  if (mode === 'view') {
    if (role !== 'specialist' && role !== 'receptionist') return null;
    const rows = viewAssignments?.length ? viewAssignments : [];
    return (
      <>
        <p className="mt-10 text-[13px] font-semibold text-[#0f0f12]">Sedes asignadas</p>
        <div className="mb-8 mt-3 h-px bg-[#f0f0f2]" />
        {rows.length === 0 ? (
          <p className="text-[12px] text-[#7d7d87]">Sin sedes asignadas.</p>
        ) : (
          <div className="flex min-h-[44px] flex-wrap items-center gap-2 rounded-md border border-[#ebebee] bg-white px-3 py-2">
            {rows.map((row) => (
              <div
                key={row.branch_id}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium text-[#121215]',
                  row.is_primary ? 'border-convision-primary bg-convision-light' : 'border-[#e5e5e9] bg-[#fafafb]',
                )}
              >
                {row.is_primary ? (
                  <Badge variant="outline" className="h-5 border-convision-primary px-1.5 text-[9px] text-convision-primary">
                    Principal
                  </Badge>
                ) : null}
                <span>{row.name || idToLabel.get(row.branch_id) || `Sede ${row.branch_id}`}</span>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-[11px] text-[#b4b4bc]">
          Sedes donde el usuario puede operar según su rol.
        </p>
      </>
    );
  }

  if (role !== 'specialist' && role !== 'receptionist') return null;

  const availableToAdd = activeBranches.filter((b) => !branchIds.includes(b.id));

  const removeBranch = (id: number) => {
    const next = branchIds.filter((x: number) => x !== id);
    form.setValue('branch_ids', next, { shouldValidate: true, shouldDirty: true });
    if (primaryId === id) {
      form.setValue('primary_branch_id', next.length ? next[0] : null, { shouldValidate: true, shouldDirty: true });
    }
  };

  const addBranch = (id: number) => {
    if (branchIds.includes(id)) return;
    const next = [...branchIds, id];
    form.setValue('branch_ids', next, { shouldValidate: true, shouldDirty: true });
    if (next.length === 1) {
      form.setValue('primary_branch_id', id, { shouldValidate: true, shouldDirty: true });
    }
  };

  const setPrimary = (id: number) => {
    form.setValue('primary_branch_id', id, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <>
      <p className="mt-8 text-[13px] font-semibold text-[#0f0f12]">Sedes asignadas *</p>
      <div className="mb-3 mt-3 h-px bg-[#f0f0f2]" />
      <FormField
        control={control}
        name="branch_ids"
        render={() => (
          <FormItem>
            <FormLabel className="sr-only">Sedes</FormLabel>
            <FormControl>
              <div className="flex min-h-[44px] flex-wrap items-center gap-2 rounded-md border border-[#ebebee] bg-white px-3 py-2">
                <Building2 className="h-4 w-4 shrink-0 text-[#7d7d87]" />
                {branchIds.map((bid: number) => {
                  const label = idToLabel.get(bid) || `Sede ${bid}`;
                  const isPrimary = bid === primaryId;
                  return (
                    <div
                      key={bid}
                      className={cn(
                        'inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium text-[#121215]',
                        isPrimary ? 'border-convision-primary bg-convision-light' : 'border-[#e5e5e9] bg-[#fafafb]',
                      )}
                    >
                      {isPrimary ? (
                        <Badge
                          variant="outline"
                          className="h-5 shrink-0 border-convision-primary px-1.5 text-[9px] text-convision-primary"
                        >
                          Principal
                        </Badge>
                      ) : null}
                      <button
                        type="button"
                        className="max-w-[160px] truncate text-left hover:underline"
                        onClick={() => setPrimary(bid)}
                      >
                        {label}
                      </button>
                      <button
                        type="button"
                        className="flex size-6 shrink-0 items-center justify-center rounded-full text-[#7d7d87] hover:bg-[#f0f0f2]"
                        onClick={() => removeBranch(bid)}
                        aria-label={`Quitar ${label}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
                {availableToAdd.length > 0 ? (
                  <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px] text-convision-primary">
                        + Agregar
                        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-3" align="start">
                      <p className="mb-2 text-[11px] font-medium text-[#121215]">Seleccionar sede</p>
                      <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                        {availableToAdd.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            className="w-full rounded-md px-2 py-2 text-left text-[12px] text-[#121215] hover:bg-[#fafafb]"
                            onClick={() => {
                              addBranch(b.id);
                              setPickerOpen(false);
                            }}
                          >
                            {b.name}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : null}
              </div>
            </FormControl>
            <FormMessage className="text-[10px]" />
          </FormItem>
        )}
      />
      {form.formState.errors.primary_branch_id?.message ? (
        <p className="mt-1 text-[10px] text-destructive">{String(form.formState.errors.primary_branch_id.message)}</p>
      ) : null}
      <p className="mt-1 text-[11px] text-[#b4b4bc]">
        Sedes donde el usuario podrá operar. Los cambios aplican al guardar.
      </p>
    </>
  );
};

export default UserFormBranchesBlock;
