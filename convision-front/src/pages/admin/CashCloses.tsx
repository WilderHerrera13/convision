import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { DatePicker } from '@/components/ui/date-picker';
import EntityTable from '@/components/ui/data-table/EntityTable';
import type { DataTableColumnDef } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageLayout from '@/components/layouts/PageLayout';
import cashRegisterCloseService, { CashClose } from '@/services/cashRegisterCloseService';
import { userService, User } from '@/services/userService';

interface CashCloseWithUser extends CashClose {
  user?: { id: number; name: string; last_name: string };
}

const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'border-gray-300 bg-[#f5f5f7] text-[#7d7d87]' },
  submitted: { label: 'Enviado', className: 'border-[#b57218] bg-[#fff6e3] text-[#b57218]' },
  approved: { label: 'Aprobado', className: 'border-[#228b52] bg-[#ebf5ef] text-[#228b52]' },
};

const AdminCashCloses: React.FC = () => {
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [userId, setUserId] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users-list'],
    queryFn: () => userService.getAll(),
  });

  const statsQuery = useQuery({
    queryKey: ['cash-closes-stats', dateFrom, dateTo, userId, status],
    queryFn: async () => {
      const params: Record<string, unknown> = { per_page: 200 };
      if (dateFrom) params.date_from = format(dateFrom, 'yyyy-MM-dd');
      if (dateTo) params.date_to = format(dateTo, 'yyyy-MM-dd');
      if (userId !== 'all') params.user_id = userId;
      if (status !== 'all') params.status = status;
      const resp = await cashRegisterCloseService.list(params);
      const items: CashCloseWithUser[] = resp?.data ?? (Array.isArray(resp) ? resp : []);
      return {
        total: items.length,
        pending: items.filter((c) => c.status === 'submitted').length,
        totalDiff: items.reduce((sum, c) => sum + (c.total_difference ?? 0), 0),
      };
    },
  });

  const columns: DataTableColumnDef<CashCloseWithUser>[] = [
    {
      accessorKey: 'close_date',
      header: 'Fecha',
      cell: ({ row }) => format(new Date(row.original.close_date + 'T12:00:00'), 'dd/MM/yyyy'),
    },
    {
      id: 'asesor',
      header: 'Asesor',
      cell: ({ row }) => {
        const u = row.original.user;
        return u ? `${u.name} ${u.last_name}` : '—';
      },
    },
    {
      accessorKey: 'total_registered',
      header: 'Total Registrado',
      cell: ({ row }) => formatCOP(row.original.total_registered ?? 0),
    },
    {
      accessorKey: 'total_counted',
      header: 'Total Contado',
      cell: ({ row }) => formatCOP(row.original.total_counted ?? 0),
    },
    {
      accessorKey: 'total_difference',
      header: 'Diferencia',
      cell: ({ row }) => {
        const diff = row.original.total_difference ?? 0;
        return (
          <span className={diff < 0 ? 'text-red-600 font-medium' : 'text-green-700 font-medium'}>
            {formatCOP(diff)}
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => {
        const cfg = STATUS_CONFIG[row.original.status] ?? STATUS_CONFIG.draft;
        return <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>;
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          className="bg-[#eff4ff] border-[#c5d3f8] text-[#3a71f7] hover:bg-blue-100"
          onClick={() => navigate(`/admin/cash-closes/${row.original.id}`)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const extraFilters = {
    date_from: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
    date_to: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
    user_id: userId !== 'all' ? userId : undefined,
    status: status !== 'all' ? status : undefined,
  };

  const fetcher = async ({ page, per_page }: { page: number; per_page: number }) => {
    const params: Record<string, unknown> = { page, per_page };
    if (extraFilters.date_from) params.date_from = extraFilters.date_from;
    if (extraFilters.date_to) params.date_to = extraFilters.date_to;
    if (extraFilters.user_id) params.user_id = extraFilters.user_id;
    if (extraFilters.status) params.status = extraFilters.status;
    const resp = await cashRegisterCloseService.list(params);
    return {
      data: resp?.data ?? (Array.isArray(resp) ? resp : []),
      last_page: resp?.meta?.last_page ?? resp?.last_page ?? 1,
    };
  };

  const stats = statsQuery.data;

  return (
    <PageLayout
      title="Cierres de Caja"
      subtitle="Revisión y aprobación de cierres diarios"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-blue-500">
            <CardContent className="pt-5 pb-4">
              <p className="text-sm text-muted-foreground">Cierres del Período</p>
              <p className="text-3xl font-bold text-blue-600">{stats?.total ?? '—'}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-amber-500" style={{ background: '#fff6e3' }}>
            <CardContent className="pt-5 pb-4">
              <p className="text-sm text-[#b57218]">Pendientes de Revisión</p>
              <p className="text-3xl font-bold text-[#b57218]">{stats?.pending ?? '—'}</p>
              <p className="text-xs text-[#b57218]">Requieren aprobación</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-red-500" style={{ background: '#ffeeed' }}>
            <CardContent className="pt-5 pb-4">
              <p className="text-sm text-[#b82626]">Diferencia Acumulada</p>
              <p className="text-3xl font-bold text-[#b82626]">
                {stats ? formatCOP(stats.totalDiff) : '—'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-end gap-4 flex-wrap">
          <div className="w-44">
            <p className="text-sm font-medium mb-1">Desde</p>
            <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="Fecha inicio" />
          </div>
          <div className="w-44">
            <p className="text-sm font-medium mb-1">Hasta</p>
            <DatePicker value={dateTo} onChange={setDateTo} placeholder="Fecha fin" />
          </div>
          <div className="w-44">
            <p className="text-sm font-medium mb-1">Asesor</p>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.name} {u.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40">
            <p className="text-sm font-medium mb-1">Estado</p>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="submitted">Enviado</SelectItem>
                <SelectItem value="approved">Aprobado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(dateFrom || dateTo || userId !== 'all' || status !== 'all') && (
            <Button
              variant="ghost"
              onClick={() => { setDateFrom(undefined); setDateTo(undefined); setUserId('all'); setStatus('all'); }}
            >
              Limpiar
            </Button>
          )}
        </div>

        <EntityTable<CashCloseWithUser>
          columns={columns}
          fetcher={fetcher}
          queryKeyBase="admin-cash-closes"
          enableSearch={false}
          extraFilters={extraFilters}
        />
      </div>
    </PageLayout>
  );
};

export default AdminCashCloses;
