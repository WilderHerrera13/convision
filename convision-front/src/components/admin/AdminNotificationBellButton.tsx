import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

type AdminNotificationBellButtonProps = {
  unread: number;
};

export const AdminNotificationBellButton: React.FC<AdminNotificationBellButtonProps> = ({ unread }) => {
  const location = useLocation();
  const active = location.pathname.startsWith('/admin/notifications');
  const badge = unread > 9 ? '9+' : unread > 0 ? String(unread) : null;

  return (
    <NavLink
      to="/admin/notifications"
      className={cn(
        'relative flex size-9 shrink-0 items-center justify-center rounded-[6px] border border-convision-border bg-white transition-colors',
        active ? 'border-convision-primary/40 bg-convision-light' : 'hover:bg-convision-background',
      )}
      aria-label="Notificaciones"
    >
      <Bell className={cn('size-5', active ? 'text-convision-primary' : 'text-convision-text')} strokeWidth={1.75} />
      {badge !== null && (
        <span
          className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-[#B82626] px-0.5 text-[10px] font-semibold leading-none text-white"
          aria-hidden
        >
          {badge}
        </span>
      )}
    </NavLink>
  );
};
