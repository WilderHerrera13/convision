import React, { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import PageLayout from '@/components/layouts/PageLayout';
import { specialistReportService } from '@/services/specialistReportService';

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  effective:          { label: 'Consulta Efectiva',  cls: 'bg-[#ebf5ef] text-[#228b52]' },
  formula_sale:       { label: 'Venta Fórmula',      cls: 'bg-[#eff1ff] text-[#3a71f7]' },
  ineffective:        { label: 'No Efectiva',         cls: 'bg-[#ffeeed] text-[#b82626]' },
  follow_up:          { label: 'Ctrl. Seguimiento',   cls: 'bg-[#fff6e3] text-[#b57218]' },
  warranty_follow_up: { label: 'Seg. Garantías',      cls: 'bg-[#f9f9fb] text-[#7d7d87]'  },
};

function TypeBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-[#b4b5bc]">—</span>;
  const b = TYPE_BADGE[type];
  return b ? (
    <span className={`text-[11px] font-semibold px-2.5 py-[3px] rounded-full ${b.cls}`}>{b.label}</span>
  ) : (
    <span>{type}</span>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-[#e5e5e9] rounded-[8px] px-5 py-4 flex flex-col gap-[5px] flex-1">
      <p className="text-[11px] text-[#7d7d87]">{label}</p>
      <p className="text-[24px] font-semibold text-[#121215]">{value}</p>
    </div>
  );
}

const SpecialistManagementReportDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const from = searchParams.get('from') ?? '';
  const to   = searchParams.get('to')   ?? '';

  const { data, isLoading } = useQuery({
    queryKey: ['specialist-report-detail', id, from, to, search, page],
    queryFn: () =>
      specialistReportService.getSpecialistDetail(Number(id), { from, to, search, page, perPage: 15 }),
    enabled: !!id,
  });

  const sp       = data?.specialist;
  const kpis     = data?.kpis;
  const recs     = data?.records;
  const lastPage = recs?.last_page ?? 1;

  const initials = sp
    ? `${sp.name[0] ?? ''}${sp.last_name?.[0] ?? ''}`.toUpperCase()
    : '??';
  const fullName = sp ? `${sp.name} ${sp.last_name ?? ''}`.trim() : '—';
  const total    = kpis
    ? kpis.effective + kpis.formula_sale + kpis.ineffective + kpis.follow_up + kpis.warranty_follow_up
    : 0;

  const firstRow = recs ? (page - 1) * 15 + 1 : 0;
  const lastRow  = recs ? Math.min(page * 15, Number(recs.total)) : 0;

  return (
    <PageLayout
      title={`${fullName} — Detalle de Gestión`}
      subtitle="Informe de Gestión Especialista"
    >
      <div className="flex flex-col gap-4">
        {/* Profile card */}
        <div className="bg-white border border-[#e5e5e9] rounded-[8px] px-5 py-5 flex items-center gap-6">
          <div className="bg-[#e5f6ef] rounded-full size-[52px] flex items-center justify-center shrink-0">
            <span className="text-[16px] font-semibold text-[#0f8f64]">{initials}</span>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[15px] font-semibold text-[#0f0f12]">{fullName}</p>
            <p className="text-[12px] text-[#7d7d87]">Especialista</p>
            <span className="bg-[#e5f6ef] text-[#0f8f64] text-[11px] font-semibold px-2.5 py-[4px] rounded-full w-fit">
              Especialista
            </span>
          </div>
          <div className="flex gap-16 ml-auto">
            <div>
              <p className="text-[11px] text-[#7d7d87]">Total atenciones</p>
              <p className="text-[15px] font-semibold text-[#0f0f12]">{total}</p>
            </div>
            <div>
              <p className="text-[11px] text-[#7d7d87]">Período analizado</p>
              <p className="text-[15px] font-semibold text-[#0f0f12]">
                {from && to ? `${from} – ${to}` : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div className="flex gap-4">
          <KpiCard label="Consultas Efectivas" value={kpis?.effective ?? 0} />
          <KpiCard label="Venta Fórmula"       value={kpis?.formula_sale ?? 0} />
          <KpiCard label="No Efectivas"         value={kpis?.ineffective ?? 0} />
          <KpiCard label="Ctrl. Seguimiento"   value={kpis?.follow_up ?? 0} />
          <KpiCard label="Seg. Garantías"       value={kpis?.warranty_follow_up ?? 0} />
        </div>

        {/* Attendance table */}
        <div className="bg-white border border-[#ebebee] rounded-[8px] overflow-hidden">
          <div className="flex items-center justify-between px-5 h-[52px] border-b border-[#f1f1f3]">
            <p className="text-[13px] font-semibold text-[#0f0f12]">Registro de atenciones</p>
            <input
              type="text"
              placeholder="Buscar paciente..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="bg-white border border-[#e0e0e4] h-[34px] w-[220px] rounded-[6px] px-3 text-[12px] placeholder:text-[#b4b5bc] outline-none"
            />
          </div>

          <table className="w-full text-[13px]">
            <thead className="bg-[#f5f5f6] border-y border-[#e5e5ea]">
              <tr>
                {['FECHA', 'PACIENTE', 'TIPO DE CONSULTA', 'SEDE', 'OBSERVACIÓN'].map((h) => (
                  <th
                    key={h}
                    className="text-left text-[11px] font-semibold text-[#7d7d87] tracking-[0.4px] px-4 py-2.5"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="text-center text-[#7d7d87] py-10 text-[13px]">
                    Cargando...
                  </td>
                </tr>
              )}
              {!isLoading && (recs?.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-[#7d7d87] py-10 text-[13px]">
                    Sin registros para el período seleccionado
                  </td>
                </tr>
              )}
              {(recs?.data ?? []).map((rec, idx) => (
                <tr
                  key={rec.id}
                  className={`border-b border-[#f1f1f3] ${idx % 2 === 1 ? 'bg-[#fafafa]' : 'bg-white'}`}
                >
                  <td className="px-4 py-3 text-[#7d7d87] whitespace-nowrap">
                    {rec.scheduled_at ? format(new Date(rec.scheduled_at), 'dd/MM/yy') : '—'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-[#0f0f12]">
                    {rec.patient ? `${rec.patient.first_name} ${rec.patient.last_name}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge type={rec.consultation_type} />
                  </td>
                  <td className="px-4 py-3 text-[#7d7d87]">—</td>
                  <td className="px-4 py-3 text-[#7d7d87] max-w-[400px]">
                    <span className="line-clamp-2 text-[12px]">{rec.report_notes || '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="border-t border-[#f1f1f3] px-5 py-3 flex items-center justify-between">
            <p className="text-[12px] text-[#7d7d87]">
              Mostrando {firstRow}–{lastRow} de {recs?.total ?? 0} registros
            </p>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="size-8 flex items-center justify-center border border-[#e5e5e9] rounded-[6px] text-[13px] text-[#7d7d87] disabled:opacity-40 hover:bg-[#f5f5f6]"
              >
                ←
              </button>
              {Array.from({ length: Math.min(lastPage, 5) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`size-8 flex items-center justify-center rounded-[6px] text-[12px] ${
                    page === p
                      ? 'bg-[#3a71f7] text-white font-semibold'
                      : 'border border-[#e5e5e9] text-[#7d7d87] hover:bg-[#f5f5f6]'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={page >= lastPage}
                onClick={() => setPage((p) => p + 1)}
                className="size-8 flex items-center justify-center border border-[#e5e5e9] rounded-[6px] text-[13px] text-[#0f0f12] disabled:opacity-40 hover:bg-[#f5f5f6]"
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default SpecialistManagementReportDetalle;
