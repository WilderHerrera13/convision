import axios from '@/lib/axios';

export interface User {
  id: number;
  name: string;
  last_name: string;
  email: string;
  identification: string;
  phone: string;
  role: 'admin' | 'specialist' | 'receptionist';
}

export interface CreateUserData {
  name: string;
  last_name: string;
  email: string;
  identification: string;
  phone: string;
  password: string;
  role: 'admin' | 'specialist' | 'receptionist';
}

export interface UpdateUserData {
  name: string;
  last_name: string;
  email: string;
  identification: string;
  phone: string;
  password?: string;
  role: 'admin' | 'specialist' | 'receptionist';
}

class UserService {
  private readonly baseUrl = '/api/v1/users';

  async getAll(): Promise<User[]> {
    const response = await axios.get(this.baseUrl);
    // Support both { data: [...] } and [...] API responses
    return Array.isArray(response.data) ? response.data : response.data.data;
  }

  async getById(id: number): Promise<User> {
    const response = await axios.get<User>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  async create(data: CreateUserData): Promise<void> {
    await axios.post(this.baseUrl, data);
  }

  async update(id: number, data: UpdateUserData): Promise<void> {
    await axios.put(`${this.baseUrl}/${id}`, data);
  }

  async delete(id: number): Promise<void> {
    await axios.delete(`${this.baseUrl}/${id}`);
  }
}

export const userService = new UserService(); 