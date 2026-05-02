import axios from '@/lib/axios';

export interface Branch {
  id: number;
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  is_active: boolean;
}

export interface BranchPayload {
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  is_active: boolean;
}

export interface UserBranchAssignment {
  branch_id: number;
  is_primary: boolean;
}

type BranchTableParams = {
  page?: number;
  per_page?: number;
  search?: string;
};

class BranchService {
  private readonly baseUrl = '/api/v1/branches';

  async listAll(): Promise<Branch[]> {
    const response = await axios.get(this.baseUrl);
    return Array.isArray(response.data?.data) ? response.data.data : [];
  }

  async getById(id: number): Promise<Branch> {
    const response = await axios.get(`${this.baseUrl}/${id}`);
    return response.data as Branch;
  }

  async getForTable(params: BranchTableParams): Promise<{ data: Branch[]; last_page: number; total: number }> {
    const { page = 1, per_page = 15, search } = params;
    const all = await this.listAll();
    const term = search?.trim().toLowerCase();
    const filtered = term
      ? all.filter((branch) =>
          [branch.name, branch.city, branch.address, branch.email, branch.phone]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(term)),
        )
      : all;
    const total = filtered.length;
    const last_page = Math.max(1, Math.ceil(total / per_page));
    const start = (page - 1) * per_page;
    const data = filtered.slice(start, start + per_page);
    return { data, last_page, total };
  }

  async create(payload: BranchPayload): Promise<Branch> {
    const response = await axios.post(this.baseUrl, payload);
    return response.data as Branch;
  }

  async update(id: number, payload: Partial<BranchPayload>): Promise<Branch> {
    const response = await axios.put(`${this.baseUrl}/${id}`, payload);
    return response.data as Branch;
  }

  async assignUserBranches(userId: number, assignments: UserBranchAssignment[]): Promise<void> {
    await axios.post(`${this.baseUrl}/users/${userId}/assign`, { assignments });
  }
}

export const branchService = new BranchService();
