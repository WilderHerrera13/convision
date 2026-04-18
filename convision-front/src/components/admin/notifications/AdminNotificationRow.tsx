import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Archive, ArchiveRestore, Check, ExternalLink, LineChart, Mail, MessageSquare, Sparkles, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdminNotification, AdminNotificationKind } from '@/services/adminNotificationService';

const kindLabel: Record<AdminNotificationKind, string> = {
  system: 'Sistema',
  operational: 'Operativa',
  message: 'Mensaje',
};

const kindIcon: Record<AdminNotificationKind, React.ReactNode> = {
  system: <Sparkles className="size-[22px] text-convision-primary" strokeWidth={1.5} />,
  operational: <LineChart className="size-[22px] text-convision-primary" strokeWidth={1.5} />,
  message: <MessageSquare className="size-[22px] text-convision-primary" strokeWidth={1.5} />,
};

type AdminNotificationRowProps = {
  item: AdminNotification;
  busyId: number | null;
  onMarkRead: (id: number) => void;
  onMarkUnread: (id: number) => void;
  onArchive: (id: number) => void;
  onUnarchive: (id: number) => void;
  onDelete: (id: number) => void;
};

export const AdminNotificationRow: React.FC<AdminNotificationRowProps> = ({
  item,
  busyId,
  onMarkRead,
  onMarkUnread,
  onArchive,
  onUnarchive,
  onDelete,
}) => {
  const navigate = useNavigate();
  const isArchived = Boolean(item.archived_at);
  const isUnread = !item.read_at;
  const busy = busyId === item.id;

  const openAction = () => {
    if (!item.action_url) return;
    if (/^https?:\/\//i.test(item.action_url)) {
      window.open(item.action_url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(item.action_url);
    }
  };

  const rel = formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es });

  return (
    <div
      className={cn(
        'relative flex min-h-[88px] items-stretch border-b border-convision-border bg-white px-4 py-3 pl-5',
      )}
    >
      <div className="flex w-3 shrink-0 items-center justify-center pt-1">
        {isUnread && !isArchived ? (
          <span className="size-2 rounded-full bg-convision-primary" aria-hidden />
        ) : (
          <span className="size-2 rounded-full bg-transparent" aria-hidden />
        )}
      </div>
      <div className="ml-2 flex size-10 shrink-0 items-center justify-center rounded-lg bg-convision-light">
        {kindIcon[item.kind] ?? kindIcon.system}
      </div>
      <div className="min-w-0 flex-1 pl-3 pr-3">
        <p className="text-[13px] font-semibold text-convision-text">{item.title}</p>
        <p className="mt-0.5 line-clamp-2 text-[12px] text-convision-text-secondary">{item.body}</p>
        <p className="mt-1 text-[11px] text-convision-text-muted capitalize">{rel}</p>
      </div>
      <div className="flex shrink-0 items-start pt-1">
        <span className="rounded-full bg-convision-light px-2.5 py-0.5 text-[11px] font-semibold text-convision-primary">
          {kindLabel[item.kind] ?? item.kind}
        </span>
      </div>
      <div className="ml-2 flex shrink-0 items-center gap-1.5">
        {item.action_url ? (
          <button
            type="button"
            disabled={busy}
            onClick={openAction}
            className="flex size-8 items-center justify-center rounded-md border border-[#e0e0e4] bg-white hover:bg-convision-background disabled:opacity-50"
            title="Abrir enlace"
          >
            <ExternalLink className="size-4 text-convision-text" />
          </button>
        ) : null}
        {!isArchived && isUnread ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onMarkRead(item.id)}
            className="flex size-8 items-center justify-center rounded-md border border-[#e0e0e4] bg-white hover:bg-convision-background disabled:opacity-50"
            title="Marcar como leída"
          >
            <Check className="size-4 text-convision-text" />
          </button>
        ) : null}
        {!isArchived && !isUnread ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onMarkUnread(item.id)}
            className="flex size-8 items-center justify-center rounded-md border border-[#e0e0e4] bg-white hover:bg-convision-background disabled:opacity-50"
            title="Marcar como no leída"
          >
            <Mail className="size-4 text-convision-text" />
          </button>
        ) : null}
        {!isArchived ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onArchive(item.id)}
            className="flex size-8 items-center justify-center rounded-md border border-[#e0e0e4] bg-white hover:bg-convision-background disabled:opacity-50"
            title="Archivar"
          >
            <Archive className="size-4 text-convision-text" />
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => onUnarchive(item.id)}
            className="flex size-8 items-center justify-center rounded-md border border-[#e0e0e4] bg-white hover:bg-convision-background disabled:opacity-50"
            title="Desarchivar"
          >
            <ArchiveRestore className="size-4 text-convision-text" />
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => onDelete(item.id)}
          className="flex size-8 items-center justify-center rounded-md border border-[#f5baba] bg-[#fff0f0] hover:bg-convision-error-light disabled:opacity-50"
          title="Eliminar"
        >
          <Trash2 className="size-4 text-convision-text" />
        </button>
      </div>
    </div>
  );
};
