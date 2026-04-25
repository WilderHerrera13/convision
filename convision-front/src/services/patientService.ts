import api from '@/lib/axios';

export interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  identification: string;
  email: string;
  phone: string;
  birth_date: string | null;
  gender: string | null;
  address: string | null;
  status: string;
  profile_image: string | null;
}

export interface PatientSearchParams {
  search?: string;
  page?: number;
  perPage?: number;
  status?: string;
}

export interface PaginatedResponse<T> {
  current_page: number;
  data: T[];
  from: number;
  last_page: number;
  per_page: number;
  to: number;
  total: number;
}

class PatientService {
  /**
   * Get all patients with pagination
   */
  async getPatients(params?: PatientSearchParams) {
    const response = await api.get('/api/v1/patients', { 
      params: {
        page: params?.page || 1,
        per_page: params?.perPage || 10,
        status: params?.status
      }
    });
    return response.data as PaginatedResponse<Patient>;
  }

  async searchPatients(params: PatientSearchParams) {
    const queryParams: Record<string, string | number> = {
      page: params.page || 1,
      per_page: params.perPage || 20,
    };

    if (params.search?.trim()) {
      const fields = ['first_name', 'last_name', 'identification', 'email'];
      queryParams['s_f'] = JSON.stringify(fields);
      queryParams['s_v'] = JSON.stringify(Array(fields.length).fill(params.search.trim()));
      queryParams['s_o'] = 'or';
    }

    if (params.status) {
      queryParams['status'] = params.status;
    }

    const response = await api.get('/api/v1/patients', { params: queryParams });
    return response.data as PaginatedResponse<Patient>;
  }

  /**
   * Get a single patient by ID
   */
  async getPatient(id: number) {
    const response = await api.get(`/api/v1/patients/${id}`);
    return response.data as Patient;
  }

  /**
   * Create a new patient
   */
  async createPatient(data: Partial<Patient>) {
    const response = await api.post('/api/v1/patients', data);
    return response.data;
  }

  /**
   * Update an existing patient
   */
  async updatePatient(id: number, data: Partial<Patient>) {
    const response = await api.put(`/api/v1/patients/${id}`, data);
    return response.data;
  }

  /**
   * Delete a patient
   */
  async deletePatient(id: number) {
    const response = await api.delete(`/api/v1/patients/${id}`);
    return response.data;
  }

  /**
   * Restore a deleted patient
   */
  async restorePatient(id: number) {
    const response = await api.post(`/api/v1/patients/${id}/restore`);
    return response.data;
  }

  /**
   * Upload a profile image for a patient
   */
  async uploadProfileImage(id: number, imageFile: File) {
    const formData = new FormData();
    formData.append('profile_image', imageFile);
    
    const response = await api.post(`/api/v1/patients/${id}/profile-image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  /**
   * Get patient profile image URL
   */
  getProfileImageUrl(imagePath: string | null) {
    if (!imagePath) return null;
    return `${api.defaults.baseURL}/storage/${imagePath}`;
  }
}

export const patientService = new PatientService(); 