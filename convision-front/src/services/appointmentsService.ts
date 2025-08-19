import api from '@/lib/axios';

type Specialist = {
  id: number;
  name: string;
  identification?: string;
  role: string;
};

type Patient = {
  id: number;
  first_name: string;
  last_name: string;
  identification: string;
  email: string;
  phone?: string;
  birth_date?: string;
  gender?: string;
};

type Appointment = {
  id: number;
  patient: Patient;
  specialist: Specialist;
  scheduled_at: string;
  status: 'scheduled' | 'in_progress' | 'paused' | 'completed';
  notes?: string;
  taken_by_id?: number;
  takenBy?: {
    id: number;
    name: string;
  };
};

type AppointmentsResponse = {
  data: Appointment[];
  meta: {
    current_page: number[];
    last_page: number[];
    per_page: number[];
    total: number[];
    from: number[]; 
    to: number[];   
  };
  links: {
    first: string[]; 
    last: string[];  
    prev: (string | null)[]; 
    next: (string | null)[]; 
  };
};

type GetAppointmentsParams = {
  perPage?: number;
  filters?: Record<string, unknown>;
  sort?: string;
  page?: number;
  view?: string;
};

export const appointmentsService = {
  async getSpecialists(): Promise<Specialist[]> {
    const response = await api.get('/api/v1/users', {
      params: {
        per_page: 100,
        s_f: JSON.stringify(['role']),
        s_v: JSON.stringify(['specialist']),
        sort: 'name,asc',
      },
    });
    return response.data.data;
  },

  async getPatients(): Promise<Patient[]> {
    const response = await api.get('/api/v1/patients', {
      params: {
        per_page: 100,
        sort: 'first_name,asc',
      },
    });
    return response.data.data;
  },

  async getAppointments({ 
    perPage = 15, 
    filters = {}, 
    sort = 'scheduled_at,desc', 
    page = 1, 
    view 
  }: GetAppointmentsParams = {}): Promise<AppointmentsResponse> {
    // Prepare filter fields and values
    const s_f: string[] = [];
    const s_v: string[] = [];
    
    // Extract status from filters to send as direct query param
    let status: string | undefined;
    const filtersCopy = { ...filters };
    
    if ('status' in filtersCopy && filtersCopy.status) {
      status = String(filtersCopy.status);
      delete filtersCopy.status;
    }
    
    // Process remaining filters
    Object.entries(filtersCopy).forEach(([key, value]) => {
      s_f.push(key);
      s_v.push(String(value));
    });
    
    const params: Record<string, string | number | undefined> = {
      per_page: perPage,
      page,
      s_f: s_f.length ? JSON.stringify(s_f) : undefined,
      s_v: s_v.length ? JSON.stringify(s_v) : undefined,
      sort,
    };
    
    // Add status directly as a query parameter
    if (status) {
      params.status = status;
    }
    
    // Add the view parameter if provided
    if (view) {
      params.view = view;
    }
    
    // Use no-cache headers to ensure fresh data
    const response = await api.get('/api/v1/appointments', {
      params,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
    
    return response.data;
  },

  async searchPatients(query: string): Promise<Patient[]> {
    // Don't search if query is too short
    if (query.length < 3) {
      return [];
    }
    
    // Search in key fields with logical OR
    const s_f = ['identification', 'first_name', 'last_name', 'email'];
    const s_v = Array(s_f.length).fill(query);
    const s_o = 'or'; // Use OR for better matches
    
    const response = await api.get('/api/v1/patients', {
      params: {
        per_page: 10, // Reduce to 10 for faster responses
        s_f: JSON.stringify(s_f),
        s_v: JSON.stringify(s_v),
        s_o,
        sort: 'first_name,asc',
      },
      // Add caching headers for 1 minute to reduce duplicate requests
      headers: {
        'Cache-Control': 'max-age=60',
      }
    });
    return response.data.data;
  },

  async takeAppointment(id: number): Promise<Appointment> {
    const response = await api.post(`/api/v1/appointments/${id}/take`);
    return response.data.data;
  },

  async pauseAppointment(id: number): Promise<Appointment> {
    const response = await api.post(`/api/v1/appointments/${id}/pause`);
    return response.data.data;
  },

  async resumeAppointment(id: number): Promise<Appointment> {
    const response = await api.post(`/api/v1/appointments/${id}/resume`);
    return response.data.data;
  },

  async completeAppointment(id: number): Promise<Appointment> {
    const response = await api.put(`/api/v1/appointments/${id}`, {
      status: 'completed'
    });
    return response.data.data;
  },

  async getAppointmentById(id: number): Promise<Appointment> {
    const response = await api.get(`/api/v1/appointments/${id}`);
    return response.data.data;
  },

  // Direct check of completed appointments count in the database
  async getCompletedAppointmentsCount(): Promise<number> {
    const response = await api.get('/api/v1/appointments/count', {
      params: {
        status: 'completed'
      },
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
    return response.data.count;
  },

  async saveAppointmentAnnotation(
    appointmentId: number,
    eye: 'left' | 'right',
    pathsJson: string | null, 
    imageDataUrl: string | null 
  ): Promise<Appointment> {
    interface AnnotationPayload {
      eye: 'left' | 'right';
      left_eye_annotation_paths?: string | null;
      left_eye_annotation_image_data_url?: string | null;
      right_eye_annotation_paths?: string | null;
      right_eye_annotation_image_data_url?: string | null;
    }

    const payload: AnnotationPayload = {
      eye,
    };
    if (eye === 'left') {
      payload.left_eye_annotation_paths = pathsJson;
      payload.left_eye_annotation_image_data_url = imageDataUrl;
    } else {
      payload.right_eye_annotation_paths = pathsJson;
      payload.right_eye_annotation_image_data_url = imageDataUrl;
    }
    const response = await api.post<Appointment>(
      `/appointments/${appointmentId}/annotations`,
      payload
    );
    return response.data;
  },
}; 