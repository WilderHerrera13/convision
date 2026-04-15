import React, { useMemo } from 'react';
import { Eye } from 'lucide-react';
import type { DataTableColumnDef } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DailyActivityReport } from '@/services/dailyActivityReportService';
import { deriveEstado, formatDetalle, formatFechaHora } from '@/pages/admin/dailyReportsUtils';

export type DailyReportWithUser = DailyActivityReport & {
  user?: { id: number; name: string; last_name?: string };
};

export function useAdminDailyReportColumns(
  roleByUserId: Map<number, string>,
  onOpenDetail: (row: DailyReportWithUser) => void,
): DataTableColumnDef<DailyReportWithUser>[] {
  return useMemo(
    () => [
      {
        id: 'fecha_hora',
        header: 'Fecha / hora',
        type: 'custom',
        enableSorting: false,
        className: 'w-[168px] min-w-[140px]',
        cell: (item) => (
          <span className="text-[13px] font-normal text-[#7d7d87]">{formatFechaHora(item)}</span>
        ),
      },
      {
        id: 'asesor',
        header: 'Asesor',
        type: 'custom',
        enableSorting: false,
        className: 'w-[220px] min-w-[180px]',
        cell: (item) => {
          const u = item.user;
          if (!u) return <span className="text-[13px] text-[#121215] font-semibold">—</span>;
          const role = roleByUserId.get(u.id) ?? '—';
          return (
            <span className="text-[13px] font-semibold text-[#121215]">
              {u.name} {u.last_name} · {role}
            </span>
          );
        },
      },
      {
        id: 'detalle',
        header: 'Detalle',
        type: 'custom',
        enableSorting: false,
        className: 'min-w-[200px] w-auto',
        cell: (item) => (
          <span className="break-words text-[13px] text-[#7d7d87]">{formatDetalle(item)}</span>
        ),
      },
      {
        id: 'estado',
        header: 'Estado',
        type: 'custom',
        enableSorting: false,
        className: 'w-[136px]',
        cell: (item) => {
          const cfg = deriveEstado(item);
          return (
            <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.className}`}>
              {cfg.label}
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        header: 'Acción',
        type: 'custom',
        enableSorting: false,
        headerClassName: 'font-normal',
        className: 'w-[132px]',
        cell: (item) => (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <Button
              size="icon"
              variant="outline"
              className="size-8 rounded-[6px] border-[#c5d3f8] bg-[#eff4ff] text-[#3a71f7] hover:bg-blue-100"
              aria-label="Ver detalle del reporte"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetail(item);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [roleByUserId, onOpenDetail],
  );
}
