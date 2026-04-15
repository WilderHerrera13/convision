import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { CustomerAttention, Operations } from '@/services/dailyActivityReportService';

type Row = {
  label: string;
  men: number | null;
  women: number | null;
  children: number | null;
  scalarOnly?: boolean;
};

const ReadCell: React.FC<{ value: number | null; scalarOnly?: boolean; column: 'm' | 'w' | 'c' }> = ({
  value,
  scalarOnly,
  column,
}) => {
  if (scalarOnly && (column === 'w' || column === 'c')) {
    return <span className="text-[12px] text-[#b0b0bc]">—</span>;
  }
  const n = value ?? 0;
  return <span className="text-[12px] font-normal text-[#0f0f12] tabular-nums">{n}</span>;
};

function buildRows(ca: CustomerAttention, op: Operations): Row[] {
  return [
    {
      label: 'Preguntas',
      men: ca.questions_men,
      women: ca.questions_women,
      children: ca.questions_children,
    },
    {
      label: 'Cotizaciones',
      men: ca.quotes_men,
      women: ca.quotes_women,
      children: ca.quotes_children,
    },
    {
      label: 'Consultas Efectivas',
      men: ca.effective_consultations_men,
      women: ca.effective_consultations_women,
      children: ca.effective_consultations_children,
    },
    {
      label: 'Consulta Venta Fórmula',
      men: ca.formula_sale_consultations_men,
      women: ca.formula_sale_consultations_women,
      children: ca.formula_sale_consultations_children,
    },
    {
      label: 'Consultas No Efectivas',
      men: ca.non_effective_consultations_men,
      women: ca.non_effective_consultations_women,
      children: ca.non_effective_consultations_children,
    },
    {
      label: 'Bonos entregados',
      men: op.bonos_entregados,
      women: null,
      children: null,
      scalarOnly: true,
    },
    {
      label: 'Bonos redimidos',
      men: op.bonos_redimidos,
      women: null,
      children: null,
      scalarOnly: true,
    },
    {
      label: 'Sistecréditos realizados',
      men: op.sistecreditos_realizados,
      women: null,
      children: null,
      scalarOnly: true,
    },
    {
      label: 'Addi realizados',
      men: op.addi_realizados,
      women: null,
      children: null,
      scalarOnly: true,
    },
  ];
}

const DailyReportAttentionTable: React.FC<{
  customerAttention: CustomerAttention;
  operations: Operations;
}> = ({ customerAttention, operations }) => {
  const rows = buildRows(customerAttention, operations);

  return (
    <div className="overflow-hidden rounded-lg border border-[#e5e5e9] bg-white">
      <div className="border-b border-[#c5d3f8] bg-[#eff1ff] px-4 py-3">
        <p className="text-[13px] font-semibold text-[#3a71f7]">Atención al Cliente</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-b border-[#dcdce0] bg-[#f5f5f7] hover:bg-[#f5f5f7]">
            <TableHead className="h-9 w-[320px] text-[11px] font-semibold text-[#7d7d87]">Métrica</TableHead>
            <TableHead className="h-9 text-[11px] font-semibold text-[#7d7d87]">Hombres</TableHead>
            <TableHead className="h-9 text-[11px] font-semibold text-[#7d7d87]">Mujeres</TableHead>
            <TableHead className="h-9 text-[11px] font-semibold text-[#7d7d87]">Niños</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow
              key={row.label}
              className={`border-b border-[#dcdce0] ${i % 2 === 1 ? 'bg-[#f7f7f8]' : 'bg-white'}`}
            >
              <TableCell className="py-2 text-[12px] text-[#0f0f12]">{row.label}</TableCell>
              <TableCell className="py-2">
                <div className="flex min-h-[24px] items-center rounded border border-[#dcdce0] bg-white px-2">
                  <ReadCell value={row.men} scalarOnly={row.scalarOnly} column="m" />
                </div>
              </TableCell>
              <TableCell className="py-2">
                <div className="flex min-h-[24px] items-center rounded border border-[#dcdce0] bg-white px-2">
                  <ReadCell value={row.women} scalarOnly={row.scalarOnly} column="w" />
                </div>
              </TableCell>
              <TableCell className="py-2">
                <div className="flex min-h-[24px] items-center rounded border border-[#dcdce0] bg-white px-2">
                  <ReadCell value={row.children} scalarOnly={row.scalarOnly} column="c" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default DailyReportAttentionTable;
