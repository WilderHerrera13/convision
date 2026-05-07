import ApiService from './ApiService';
import type { Permission } from './roles';

export interface OpticaPermissionsResponse {
  permission_keys: string[];
}

export const opticaPermissionsService = {
  getOpticaPermissions: (opticaId: number): Promise<OpticaPermissionsResponse> =>
    ApiService.get<OpticaPermissionsResponse>(`/api/v1/super-admin/opticas/${opticaId}/permissions`),

  updateOpticaPermissions: (opticaId: number, permissionKeys: string[]): Promise<OpticaPermissionsResponse> =>
    ApiService.put<OpticaPermissionsResponse>(`/api/v1/super-admin/opticas/${opticaId}/permissions`, {
      permission_keys: permissionKeys,
    }),

  getAllPermissions: (): Promise<Permission[]> =>
    ApiService.get<Permission[]>('/api/v1/super-admin/permissions'),
};
