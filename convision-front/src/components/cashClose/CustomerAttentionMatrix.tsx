import React from 'react';
import { Input } from '@/components/ui/input';
import { CustomerAttention } from '@/services/dailyActivityReportService';

const ROWS: { label: string; men: keyof CustomerAttention; women: keyof CustomerAttention; children: keyof CustomerAttention }[] = [
  { label: 'Preguntas', men: 'questions_men', women: 'questions_women', children: 'questions_children' },
  { label: 'Cotizaciones', men: 'quotes_men', women: 'quotes_women', children: 'quotes_children' },
  { label: 'Consultas Efectivas', men: 'effective_consultations_men', women: 'effective_consultations_women', children: 'effective_consultations_children' },
  { label: 'Consulta Venta Fórmula', men: 'formula_sale_consultations_men', women: 'formula_sale_consultations_women', children: 'formula_sale_consultations_children' },
  { label: 'Consultas No Efectivas', men: 'non_effective_consultations_men', women: 'non_effective_consultations_women', children: 'non_effective_consultations_children' },
];

interface Props {
  values: CustomerAttention;
  onChange: (key: string, value: number) => void;
  readOnly?: boolean;
}

const CustomerAttentionMatrix: React.FC<Props> = ({ values, onChange, readOnly }) => {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="bg-[#eff1ff] border-b border-[#c5d3f8] px-4 py-3">
        <h3 className="font-semibold text-sm text-[#3a71f7]">▾ Atención al Cliente</h3>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#f5f5f7] border-b border-[#dcdce0]">
            <th className="text-left px-3 py-2 font-semibold text-[11px] text-[#7d7d87] w-[240px]">Item</th>
            <th className="px-3 py-2 font-semibold text-[11px] text-[#7d7d87] border-l border-[#dcdce0] text-center">Hombres</th>
            <th className="px-3 py-2 font-semibold text-[11px] text-[#7d7d87] border-l border-[#dcdce0] text-center">Mujeres</th>
            <th className="px-3 py-2 font-semibold text-[11px] text-[#7d7d87] border-l border-[#dcdce0] text-center">Niños</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, idx) => (
            <tr key={row.label} className={`border-b border-[#dcdce0] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#f5f5f7]'}`}>
              <td className="px-3 py-2 text-[#0f0f12] text-[12px]">{row.label}</td>
              {([row.men, row.women, row.children] as (keyof CustomerAttention)[]).map((field) => (
                <td key={field} className="px-3 py-[6px] border-l border-[#dcdce0] text-center">
                  {readOnly ? (
                    <span className="text-[13px] font-medium">{values[field] ?? 0}</span>
                  ) : (
                    <Input
                      type="number"
                      min={0}
                      value={values[field] || ''}
                      onChange={(e) => onChange(field, parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="h-7 text-sm text-center w-full max-w-[120px] mx-auto"
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CustomerAttentionMatrix;
