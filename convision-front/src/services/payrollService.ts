import api from '@/lib/axios';

export interface Payroll {
  id: number;
  employee_name: string;
  employee_identification: string;
  employee_position: string;
  pay_period_start: string;
  pay_period_end: string;
  base_salary: number;
  overtime_hours: number;
  overtime_rate: number;
  overtime_amount: number;
  bonuses: number;
  commissions: number;
  other_income: number;
  gross_salary: number;
  health_deduction: number;
  pension_deduction: number;
  tax_deduction: number;
  other_deductions: number;
  total_deductions: number;
  net_salary: number;
  payment_date?: string;
  payment_method_id?: number;
  payment_method?: {
    id: number;
    name: string;
  };
  reference?: string;
  notes?: string;
  status: 'pending' | 'paid' | 'cancelled';
  created_by_user_id: number;
  created_by?: {
    id: number;
    name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface PayrollStats {
  total_payrolls: number;
  total_paid: number;
  total_employees: number;
  pending_payrolls: number;
  average_salary: number;
  total_bonuses: number;
  total_deductions: number;
}

export interface PayrollFilters {
  search?: string;
  status?: string;
  employee_identification?: string;
  pay_period_start?: string;
  pay_period_end?: string;
  page?: number;
  per_page?: number;
}

export interface CreatePayrollData {
  employee_name: string;
  employee_identification: string;
  employee_position: string;
  pay_period_start: string;
  pay_period_end: string;
  base_salary: number;
  overtime_hours?: number;
  overtime_rate?: number;
  bonuses?: number;
  commissions?: number;
  other_income?: number;
  health_deduction?: number;
  pension_deduction?: number;
  tax_deduction?: number;
  other_deductions?: number;
  payment_date?: string;
  payment_method_id?: number;
  reference?: string;
  notes?: string;
}

export interface UpdatePayrollData extends Partial<CreatePayrollData> {
  status?: string;
}

export interface CalculatePayrollData {
  base_salary: number;
  overtime_hours?: number;
  overtime_rate?: number;
  bonuses?: number;
  commissions?: number;
  other_income?: number;
  health_deduction?: number;
  pension_deduction?: number;
  tax_deduction?: number;
  other_deductions?: number;
}

export interface PayrollCalculation {
  base_salary: number;
  overtime_hours: number;
  overtime_rate: number;
  overtime_amount: number;
  bonuses: number;
  commissions: number;
  other_income: number;
  gross_salary: number;
  health_deduction: number;
  pension_deduction: number;
  tax_deduction: number;
  other_deductions: number;
  total_deductions: number;
  net_salary: number;
}

class PayrollService {
  async getPayrolls(filters: PayrollFilters = {}) {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.employee_identification) params.append('employee_identification', filters.employee_identification);
    if (filters.pay_period_start) params.append('pay_period_start', filters.pay_period_start);
    if (filters.pay_period_end) params.append('pay_period_end', filters.pay_period_end);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.per_page) params.append('per_page', filters.per_page.toString());

    const response = await api.get(`/api/v1/payrolls?${params.toString()}`);
    return response.data;
  }

  async getPayroll(id: number): Promise<Payroll> {
    const response = await api.get(`/api/v1/payrolls/${id}`);
    return response.data.data;
  }

  async createPayroll(data: CreatePayrollData): Promise<Payroll> {
    const response = await api.post('/api/v1/payrolls', data);
    return response.data.data;
  }

  async updatePayroll(id: number, data: UpdatePayrollData): Promise<Payroll> {
    const response = await api.put(`/api/v1/payrolls/${id}`, data);
    return response.data.data;
  }

  async deletePayroll(id: number): Promise<void> {
    await api.delete(`/api/v1/payrolls/${id}`);
  }

  async getStats(): Promise<PayrollStats> {
    const response = await api.get('/api/v1/payrolls/stats');
    return response.data;
  }

  async calculatePayroll(data: CalculatePayrollData): Promise<PayrollCalculation> {
    const response = await api.post('/api/v1/payrolls/calculate', data);
    return response.data;
  }

  async exportPayrolls(filters: PayrollFilters = {}): Promise<Blob> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.employee_identification) params.append('employee_identification', filters.employee_identification);
    if (filters.pay_period_start) params.append('pay_period_start', filters.pay_period_start);
    if (filters.pay_period_end) params.append('pay_period_end', filters.pay_period_end);

    const response = await api.get(`/api/v1/payrolls/export?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async getPaymentMethods(): Promise<Array<{ id: number; name: string }>> {
    const response = await api.get('/api/v1/payment-methods');
    return response.data.data;
  }

  async getEmployees(): Promise<Array<{ id: number; name: string; base_salary: number }>> {
    const response = await api.get('/api/v1/users?role=employee');
    return response.data.data.map((user: { id: number; name: string; base_salary?: number }) => ({
      id: user.id,
      name: user.name,
      base_salary: user.base_salary || 0,
    }));
  }
}

export const payrollService = new PayrollService(); 