import React from 'react';
import { Bell } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import type {
  AdminNotificationCounts,
  AdminNotificationKind,
  AdminNotificationScope,
} from '@/services/adminNotificationService';

export type AdminNotificationsEmptyProps = {
  counts: AdminNotificationCounts | undefined;
  scope: AdminNotificationScope;
  kind: AdminNotificationKind | null;
  onResetFilters: () => void;
  onGoArchived: () => void;
};

export const AdminNotificationsEmpty: React.FC<AdminNotificationsEmptyProps> = ({
  counts,
  scope,
  kind,
  onResetFilters,
  onGoArchived,
}) => {
  const c = counts ?? { all: 0, unread: 0, archived: 0 };
  const hasAny = c.all + c.archived > 0;

  if (!hasAny) {
    return (
      <EmptyState
        variant="default"
        title="No hay notificaciones"
        description="Cuando el sistema tenga avisos o reportes, aparecerán aquí."
        leadingIcon={Bell}
        accentColor="#3a71f7"
        className="py-14"
      />
    );
  }

  if (scope === 'all' && !kind && c.all === 0 && c.archived > 0) {
    return (
      <EmptyState
        variant="default"
        title="Sin notificaciones en la bandeja"
        description="Tus notificaciones activas están vacías. Revisa la pestaña Archivadas si necesitas consultar avisos anteriores."
        actionLabel="Ver archivadas"
        leadingIcon={Bell}
        accentColor="#3a71f7"
        className="py-14"
        onAction={onGoArchived}
      />
    );
  }

  if (scope === 'archived' && c.archived === 0) {
    return (
      <EmptyState
        variant="default"
        title="Sin notificaciones archivadas"
        description="Aún no archivas ninguna notificación. Las podrás archivar desde la bandeja principal."
        leadingIcon={Bell}
        accentColor="#3a71f7"
        className="py-14"
      />
    );
  }

  return (
    <EmptyState
      variant="table-filter"
      title="Sin resultados"
      description="No hay notificaciones que coincidan con la pestaña o el filtro seleccionado."
      leadingIcon={Bell}
      accentColor="#3a71f7"
      className="py-14"
      onAction={onResetFilters}
    />
  );
};
