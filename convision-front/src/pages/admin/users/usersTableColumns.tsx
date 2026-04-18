import React from 'react';
import { NavigateFunction } from 'react-router-dom';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTableColumnDef } from '@/components/ui/data-table';
import type { User } from '@/services/userService';

const roleLabel: Record<User['role'], string> = {
  admin: 'Administrador',
  specialist: 'Especialista',
  receptionist: 'Recepcionista',
};

const roleShortLabel: Record<User['role'], string> = {
  admin: 'Admin',
  specialist: 'Especialista',
  receptionist: 'Recepcionista',
};

const estadoPillClass: Record<User['role'], string> = {
  admin: 'bg-[#eff1ff] px-2.5 py-0.5 text-[11px] font-semibold text-[#3a71f7]',
  specialist: 'bg-[#e5f8ef] px-2.5 py-0.5 text-[11px] font-semibold text-[#0f8f64]',
  receptionist: 'bg-[#f1ebff] px-2.5 py-0.5 text-[11px] font-semibold text-[#8753ef]',
};

export function buildUsersTableColumns(
  navigate: NavigateFunction,
  authUserId: number | undefined,
  setDeleteUser: (u: User) => void,
): DataTableColumnDef<User>[] {
  return [
    {
      id: 'name',
      header: 'Nombre',
      type: 'text',
      accessorKey: 'name',
      enableSorting: false,
      className: 'max-w-[240px]',
      cell: (row) => (
        <span className="font-semibold text-[#121215]">{[row.name, row.last_name].filter(Boolean).join(' ')}</span>
      ),
    },
    {
      id: 'email',
      header: 'Correo electrónico',
      type: 'text',
      accessorKey: 'email',
      enableSorting: false,
      className: 'max-w-[320px] text-[#7d7d87]',
    },
    {
      id: 'role',
      header: 'Rol',
      type: 'text',
      accessorKey: 'role',
      enableSorting: false,
      className: 'max-w-[160px] text-[#7d7d87]',
      cell: (row) => <span className="text-[13px] text-[#7d7d87]">{roleShortLabel[row.role]}</span>,
    },
    {
      id: 'estado',
      header: 'Estado',
      type: 'text',
      accessorKey: 'role',
      enableSorting: false,
      className: 'max-w-[140px]',
      cell: (row) => (
        <span className={`inline-flex rounded-full ${estadoPillClass[row.role]}`}>{roleLabel[row.role]}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'text',
      accessorKey: 'id',
      enableSorting: false,
      headerClassName: 'text-right',
      className: 'w-[120px] min-w-[108px]',
      cell: (row) => (
        <div className="flex justify-end gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 rounded-[6px] border border-[#c5d3f8] bg-[#eff4ff] p-0 text-[#3a71f7] hover:bg-[#e8eeff]"
            title="Ver"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/users/${row.id}`);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 rounded-[6px] border border-[#e0e0e4] bg-[#f5f5f7] p-0 text-[#3a71f7] hover:bg-[#ebebef]"
            title="Editar"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/users/${row.id}/edit`);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 rounded-[6px] border border-[#f5baba] bg-[#fff0f0] p-0 text-[#b82626] hover:bg-[#ffe8e8] disabled:opacity-40"
            title="Eliminar"
            disabled={authUserId === row.id}
            onClick={(e) => {
              e.stopPropagation();
              setDeleteUser(row);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
}

export { roleLabel };
