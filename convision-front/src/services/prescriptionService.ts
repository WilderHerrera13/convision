import api from '@/lib/axios';

export interface PrescriptionFormData {
  appointment_id: number;
  date: string;
  document: string;
  patient_name: string;
  right_sphere: string;
  right_cylinder: string;
  right_axis: string;
  right_addition: string;
  right_height: string;
  right_distance_p: string;
  right_visual_acuity_far: string;
  right_visual_acuity_near: string;
  left_sphere: string;
  left_cylinder: string;
  left_axis: string;
  left_addition: string;
  left_height: string;
  left_distance_p: string;
  left_visual_acuity_far: string;
  left_visual_acuity_near: string;
  correction_type: string;
  usage_type: string;
  recommendation: string;
  professional: string;
  observation: string;
  attachment?: string;
}

export interface Prescription extends PrescriptionFormData {
  id: number;
  created_at: string;
  updated_at: string;
}

export const prescriptionService = {
  // Get prescription by ID
  async getPrescription(id: number): Promise<Prescription> {
    const response = await api.get(`/api/v1/prescriptions/${id}`);
    return response.data;
  },

  // Get prescription by appointment ID
  async getPrescriptionByAppointment(appointmentId: number): Promise<Prescription | null> {
    try {
      // First try to get from appointment data
      const appointmentResponse = await api.get(`/api/v1/appointments/${appointmentId}`);
      if (appointmentResponse.data.prescription) {
        return appointmentResponse.data.prescription;
      }
      
      // If not found in appointment, search prescriptions table directly
      const prescriptionsResponse = await api.get(`/api/v1/prescriptions?s_f=["appointment_id"]&s_v=["${appointmentId}"]&per_page=1`);
      if (prescriptionsResponse.data.data && prescriptionsResponse.data.data.length > 0) {
        return prescriptionsResponse.data.data[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching prescription by appointment:', error);
      return null;
    }
  },

  // Create a new prescription
  async createPrescription(data: PrescriptionFormData): Promise<Prescription> {
    const response = await api.post('/api/v1/prescriptions', data);
    return response.data;
  },

  // Update a prescription
  async updatePrescription(id: number, data: Partial<PrescriptionFormData>): Promise<Prescription> {
    const response = await api.put(`/api/v1/prescriptions/${id}`, data);
    return response.data;
  },

  // Upload annotation for a prescription
  async uploadAnnotation(appointmentId: string, annotation: string, paths?: string): Promise<object> {
    try {
      const response = await api.post(`/api/v1/appointments/${appointmentId}/lens-annotation`, {
        annotation,
        paths
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading annotation:', error);
      throw error;
    }
  },

  // Get annotation for a prescription
  async getAnnotation(appointmentId: string): Promise<{ annotation: string | null; paths: string | null }> {
    try {
      const response = await api.get(`/api/v1/appointments/${appointmentId}/lens-annotation`);
      return response.data;
    } catch (error) {
      console.error('Error getting annotation:', error);
      throw error;
    }
  }
}; 