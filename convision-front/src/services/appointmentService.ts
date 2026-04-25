import api from '@/lib/axios';

export interface Appointment {
  id: number;
  clinic_id: number;
  patient_id: number;
  specialist_id?: number;
  taken_by_id?: number;
  scheduled_at: string;
  started_at?: string;
  completed_at?: string;
  status: 'scheduled' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
  notes?: string;
  reason?: string | null;
  patient?: {
    id: number;
    full_name: string;
    id_number: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
    identification?: string;
    email?: string;
  };
  specialist?: {
    id: number;
    name: string;
  };
  takenBy?: {
    id: number;
    name: string;
  };
  taken_by?: {
    id: number;
    name: string;
  };
  prescription?: { id: number } | null;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}

export const takeAppointment = (id: number) =>
  api.post<{ data: Appointment }>(`/api/v1/appointments/${id}/take`);

export const pauseAppointment = (id: number) =>
  api.post<{ data: Appointment }>(`/api/v1/appointments/${id}/pause`);

export const resumeAppointment = (id: number) =>
  api.post<{ data: Appointment }>(`/api/v1/appointments/${id}/resume`);

export const completeAppointment = (id: number) =>
  api.put<{ data: Appointment }>(`/api/v1/appointments/${id}`, { status: 'completed' });

export const getActiveAppointment = () =>
  api.get<{ data: Appointment }>('/api/v1/appointments/active');

export const getAppointmentById = (id: number) =>
  api.get<Appointment>(`/api/v1/appointments/${id}`);

export const getAppointmentsBySpecialist = (params?: {
  page?: number;
  per_page?: number;
  date?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  search?: string;
  sort?: string;
}) =>
  api.get<{ data: Appointment[]; meta: { total: number; current_page: number; per_page: number } }>(
    '/api/v1/appointments',
    {
      params: { sort: 'scheduled_at,asc', ...params },
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache', Expires: '0' },
    }
  );
