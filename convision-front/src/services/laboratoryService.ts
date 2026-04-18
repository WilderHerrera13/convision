import api from '@/lib/axios';

export interface Laboratory {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  contact_person: string | null;
  status: 'active' | 'inactive';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedLaboratoriesResponse {
  data: Laboratory[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export type PaginatedLaboratoriesTable = {
  data: Laboratory[];
  last_page: number;
  total: number;
};

export const laboratoryService = {
  async getLaboratoriesTable(params: {
    page?: number;
    per_page?: number;
    search?: string;
  }): Promise<PaginatedLaboratoriesTable> {
    const page = params.page ?? 1;
    const per_page = params.per_page ?? 10;
    const query: Record<string, string | number> = {
      page,
      per_page,
      sort: 'name,asc',
    };
    const t = params.search?.trim();
    if (t) {
      query.s_f = JSON.stringify(['name', 'contact_person', 'email', 'phone']);
      query.s_v = JSON.stringify([`%${t}%`, `%${t}%`, `%${t}%`, `%${t}%`]);
      query.s_o = 'or';
    }
    const response = await api.get('/api/v1/laboratories', { params: query });
    const body = response.data;
    return {
      data: Array.isArray(body.data) ? body.data : [],
      last_page: body.meta?.last_page ?? 1,
      total: body.meta?.total ?? 0,
    };
  },

  async getLaboratories(
    page = 1, 
    perPage = 10, 
    filters: Record<string, string | number> = {}
  ): Promise<PaginatedLaboratoriesResponse> {
    const params: Record<string, string | number> = {
      page,
      per_page: perPage,
    };
    
    // Agregar filtros adicionales
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== 'all') {
        params[key] = value;
      }
    });
    
    const response = await api.get('/api/v1/laboratories', { params });
    return response.data;
  },

  /**
   * Obtener todos los laboratorios activos (para desplegables)
   * @returns Lista de laboratorios activos
   */
  async getActiveLaboratories(): Promise<Laboratory[]> {
    const params = {
      status: 'active',
      per_page: 100, // Obtener hasta 100 laboratorios activos
    };
    
    const response = await api.get('/api/v1/laboratories', { params });
    return response.data.data;
  },

  /**
   * Obtener un laboratorio por ID
   * @param laboratoryId ID del laboratorio
   * @returns Detalles del laboratorio
   */
  async getLaboratory(laboratoryId: number): Promise<Laboratory> {
    const response = await api.get(`/api/v1/laboratories/${laboratoryId}`);
    const body = response.data;
    return (body?.data ?? body) as Laboratory;
  },

  /**
   * Crear un nuevo laboratorio
   * @param laboratoryData Datos del laboratorio
   * @returns Promesa con el laboratorio creado
   */
  async createLaboratory(laboratoryData: Partial<Laboratory>): Promise<void> {
    await api.post('/api/v1/laboratories', laboratoryData);
  },

  /**
   * Actualizar un laboratorio existente
   * @param laboratoryId ID del laboratorio
   * @param laboratoryData Datos actualizados del laboratorio
   * @returns Promesa con el laboratorio actualizado
   */
  async updateLaboratory(laboratoryId: number, laboratoryData: Partial<Laboratory>): Promise<void> {
    await api.put(`/api/v1/laboratories/${laboratoryId}`, laboratoryData);
  },

  /**
   * Eliminar un laboratorio
   * @param laboratoryId ID del laboratorio
   * @returns Mensaje de éxito
   */
  async deleteLaboratory(laboratoryId: number): Promise<{ message: string }> {
    const response = await api.delete(`/api/v1/laboratories/${laboratoryId}`);
    return response.data;
  }
}; 