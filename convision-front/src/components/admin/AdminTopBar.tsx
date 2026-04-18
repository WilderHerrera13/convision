import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { adminNotificationService } from '@/services/adminNotificationService';
import { AdminNotificationBellButton } from '@/components/admin/AdminNotificationBellButton';
import { useAuth } from '@/contexts/AuthContext';

export const AdminTopBar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isNotifications = location.pathname.startsWith('/admin/notifications');

  const todayLine = useMemo(
    () => format(new Date(), "EEEE d 'de' MMMM 'de' yyyy", { locale: es }),
    [],
  );

  const { data: summary } = useQuery({
    queryKey: ['admin-notifications-summary'],
    queryFn: () => adminNotificationService.getSummary(),
    enabled: user?.role === 'admin',
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  if (user?.role !== 'admin') {
    return null;
  }

  const unread = summary?.unread ?? 0;
  const archived = summary?.archived ?? 0;

  return (
    <header className="flex h-[60px] shrink-0 items-center border-b border-convision-border-subtle bg-white px-6">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {isNotifications && (
          <>
            <div className="flex items-center gap-1 text-[11px] text-convision-text-secondary">
              <span>Admin</span>
              <span>/</span>
              <span className="text-convision-text">Notificaciones</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-[15px] font-semibold leading-tight text-convision-text">Notificaciones</h1>
              <span className="text-[11px] text-convision-text-secondary">
                {unread} sin leer · {archived} archivadas
              </span>
            </div>
          </>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <AdminNotificationBellButton unread={unread} />
        <div className="text-right">
          <p className="text-[11px] capitalize text-convision-text-secondary">Hoy · {todayLine}</p>
        </div>
      </div>
    </header>
  );
};
