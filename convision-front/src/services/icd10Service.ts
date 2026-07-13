import api from '@/lib/axios';
import type { ComboboxOption } from '@/components/ui/SearchableCombobox';

export interface Icd10Code {
  id: number;
  code: string;
  description: string;
  chapter?: string;
  is_active: boolean;
}

interface Icd10ListResponse {
  data: Icd10Code[];
  total: number;
  page: number;
  per_page: number;
}

export const searchIcd10Codes = async (search: string): Promise<Icd10Code[]> => {
  const response = await api.get<Icd10ListResponse>('/api/v1/icd10-codes', {
    params: { search, per_page: 20 },
  });
  return response.data.data;
};

export const icd10CodesToOptions = (codes: Icd10Code[]): ComboboxOption[] =>
  codes.map((c) => ({ value: c.code, label: c.code, sublabel: c.description }));
