import api from '@/lib/axios';

export type PromotionType =
  | 'cart_total'
  | 'fixed_amount'
  | 'birthday'
  | 'category'
  | 'second_pair'
  | 'cross_product';

export type PromotionScope = 'cart' | 'category' | 'brand' | 'product_type';

export interface Promotion {
  id: number;
  name: string;
  type: PromotionType;
  active: boolean;
  priority: number;
  stackable: boolean;
  discount_percentage: number | null;
  discount_amount: number | null;
  min_cart_total: number | null;
  min_quantity: number | null;
  scope: PromotionScope;
  product_category_id: number | null;
  brand_id: number | null;
  product_type: string;
  trigger_scope: PromotionScope | '';
  trigger_product_category_id: number | null;
  trigger_brand_id: number | null;
  trigger_product_type: string;
  start_date: string | null;
  end_date: string | null;
  description: string;
  created_at?: string;
  updated_at?: string;
}

export interface PromotionInput {
  name: string;
  type: PromotionType;
  active?: boolean;
  priority?: number;
  stackable?: boolean;
  discount_percentage?: number | null;
  discount_amount?: number | null;
  min_cart_total?: number | null;
  min_quantity?: number | null;
  scope?: PromotionScope;
  product_category_id?: number | null;
  brand_id?: number | null;
  product_type?: string;
  trigger_scope?: PromotionScope | '';
  trigger_product_category_id?: number | null;
  trigger_brand_id?: number | null;
  trigger_product_type?: string;
  start_date?: string | null;
  end_date?: string | null;
  description?: string;
}

export interface PromotionListResult {
  data: Promotion[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface EvaluateItem {
  lens_id?: number;
  product_id?: number;
  product_type?: string;
  product_category_id?: number | null;
  brand_id?: number | null;
  quantity: number;
  price: number;
  line_discount?: number;
}

export interface AppliedPromotion {
  id: number;
  name: string;
  type: string;
  description: string;
  amount: number;
}

export interface EvaluateResult {
  promotions: AppliedPromotion[];
  total_discount: number;
}

export interface EvaluatePayload {
  patient_id?: number | null;
  patient_birth_date?: string | null;
  items: EvaluateItem[];
}

class PromotionService {
  async list(params?: { page?: number; per_page?: number; search?: string; type?: string; active?: boolean }): Promise<PromotionListResult> {
    const res = await api.get('/api/v1/promotions', { params });
    return res.data as PromotionListResult;
  }

  async get(id: number): Promise<Promotion> {
    const res = await api.get(`/api/v1/promotions/${id}`);
    return res.data as Promotion;
  }

  async create(input: PromotionInput): Promise<Promotion> {
    const res = await api.post('/api/v1/promotions', input);
    return res.data as Promotion;
  }

  async update(id: number, input: PromotionInput): Promise<Promotion> {
    const res = await api.put(`/api/v1/promotions/${id}`, input);
    return res.data as Promotion;
  }

  async remove(id: number): Promise<void> {
    await api.delete(`/api/v1/promotions/${id}`);
  }

  async evaluate(payload: EvaluatePayload): Promise<EvaluateResult> {
    const res = await api.post('/api/v1/promotions/evaluate', payload);
    return res.data as EvaluateResult;
  }
}

export const promotionService = new PromotionService();
