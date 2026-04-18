import axios from '@/lib/axios';

export type AdminNotificationKind = 'system' | 'operational' | 'message';

export type AdminNotificationScope = 'all' | 'unread' | 'archived';

export interface AdminNotification {
  id: number;
  title: string;
  body: string;
  kind: AdminNotificationKind;
  action_url: string | null;
  read_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at?: string;
}

export interface AdminNotificationCounts {
  all: number;
  unread: number;
  archived: number;
}

export interface AdminNotificationListResult {
  data: AdminNotification[];
  counts: AdminNotificationCounts;
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

class AdminNotificationService {
  private readonly baseUrl = '/api/v1/admin/notifications';

  async getSummary(): Promise<{ unread: number; archived: number; inbox: number }> {
    const res = await axios.get(`${this.baseUrl}/summary`);
    return res.data.data;
  }

  async list(params: {
    page?: number;
    per_page?: number;
    scope?: AdminNotificationScope;
    kind?: AdminNotificationKind | null;
  }): Promise<AdminNotificationListResult> {
    const res = await axios.get(this.baseUrl, {
      params: {
        page: params.page ?? 1,
        per_page: params.per_page ?? 15,
        scope: params.scope ?? 'all',
        ...(params.kind ? { kind: params.kind } : {}),
      },
    });
    const body = res.data;
    return {
      data: Array.isArray(body.data) ? body.data : [],
      counts: body.counts ?? { all: 0, unread: 0, archived: 0 },
      meta: body.meta ?? { current_page: 1, last_page: 1, per_page: 15, total: 0 },
    };
  }

  async markAllRead(): Promise<number> {
    const res = await axios.patch(`${this.baseUrl}/read-all`);
    return res.data.data.updated as number;
  }

  async markRead(id: number): Promise<AdminNotification> {
    const res = await axios.patch(`${this.baseUrl}/${id}/read`);
    return res.data.data;
  }

  async markUnread(id: number): Promise<AdminNotification> {
    const res = await axios.patch(`${this.baseUrl}/${id}/unread`);
    return res.data.data;
  }

  async archive(id: number): Promise<AdminNotification> {
    const res = await axios.patch(`${this.baseUrl}/${id}/archive`);
    return res.data.data;
  }

  async unarchive(id: number): Promise<AdminNotification> {
    const res = await axios.patch(`${this.baseUrl}/${id}/unarchive`);
    return res.data.data;
  }

  async remove(id: number): Promise<void> {
    await axios.delete(`${this.baseUrl}/${id}`);
  }
}

export const adminNotificationService = new AdminNotificationService();
