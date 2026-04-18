import React from 'react';
import { NavigateFunction } from 'react-router-dom';
import { Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTableColumnDef } from '@/components/ui/data-table';
import type { Supplier } from '@/services/supplierService';

export function buildSuppliersTableColumns(
  navigate: NavigateFunction,
  setDeleteSupplier: (row: Supplier) => void,
): DataTableColumnDef<Supplier>[] {
  return [
    {
      id: 'name',
      header: 'Nombre',
      type: 'text',
      accessorKey: 'name',
      enableSorting: false,
      className: 'max-w-[240px] text-[#7d7d87]',
      cell: (row) => <span className="text-[13px] font-normal text-[#7d7d87]">{row.name}</span>,
    },
    {
      id: 'legal_representative',
      header: 'Contacto',
      type: 'text',
      accessorKey: 'legal_representative',
      enableSorting: false,
      className: 'max-w-[180px]',
      cell: (row) => (
        <span className="text-[13px] font-semibold text-[#121215]">{row.legal_representative?.trim() || '—'}</span>
      ),
    },
    {
      id: 'phone',
      header: 'Teléfono',
      type: 'text',
      accessorKey: 'phone',
      enableSorting: false,
      className: 'max-w-[176px] text-[#7d7d87]',
      cell: (row) => <span className="text-[13px]">{row.phone || '—'}</span>,
    },
    {
      id: 'email',
      header: 'Correo',
      type: 'text',
      accessorKey: 'email',
      enableSorting: false,
      className: 'max-w-[228px] text-[#7d7d87]',
      cell: (row) => <span className="text-[13px]">{row.email || '—'}</span>,
    },
    {
      id: 'status',
      header: 'Estado',
      type: 'text',
      accessorKey: 'id',
      enableSorting: false,
      className: 'w-[136px]',
      cell: () => (
        <span className="inline-flex rounded-full bg-[#ebf5ef] px-2.5 py-0.5 text-[11px] font-semibold text-[#228b52]">
          Activo
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'text',
      accessorKey: 'id',
      enableSorting: false,
      headerClassName: 'text-right',
      className: 'w-[196px] min-w-[108px]',
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
              navigate(`/admin/suppliers/${row.id}`);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 rounded-[6px] border border-[#e0e0e4] bg-[#f5f5f7] p-0 hover:bg-[#ebebef]"
            title="Editar"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/suppliers/${row.id}/edit`);
            }}
          >
            <span className="grid grid-cols-2 gap-x-1 gap-y-0.5 place-items-center" aria-hidden>
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i} className="size-[2.5px] shrink-0 rounded-full bg-[#3a71f7]" />
              ))}
            </span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 rounded-[6px] border border-[#f5baba] bg-[#fff0f0] p-0 text-[#b82626] hover:bg-[#ffe8e8]"
            title="Eliminar"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteSupplier(row);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
}
