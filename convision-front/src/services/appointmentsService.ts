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

export type Appointment = {
  id: number;
  patient: Patient;
  specialist: Specialist;
  scheduled_at: string;
  status: 'scheduled' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
  notes?: string;
  reason?: string | null;
  taken_by_id?: number;
  takenBy?: {
    id: number;
    name: string;
  };
  taken_by?: {
    id: number;
    name: string;
  };
  prescription?: { id: number } | null;
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

export type PaginatedAppointmentsTable = {
  data: Appointment[];
  last_page: number;
  total: number;
};

type GetAppointmentsParams = {
  perPage?: number;
  filters?: Record<string, unknown>;
  sort?: string;
  page?: number;
  view?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
};

export const appointmentsService = {
  async getSpecialists(): Promise<Specialist[]> {
    const response = await api.get('/api/v1/specialists');
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
    sort = 'scheduled_at,asc', 
    page = 1, 
    view,
    startDate,
    endDate,
    search,
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
    
    if (view) {
      params.view = view;
    }

    if (startDate) {
      params.start_date = startDate;
    }

    if (endDate) {
      params.end_date = endDate;
    }

    if (search) {
      params.search = search;
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

  /**
   * Citas completadas (cola de ventas) para recepción — paginado, búsqueda vía API.
   */
  async getReceptionistSalesQueueTable(params: {
    page?: number;
    per_page?: number;
    search?: string;
  }): Promise<PaginatedAppointmentsTable> {
    const page = params.page ?? 1;
    const per_page = params.per_page ?? 10;
    const query: Record<string, string | number> = {
      page,
      per_page,
      status: 'completed',
      sort: 'updated_at,desc',
    };
    const t = params.search?.trim();
    if (t) {
      query.search = t;
    }
    const response = await api.get('/api/v1/appointments', {
      params: query,
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
    const body = response.data;
    const meta = body.meta ?? {};
    const last =
      typeof meta.last_page === 'number'
        ? meta.last_page
        : Array.isArray(meta.last_page)
          ? Number(meta.last_page[0])
          : 1;
    const total =
      typeof meta.total === 'number'
        ? meta.total
        : Array.isArray(meta.total)
          ? Number(meta.total[0])
          : (Array.isArray(body.data) ? body.data.length : 0);
    return {
      data: Array.isArray(body.data) ? body.data : [],
      last_page: last || 1,
      total,
    };
  },

  /**
   * Agenda del especialista para un rango de fechas (paginado, búsqueda vía API).
   */
  async getSpecialistTodayAgendaTable(params: {
    page?: number;
    per_page?: number;
    search?: string;
    startDate: string;
    endDate: string;
  }): Promise<PaginatedAppointmentsTable> {
    const page = params.page ?? 1;
    const per_page = params.per_page ?? 10;
    const query: Record<string, string | number> = {
      page,
      per_page,
      sort: 'scheduled_at,asc',
      start_date: params.startDate,
      end_date: params.endDate,
    };
    const t = params.search?.trim();
    if (t) {
      query.search = t;
    }
    const response = await api.get('/api/v1/appointments', {
      params: query,
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
    const body = response.data;
    return {
      data: Array.isArray(body.data) ? body.data : [],
      last_page: body.meta?.last_page ?? 1,
      total: body.meta?.total ?? 0,
    };
  },

  async getSpecialistAgendaTable(params: {
    page?: number;
    per_page?: number;
    search?: string;
    startDate: string;
    endDate: string;
    status?: string;
  }): Promise<PaginatedAppointmentsTable> {
    const page = params.page ?? 1;
    const per_page = params.per_page ?? 15;
    const query: Record<string, string | number> = {
      page,
      per_page,
      sort: 'scheduled_at,asc',
      start_date: params.startDate,
      end_date: params.endDate,
    };
    if (params.search?.trim()) query.search = params.search.trim();
    if (params.status) query.status = params.status;
    const response = await api.get('/api/v1/appointments', {
      params: query,
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache', Expires: '0' },
    });
    const body = response.data;
    const meta = body.meta ?? {};
    const last_page =
      typeof meta.last_page === 'number' ? meta.last_page
      : Array.isArray(meta.last_page) ? Number(meta.last_page[0]) : 1;
    const total =
      typeof meta.total === 'number' ? meta.total
      : Array.isArray(meta.total) ? Number(meta.total[0]) : 0;
    return { data: Array.isArray(body.data) ? body.data : [], last_page: last_page || 1, total };
  },

  async getBookedSlots(specialistId: number, date: string): Promise<string[]> {
    const response = await api.get('/api/v1/appointments/available-slots', {
      params: { specialist_id: specialistId, date },
    });
    return response.data.booked_slots ?? [];
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

  async cancelAppointment(id: number): Promise<Appointment> {
    const response = await api.put(`/api/v1/appointments/${id}`, {
      status: 'cancelled'
    });
    return response.data.data;
  },

  async getAppointmentById(id: number): Promise<Appointment> {
    const response = await api.get(`/api/v1/appointments/${id}`);
    // Go backend returns the entity directly (no {data:…} wrapper)
    return response.data as Appointment;
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