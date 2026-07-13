import { useState } from 'react';
import SearchableCombobox from '@/components/ui/SearchableCombobox';
import { searchIcd10Codes, icd10CodesToOptions, type Icd10Code } from '@/services/icd10Service';

interface Props {
  label: string;
  code: string;
  desc: string;
  onSelect: (code: string, desc: string) => void;
  onClear: () => void;
}

export function Icd10ComboboxField({ label, code, desc, onSelect, onClear }: Props) {
  const [codes, setCodes] = useState<Icd10Code[]>(code && desc ? [{ id: 0, code, description: desc, is_active: true }] : []);
  const [isLoading, setIsLoading] = useState(false);
  const filled = !!code;

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsLoading(true);
    try {
      const results = await searchIcd10Codes(query);
      setCodes(results);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (value: string) => {
    if (!value) {
      onClear();
      return;
    }
    const match = codes.find((c) => c.code === value);
    onSelect(value, match?.description ?? '');
  };

  return (
    <div className={`border rounded-[6px] px-3 pt-1.5 pb-2.5 ${filled ? 'border-[#0f8f64] bg-[#e5f6ef]' : 'border-[#e0e0e4] bg-white'}`}>
      <p className={`text-[11px] font-medium mb-1.5 ${filled ? 'text-[#0f8f64]' : 'text-[#7d7d87]'}`}>{label}</p>
      <SearchableCombobox
        options={icd10CodesToOptions(codes)}
        value={code}
        onChange={handleChange}
        onSearch={handleSearch}
        isLoading={isLoading}
        placeholder="Buscar código o descripción CIE-10..."
        searchPlaceholder="Ej: H52, miopía, astigmatismo..."
        emptyText="Sin coincidencias en el catálogo CIE-10"
        className={filled ? 'border-[#0f8f64] bg-[#e5f6ef]' : ''}
      />
    </div>
  );
}
