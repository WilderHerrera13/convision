import api from '@/lib/axios';
import { AxiosError } from 'axios';
import { ClinicalEvolution, ClinicalEvolutionFormData } from './clinicalHistoryService';

interface PaginationParams {
  page?: number;
  per_page?: number;
  appointment_id?: number;
}

interface EvolutionsResponse {
  data: ClinicalEvolution[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
}

class ClinicalEvolutionService {
  /**
   * Get evolutions for a clinical history
   * @param clinicalHistoryId The clinical history ID
   * @param params Pagination parameters and filters
   * @returns Paginated evolutions
   */
  async getEvolutions(clinicalHistoryId: number, params: PaginationParams = {}): Promise<EvolutionsResponse> {
    try {
      const response = await api.get(
        `/api/v1/clinical-histories/${clinicalHistoryId}/evolutions`,
        { params }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching clinical evolutions:', error);
      // Return a default structure to avoid undefined errors
      return {
        data: [],
        meta: {
          current_page: 1,
          last_page: 1,
          per_page: 10,
          total: 0
        },
        links: {
          first: '',
          last: '',
          prev: null,
          next: null
        }
      };
    }
  }

  /**
   * Get evolutions by patient ID and optionally appointment ID
   * @param patientId The patient ID
   * @param appointmentId Optional appointment ID to filter evolutions
   * @returns Evolutions for the patient
   */
  async getEvolutionsByPatient(patientId: number, appointmentId?: number): Promise<ClinicalEvolution[]> {
    try {
      const response = await api.get(`/api/v1/patients/${patientId}/clinical-history`);
      const clinicalHistory = response.data.data || response.data;
      
      if (!clinicalHistory || !clinicalHistory.id) {
        return [];
      }
      
      const params: Record<string, string | number> = {
        per_page: 100,
      };
      
      if (appointmentId) {
        params.s_f = JSON.stringify(['appointment_id']);
        params.s_v = JSON.stringify([appointmentId.toString()]);
      }
      
      const evolutionsResponse = await api.get(`/api/v1/clinical-histories/${clinicalHistory.id}/evolutions`, {
        params
      });
      
      return evolutionsResponse.data.data || [];
    } catch (error) {
      console.error('Error fetching evolutions:', error);
      return [];
    }
  }

  /**
   * Get a specific evolution by ID
   * @param id The evolution ID
   * @returns The evolution data
   */
  async getEvolution(id: number): Promise<ClinicalEvolution> {
    const response = await api.get(`/api/v1/clinical-evolutions/${id}`);
    return response.data;
  }

  /**
   * Create a new clinical evolution
   * @param data The evolution data
   * @returns The created evolution
   */
  async createEvolution(data: ClinicalEvolutionFormData): Promise<ClinicalEvolution> {
    const response = await api.post('/api/v1/clinical-evolutions', data);
    return response.data as ClinicalEvolution;
  }

  /**
   * Create an evolution from an appointment
   * @param appointmentId The appointment ID
   * @param data The evolution data
   * @returns The created evolution
   */
  async createEvolutionFromAppointment(appointmentId: number, data: ClinicalEvolutionFormData): Promise<ClinicalEvolution> {
    const response = await api.post(`/api/v1/appointments/${appointmentId}/evolution`, data);
    return response.data as ClinicalEvolution;
  }

  /**
   * Update an existing clinical evolution
   * @param id The evolution ID
   * @param data The updated evolution data
   * @returns The updated evolution
   */
  async updateEvolution(id: number, data: Partial<ClinicalEvolutionFormData>): Promise<ClinicalEvolution> {
    const response = await api.put(`/api/v1/clinical-evolutions/${id}`, data);
    return response.data as ClinicalEvolution;
  }

  /**
   * Delete a clinical evolution
   * @param id The evolution ID
   * @returns Success status
   */
  async deleteEvolution(id: number): Promise<boolean> {
    try {
      await api.delete(`/api/v1/clinical-evolutions/${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting clinical evolution:', error);
      return false;
    }
  }
}

export const clinicalEvolutionService = new ClinicalEvolutionService();
export default clinicalEvolutionService; 