import api from '@/lib/axios';

export interface Role {
  id: number;
  name: string;
  description: string;
  is_default: boolean;
  is_system: boolean;
  permissions?: Permission[];
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: number;
  module: string;
  action: string;
  description: string;
}

export interface RoleListResponse {
  data: Role[];
  total: number;
  page: number;
  per_page: number;
}

export interface CreateRoleInput {
  name: string;
  description: string;
  permission_ids: number[];
}

export interface UpdateRoleInput {
  name: string;
  description: string;
  permission_ids: number[];
}

export interface RoleUser {
  id: number;
  name: string;
  last_name: string;
  email: string;
}

const rolesApi = {
  getRoles: async (params?: { page?: number; per_page?: number; name?: string }): Promise<RoleListResponse> => {
    const { data } = await api.get('/api/v1/roles', { params });
    return data;
  },

  getRole: async (id: number): Promise<Role> => {
    const { data } = await api.get(`/api/v1/roles/${id}`);
    return data;
  },

  createRole: async (input: CreateRoleInput): Promise<Role> => {
    const { data } = await api.post('/api/v1/roles', input);
    return data;
  },

  updateRole: async (id: number, input: UpdateRoleInput): Promise<Role> => {
    const { data } = await api.put(`/api/v1/roles/${id}`, input);
    return data;
  },

  deleteRole: async (id: number): Promise<void> => {
    await api.delete(`/api/v1/roles/${id}`);
  },

  getPermissions: async (): Promise<Permission[]> => {
    const { data } = await api.get('/api/v1/permissions');
    return data.data ?? [];
  },

  assignRole: async (userId: number, roleId: number): Promise<void> => {
    await api.post(`/api/v1/users/${userId}/roles`, { role_id: roleId });
  },

  removeRole: async (userId: number, roleId: number): Promise<void> => {
    await api.delete(`/api/v1/users/${userId}/roles/${roleId}`);
  },

  getUserPermissions: async (userId: number): Promise<string[]> => {
    const { data } = await api.get(`/api/v1/users/${userId}/permissions`);
    return data.data ?? [];
  },

  getUserRoles: async (userId: number): Promise<Role[]> => {
    const { data } = await api.get(`/api/v1/users/${userId}/roles`);
    return data.data ?? [];
  },

  getRoleUsers: async (roleId: number): Promise<RoleUser[]> => {
    const { data } = await api.get(`/api/v1/roles/${roleId}/users`);
    return data.data ?? data;
  },

  getForTable: async (params?: { page?: number; per_page?: number; name?: string }) => {
    const res = await rolesApi.getRoles(params);
    return {
      data: res.data,
      total: res.total,
      last_page: Math.ceil(res.total / (params?.per_page ?? 10)),
    };
  },
};

export default rolesApi;
