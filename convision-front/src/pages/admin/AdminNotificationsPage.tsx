import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Filter } from 'lucide-react';
import { toast } from 'sonner';
import {
  adminNotificationService,
  type AdminNotificationKind,
  type AdminNotificationScope,
} from '@/services/adminNotificationService';
import { AdminNotificationRow } from '@/components/admin/notifications/AdminNotificationRow';
import { AdminNotificationsEmpty } from '@/components/admin/notifications/AdminNotificationsEmpty';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const scopeLabels: Record<AdminNotificationScope, string> = {
  all: 'Todas',
  unread: 'No leídas',
  archived: 'Archivadas',
};

const AdminNotificationsPage: React.FC = () => {
  const qc = useQueryClient();
  const [scope, setScope] = useState<AdminNotificationScope>('all');
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState<AdminNotificationKind | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const listQuery = useQuery({
    queryKey: ['admin-notifications-list', scope, page, kind],
    queryFn: () => adminNotificationService.list({ scope, page, per_page: 15, kind }),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-notifications-list'] });
    void qc.invalidateQueries({ queryKey: ['admin-notifications-summary'] });
  };

  const withBusy = async (id: number, fn: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await fn();
      invalidate();
    } catch {
      toast.error('No se pudo completar la acción.');
    } finally {
      setBusyId(null);
    }
  };

  const markAll = useMutation({
    mutationFn: () => adminNotificationService.markAllRead(),
    onSuccess: (n) => {
      toast.success(n > 0 ? `Se marcaron ${n} como leídas.` : 'No había notificaciones sin leer.');
      invalidate();
    },
    onError: () => toast.error('No se pudo marcar todo como leído.'),
  });

  const counts = listQuery.data?.counts;
  const meta = listQuery.data?.meta;
  const rows = listQuery.data?.data ?? [];

  const resetFilters = () => {
    setKind(null);
    setScope('all');
    setPage(1);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-convision-background">
      <div className="border-b border-convision-border-subtle bg-white px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(['all', 'unread', 'archived'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setScope(s);
                  setPage(1);
                }}
                className={`flex h-8 items-center gap-2 rounded-lg px-3 text-[13px] font-medium transition-colors ${
                  scope === s
                    ? 'bg-convision-light text-convision-primary'
                    : 'bg-convision-background text-convision-text-secondary hover:text-convision-text'
                }`}
              >
                {scopeLabels[s]}
                <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[11px] font-semibold text-convision-text-secondary">
                  {s === 'all' ? counts?.all ?? '—' : s === 'unread' ? counts?.unread ?? '—' : counts?.archived ?? '—'}
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-convision-text"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
            >
              Marcar todas como leídas
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="gap-2 border-convision-border">
                  <Filter className="size-3.5" />
                  Filtrar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuRadioGroup
                  value={kind ?? 'all'}
                  onValueChange={(v) => {
                    setKind(v === 'all' ? null : (v as AdminNotificationKind));
                    setPage(1);
                  }}
                >
                  <DropdownMenuRadioItem value="all">Todos los tipos</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">Sistema</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="operational">Operativa</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="message">Mensaje</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        {listQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[88px] animate-pulse rounded-lg border border-convision-border-subtle bg-white" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="overflow-hidden rounded-lg border border-convision-border-subtle bg-white shadow-sm">
            <AdminNotificationsEmpty
              counts={counts}
              scope={scope}
              kind={kind}
              onResetFilters={resetFilters}
              onGoArchived={() => {
                setScope('archived');
                setPage(1);
              }}
            />
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-convision-border-subtle bg-white shadow-sm">
            {rows.map((row) => (
              <AdminNotificationRow
                key={row.id}
                item={row}
                busyId={busyId}
                onMarkRead={(id) => void withBusy(id, () => adminNotificationService.markRead(id))}
                onMarkUnread={(id) => void withBusy(id, () => adminNotificationService.markUnread(id))}
                onArchive={(id) => void withBusy(id, () => adminNotificationService.archive(id))}
                onUnarchive={(id) => void withBusy(id, () => adminNotificationService.unarchive(id))}
                onDelete={(id) => void withBusy(id, () => adminNotificationService.remove(id))}
              />
            ))}
          </div>
        )}

        {meta && meta.last_page > 1 ? (
          <div className="mt-4 flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || listQuery.isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <span className="text-[12px] text-convision-text-secondary">
              Página {meta.current_page} de {meta.last_page}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= meta.last_page || listQuery.isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AdminNotificationsPage;
