import ApiService from './ApiService';
import type { Optica, CreateOpticaInput, UpdateOpticaInput, OpticaFeature, FeatureToggle } from '@/types/optica';

interface OpticaListResponse {
  data: Optica[];
  total: number;
  current_page: number;
  per_page: number;
}

export const superAdminService = {
  async listOpticas(page = 1, perPage = 15): Promise<OpticaListResponse> {
    return ApiService.get(`/api/v1/super-admin/opticas?page=${page}&per_page=${perPage}`);
  },

  async getForTable({ page, per_page, search }: { page: number; per_page: number; search?: string }) {
    const params = new URLSearchParams({ page: String(page), per_page: String(per_page) });
    if (search) params.set('search', search);
    const resp = await ApiService.get<OpticaListResponse>(`/api/v1/super-admin/opticas?${params}`);
    return {
      data: resp.data,
      last_page: Math.ceil(resp.total / per_page) || 1,
      total: resp.total,
    };
  },

  async createOptica(input: CreateOpticaInput): Promise<Optica> {
    return ApiService.post('/api/v1/super-admin/opticas', input);
  },

  async getOptica(id: number): Promise<Optica> {
    return ApiService.get(`/api/v1/super-admin/opticas/${id}`);
  },

  async updateOptica(id: number, input: UpdateOpticaInput): Promise<Optica> {
    return ApiService.patch(`/api/v1/super-admin/opticas/${id}`, input);
  },

  async listFeatures(opticaId: number): Promise<{ features: OpticaFeature[] }> {
    return ApiService.get(`/api/v1/super-admin/opticas/${opticaId}/features`);
  },

  async bulkUpdateFeatures(opticaId: number, features: FeatureToggle[]): Promise<void> {
    return ApiService.put(`/api/v1/super-admin/opticas/${opticaId}/features`, { features });
  },

  async toggleFeature(opticaId: number, featureKey: string, isEnabled: boolean): Promise<void> {
    return ApiService.patch(`/api/v1/super-admin/opticas/${opticaId}/features/${featureKey}`, { is_enabled: isEnabled });
  },

  async listFeatureKeys(): Promise<{ feature_keys: string[] }> {
    return ApiService.get('/api/v1/super-admin/feature-keys');
  },
};
