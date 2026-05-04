import axios from '@/lib/axios';

export interface UserBranchAssignment {
  branch_id: number;
  is_primary: boolean;
  name?: string;
}

export interface User {
  id: number;
  name: string;
  last_name: string;
  email: string;
  identification: string;
  phone: string | null;
  role: 'admin' | 'specialist' | 'receptionist';
  created_at?: string;
  updated_at?: string;
  branch_assignments?: UserBranchAssignment[];
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

export type PaginatedUsers = {
  data: User[];
  last_page: number;
  total: number;
};

class UserService {
  private readonly baseUrl = '/api/v1/users';

  async getUsers(params: { page?: number; per_page?: number; search?: string; branch_id?: string }): Promise<PaginatedUsers> {
    const { page = 1, per_page = 15, search, branch_id } = params;
    const query: Record<string, string | number> = {
      page,
      per_page,
      sort: 'name,asc',
    };
    const t = search?.trim();
    if (t) {
      query.s_f = JSON.stringify(['name', 'email']);
      query.s_v = JSON.stringify([`%${t}%`, `%${t}%`]);
      query.s_o = 'or';
    }
    if (branch_id && branch_id !== 'all' && branch_id !== '0') {
      query.branch_id = branch_id;
    }
    const response = await axios.get(this.baseUrl, { params: query });
    const body = response.data;
    return {
      data: Array.isArray(body.data) ? body.data : [],
      last_page: body.meta?.last_page ?? 1,
      total: body.meta?.total ?? 0,
    };
  }

  async getAll(branchId?: string): Promise<User[]> {
    const res = await this.getUsers({ page: 1, per_page: 100, branch_id: branchId });
    return res.data;
  }

  async getById(id: number): Promise<User> {
    const response = await axios.get(`${this.baseUrl}/${id}`);
    const body = response.data;
    return (body?.data ?? body) as User;
  }

  async create(data: CreateUserData): Promise<User> {
    const response = await axios.post(this.baseUrl, data);
    const body = response.data;
    return (body?.data ?? body) as User;
  }

  async update(id: number, data: UpdateUserData): Promise<void> {
    await axios.put(`${this.baseUrl}/${id}`, data);
  }

  async delete(id: number): Promise<void> {
    await axios.delete(`${this.baseUrl}/${id}`);
  }
}

export const userService = new UserService();
