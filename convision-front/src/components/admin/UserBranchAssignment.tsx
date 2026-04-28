import React from 'react';
import { Loader2 } from 'lucide-react';
import SearchableCombobox, { ComboboxOption } from '@/components/ui/SearchableCombobox';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { User } from '@/services/userService';
import type { Branch, UserBranchAssignment } from '@/services/branchService';

interface UserBranchAssignmentProps {
  users: User[];
  branches: Branch[];
  isLoading: boolean;
  onSubmit: (userId: number, assignments: UserBranchAssignment[]) => void;
}

const UserBranchAssignment: React.FC<UserBranchAssignmentProps> = ({ users, branches, isLoading, onSubmit }) => {
  const [selectedUserId, setSelectedUserId] = React.useState<string>('');
  const [selectedBranchIds, setSelectedBranchIds] = React.useState<Set<number>>(new Set());
  const [primaryBranchId, setPrimaryBranchId] = React.useState<number | null>(null);

  const userOptions: ComboboxOption[] = React.useMemo(
    () =>
      users.map((user) => ({
        value: String(user.id),
        label: `${user.name} ${user.last_name}`.trim(),
        sublabel: `${user.email} · ${user.role}`,
      })),
    [users],
  );

  const handleToggleBranch = (branchId: number, checked: boolean) => {
    setSelectedBranchIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(branchId);
      } else {
        next.delete(branchId);
      }
      if (!next.has(primaryBranchId ?? -1)) {
        setPrimaryBranchId(next.size > 0 ? Array.from(next)[0] : null);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    const userId = Number(selectedUserId);
    if (!userId || selectedBranchIds.size === 0) {
      return;
    }
    const assignments: UserBranchAssignment[] = Array.from(selectedBranchIds).map((branchId) => ({
      branch_id: branchId,
      is_primary: branchId === primaryBranchId,
    }));
    onSubmit(userId, assignments);
  };

  return (
    <div className="space-y-4 rounded-lg border border-[#e5e5e9] bg-white p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-[#121215]">Asignación de usuarios a sedes</h3>
        <p className="text-xs text-[#7d7d87]">Selecciona un usuario y define las sedes habilitadas.</p>
      </div>

      <div className="space-y-2">
        <Label>Usuario</Label>
        <SearchableCombobox
          options={userOptions}
          value={selectedUserId}
          onChange={setSelectedUserId}
          placeholder="Seleccione un usuario"
          searchPlaceholder="Buscar usuario..."
        />
      </div>

      <div className="space-y-2">
        <Label>Sedes disponibles</Label>
        <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-[#e5e5e9] p-3">
          {branches.map((branch) => {
            const checked = selectedBranchIds.has(branch.id);
            const isPrimary = primaryBranchId === branch.id;
            return (
              <div key={branch.id} className="flex items-center justify-between rounded-md border border-[#f0f0f3] px-3 py-2">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => handleToggleBranch(branch.id, Boolean(value))}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-[#121215]">{branch.name}</span>
                    <span className="text-xs text-[#7d7d87]">{branch.city || 'Sin ciudad'}</span>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={isPrimary ? 'default' : 'outline'}
                  disabled={!checked}
                  onClick={() => setPrimaryBranchId(branch.id)}
                  className="h-7 text-xs"
                >
                  {isPrimary ? 'Principal' : 'Marcar principal'}
                </Button>
              </div>
            );
          })}
          {branches.length === 0 && <p className="text-xs text-[#7d7d87]">No hay sedes disponibles.</p>}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={handleSubmit} disabled={isLoading || !selectedUserId || selectedBranchIds.size === 0}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            'Guardar asignaciones'
          )}
        </Button>
      </div>
    </div>
  );
};

export default UserBranchAssignment;
