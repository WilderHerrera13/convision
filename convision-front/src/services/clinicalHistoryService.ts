import api from '@/lib/axios';
import { AxiosError } from 'axios';

export interface ClinicalHistory {
  id: number;
  patient_id: number;
  reason_for_consultation: string;
  current_illness?: string;
  personal_history?: string;
  family_history?: string;
  occupational_history?: string;
  uses_optical_correction: boolean;
  optical_correction_type?: string;
  last_control_detail?: string;
  ophthalmological_diagnosis?: string;
  eye_surgery?: string;
  has_systemic_disease: boolean;
  systemic_disease_detail?: string;
  medications?: string;
  allergies?: string;
  diagnostic?: string;
  treatment_plan?: string;
  observations?: string;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  patient?: {
    id: number;
    first_name: string;
    last_name: string;
    full_name: string;
    identification_type: string;
    identification_number: string;
    birth_date: string;
    gender: string;
    phone: string;
    email: string;
    address: string;
  };
  creator?: {
    id: number;
    name: string;
  };
  updater?: {
    id: number;
    name: string;
  };
  evolutions?: ClinicalEvolution[];
  pdf_token?: string;
  guest_pdf_url?: string;
}

export interface ClinicalEvolution {
  id: number;
  clinical_history_id: number;
  appointment_id?: number;
  evolution_date: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  recommendations?: string;
  right_far_vision?: string;
  left_far_vision?: string;
  right_near_vision?: string;
  left_near_vision?: string;
  right_eye_sphere?: string;
  right_eye_cylinder?: string;
  right_eye_axis?: string;
  right_eye_visual_acuity?: string;
  left_eye_sphere?: string;
  left_eye_cylinder?: string;
  left_eye_axis?: string;
  left_eye_visual_acuity?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  creator?: {
    id: number;
    name: string;
  };
  appointment?: {
    id: number;
    scheduled_at: string;
  };
}

export interface ClinicalHistoryFormData {
  patient_id: number;
  reason_for_consultation: string;
  current_illness?: string;
  personal_history?: string;
  family_history?: string;
  occupational_history?: string;
  uses_optical_correction: boolean;
  optical_correction_type?: string;
  last_control_detail?: string;
  ophthalmological_diagnosis?: string;
  eye_surgery?: string;
  has_systemic_disease: boolean;
  systemic_disease_detail?: string;
  medications?: string;
  allergies?: string;
  diagnostic?: string;
  treatment_plan?: string;
  observations?: string;
}

export interface ClinicalEvolutionFormData {
  clinical_history_id: number;
  appointment_id?: number | null;
  evolution_date: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  recommendations?: string;
  right_far_vision?: string;
  left_far_vision?: string;
  right_near_vision?: string;
  left_near_vision?: string;
  right_eye_sphere?: string;
  right_eye_cylinder?: string;
  right_eye_axis?: string;
  right_eye_visual_acuity?: string;
  left_eye_sphere?: string;
  left_eye_cylinder?: string;
  left_eye_axis?: string;
  left_eye_visual_acuity?: string;
}

export interface AppointmentEvolutionFormData {
  evolution_date: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  recommendations?: string;
  right_far_vision?: string;
  left_far_vision?: string;
  right_near_vision?: string;
  left_near_vision?: string;
  right_eye_sphere?: string;
  right_eye_cylinder?: string;
  right_eye_axis?: string;
  right_eye_visual_acuity?: string;
  left_eye_sphere?: string;
  left_eye_cylinder?: string;
  left_eye_axis?: string;
  left_eye_visual_acuity?: string;
}

class ClinicalHistoryService {
  /**
   * Get patient's clinical history
   * @param patientId The patient ID
   * @returns The clinical history for the patient, if it exists
   */
  async getPatientHistory(patientId: number) {
    try {
      const response = await api.get(`/api/v1/patients/${patientId}/clinical-history`);
      return response.data.data as ClinicalHistory;
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      if (axiosError.response && axiosError.response.status === 404) {
        // Patient doesn't have a clinical history yet
        return null;
      }
      throw error;
    }
  }

  /**
   * Check if a patient has a clinical history
   * @param patientId The patient ID
   * @returns True if the patient has a clinical history, false otherwise
   */
  async hasPatientHistory(patientId: number): Promise<boolean> {
    try {
      const history = await this.getPatientHistory(patientId);
      return history !== null;
    } catch (error) {
      console.error('Error checking patient history:', error);
      return false;
    }
  }

  /**
   * Get a clinical history by ID
   * @param id The clinical history ID
   * @returns The clinical history
   */
  async getClinicalHistory(id: number) {
    const response = await api.get(`/api/v1/clinical-histories/${id}`);
    return response.data.data as ClinicalHistory;
  }

  /**
   * Create a new clinical history
   * @param data The clinical history data
   * @returns The created clinical history
   */
  async createClinicalHistory(data: ClinicalHistoryFormData) {
    const response = await api.post('/api/v1/clinical-histories', data);
    return response.data.data as ClinicalHistory;
  }

  /**
   * Update an existing clinical history
   * @param id The clinical history ID
   * @param data The updated clinical history data
   * @returns The updated clinical history
   */
  async updateClinicalHistory(id: number, data: ClinicalHistoryFormData) {
    const response = await api.put(`/api/v1/clinical-histories/${id}`, data);
    return response.data.data as ClinicalHistory;
  }

  /**
   * Get evolutions for a clinical history
   * @param clinicalHistoryId The clinical history ID
   * @param page Page number (pagination)
   * @param perPage Items per page
   * @returns Paginated evolutions
   */
  async getEvolutions(clinicalHistoryId: number, page = 1, perPage = 10) {
    const response = await api.get(
      `/api/v1/clinical-histories/${clinicalHistoryId}/evolutions`,
      {
        params: { page, per_page: perPage }
      }
    );
    return response.data;
  }

  /**
   * Create a new clinical evolution
   * @param data The evolution data
   * @returns The created evolution
   */
  async createEvolution(data: ClinicalEvolutionFormData) {
    const response = await api.post('/api/v1/clinical-evolutions', data);
    return response.data.data as ClinicalEvolution;
  }

  /**
   * Create an evolution from an appointment
   * @param appointmentId The appointment ID
   * @param data The evolution data
   * @returns The created evolution
   */
  async createEvolutionFromAppointment(appointmentId: number, data: AppointmentEvolutionFormData) {
    const response = await api.post(`/api/v1/appointments/${appointmentId}/evolution`, data);
    return response.data.data as ClinicalEvolution;
  }

  /**
   * Download clinical history PDF using a secure token (no authentication required)
   * @param historyId Clinical history ID
   * @param patientIdentification Patient identification (for filename)
   * @param pdfToken Secure token for PDF access
   */
  async downloadClinicalHistoryPdfWithToken(
    historyId: number,
    patientIdentification: string,
    pdfToken: string
  ): Promise<void> {
    try {
      // Use fetch API to download the PDF with token
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/guest/clinical-histories/${historyId}/pdf?token=${pdfToken}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/pdf',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      // Get the blob directly from the response
      const blob = await response.blob();
      
      // Create object URL
      const url = window.URL.createObjectURL(blob);
      
      // Create invisible iframe for download
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      // Write content to iframe and trigger download
      iframe.contentWindow?.document.write(
        `<a id="download" href="${url}" download="clinical-history-${patientIdentification}.pdf"></a>`
      );
      iframe.contentWindow?.document.getElementById('download')?.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(iframe);
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error(`Error downloading PDF with token for clinical history ${historyId}:`, error);
      throw error;
    }
  }

  /**
   * Get a PDF download URL with token that can be shared
   * @param historyId Clinical history ID 
   * @param pdfToken The secure PDF token
   * @returns Full URL for downloading the PDF
   */
  getClinicalHistoryPdfShareableUrl(historyId: number, pdfToken: string): string {
    return `${import.meta.env.VITE_API_URL}/api/v1/guest/clinical-histories/${historyId}/pdf?token=${pdfToken}`;
  }
}

export const clinicalHistoryService = new ClinicalHistoryService(); 