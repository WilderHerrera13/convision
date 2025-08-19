import api from '@/lib/axios';

export interface Expense {
  id: number;
  supplier_id: number;
  supplier?: {
    id: number;
    name: string;
    nit?: string;
  };
  invoice_number: string;
  concept: string;
  description?: string;
  expense_date: string;
  amount: number;
  payment_amount: number;
  balance: number;
  tax_excluded: boolean;
  payment_method_id?: number;
  payment_method?: {
    id: number;
    name: string;
  };
  reference?: string;
  notes?: string;
  status: 'pending' | 'partial' | 'paid';
  created_by_user_id: number;
  created_by?: {
    id: number;
    name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseData {
  supplier_id: number;
  invoice_number: string;
  concept: string;
  description?: string;
  expense_date: string;
  amount: number;
  payment_amount?: number;
  tax_excluded?: boolean;
  payment_method_id?: number;
  reference?: string;
  notes?: string;
}

export type UpdateExpenseData = Partial<CreateExpenseData>;

export interface ExpenseResponse {
  data: Expense[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface AddExpensePaymentData {
  payment_method_id: number;
  amount: number;
  payment_date: string;
  reference?: string;
  notes?: string;
}

class ExpenseService {
  async getExpenses(params?: Record<string, unknown>): Promise<ExpenseResponse> {
    const response = await api.get('/api/v1/expenses', { params });
    return response.data;
  }

  async getExpense(id: number): Promise<Expense> {
    const response = await api.get(`/api/v1/expenses/${id}`);
    return response.data;
  }

  async createExpense(data: CreateExpenseData): Promise<Expense> {
    const response = await api.post('/api/v1/expenses', data);
    return response.data;
  }

  async updateExpense(id: number, data: UpdateExpenseData): Promise<Expense> {
    const response = await api.put(`/api/v1/expenses/${id}`, data);
    return response.data;
  }

  async deleteExpense(id: number): Promise<void> {
    await api.delete(`/api/v1/expenses/${id}`);
  }

  async addPayment(id: number, data: AddExpensePaymentData): Promise<{ message: string; expense: Expense }> {
    const response = await api.post(`/api/v1/expenses/${id}/payments`, data);
    return response.data;
  }
}

export const expenseService = new ExpenseService(); 