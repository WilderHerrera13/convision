import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfDay } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import PageLayout from '@/components/layouts/PageLayout';
import {
  specialistReportService,
  SpecialistSummaryRow,
} from '@/services/specialistReportService';
import { userService } from '@/services/userService';
import SpecialistReportsFiltersBar from '@/components/admin/SpecialistReportsFiltersBar';
import { computeAggregatedPreset } from '@/components/admin/AdminDateRangeBranchBar';

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
const fmtDisplay = (d: Date) => format(d, 'dd/MM/yyyy');

type KpiCardProps = {
  label: string;
  value: number;
  delta?: number;
  variant?: 'positive' | 'negative' | 'neutral';
};

function KpiCard({ label, value, delta, variant = 'neutral' }: KpiCardProps) {
  const deltaColor =
    variant === 'positive'
      ? 'text-[#228b52]'
      : variant === 'negative'
        ? 'text-[#b82626]'
        : 'text-[#7d7d87]';
  return (
    <div className="bg-white border border-[#e5e5e9] rounded-[8px] px-5 py-4 flex flex-col gap-[5px] min-w-[200px] flex-1">
      <p className="text-[11px] text-[#7d7d87]">{label}</p>
      <p className="text-[24px] font-semibold text-[#121215]">{value}</p>
      {delta !== undefined && (
        <p className={`text-[11px] ${deltaColor}`}>
          {delta >= 0 ? `↑ +${delta}` : `↓ ${delta}`} vs período ant.
        </p>
      )}
    </div>
  );
}

const SpecialistManagementReport: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'consolidado' | 'lista'>('consolidado');
  const defaultRange = computeAggregatedPreset('14d');
  const [dateFrom, setDateFrom] = useState<Date>(() => startOfDay(defaultRange.from));
  const [dateTo, setDateTo] = useState<Date>(() => startOfDay(defaultRange.to));
  const [selectedSpecialistId, setSelectedSpecialistId] = useState<string>('all');
  const [selectedSedeId, setSelectedSedeId] = useState<string>('all');
  const [specialistSearch, setSpecialistSearch] = useState('');

  const handleRangeChange = useCallback((from: Date, to: Date) => {
    setDateFrom(startOfDay(from));
    setDateTo(startOfDay(to));
  }, []);

  const fromStr = fmt(dateFrom);
  const toStr = fmt(dateTo);

  const { data: specialists = [] } = useQuery({
    queryKey: ['specialists-list'],
    queryFn: () => userService.getAll(),
    select: (users) => users.filter((u) => u.role === 'specialist'),
  });

  const listaBranchFilterActive = activeTab === 'lista' && selectedSedeId !== 'all';

  const {
    data: reportListaBranch,
    isFetching: listaBranchFetching,
    isError: listaBranchError,
  } = useQuery({
    queryKey: ['specialist-report-consolidated-lista', fromStr, toStr, selectedSedeId],
    queryFn: () =>
      specialistReportService.getConsolidated({
        from: fromStr,
        to: toStr,
        branchId: selectedSedeId !== 'all' ? Number(selectedSedeId) : 0,
      }),
    enabled: listaBranchFilterActive,
  });

  const { data: report, isLoading } = useQuery({
    queryKey: ['specialist-report-consolidated', fromStr, toStr, selectedSpecialistId, selectedSedeId],
    queryFn: () =>
      specialistReportService.getConsolidated({
        from: fromStr,
        to: toStr,
        specialistIds:
          selectedSpecialistId !== 'all' ? [Number(selectedSpecialistId)] : undefined,
        branchId: selectedSedeId !== 'all' ? Number(selectedSedeId) : 0,
      }),
    enabled: activeTab === 'consolidado',
  });

  const kpis = report?.kpis;
  const rows = useMemo(() => report?.rows ?? [], [report]);

  const totals = useMemo(
    () => ({
      effective: rows.reduce((s, r) => s + r.effective, 0),
      formula_sale: rows.reduce((s, r) => s + r.formula_sale, 0),
      ineffective: rows.reduce((s, r) => s + r.ineffective, 0),
      follow_up: rows.reduce((s, r) => s + r.follow_up, 0),
      warranty_follow_up: rows.reduce((s, r) => s + r.warranty_follow_up, 0),
      total: rows.reduce((s, r) => s + r.total, 0),
    }),
    [rows],
  );

  const daysDiff = useMemo(
    () => Math.round((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    [dateFrom, dateTo],
  );

  const filteredSpecialists = useMemo(
    () =>
      specialists.filter((s) =>
        `${s.name} ${s.last_name}`.toLowerCase().includes(specialistSearch.toLowerCase()),
      ),
    [specialists, specialistSearch],
  );

  const specialistsForLista = useMemo(() => {
    let list: typeof specialists;
    if (listaBranchFilterActive) {
      if (!reportListaBranch) return [];
      const branchRows = reportListaBranch.rows;
      if (!branchRows?.length) return [];
      const ids = new Set(branchRows.map((r) => r.specialist_id));
      list = filteredSpecialists.filter((s) => ids.has(s.id));
    } else {
      list = filteredSpecialists;
    }
    if (selectedSpecialistId !== 'all') {
      list = list.filter((s) => String(s.id) === selectedSpecialistId);
    }
    return list;
  }, [
    listaBranchFilterActive,
    reportListaBranch,
    filteredSpecialists,
    selectedSpecialistId,
  ]);

  const statusRightText = useMemo(() => {
    const count =
      activeTab === 'consolidado'
        ? report?.specialists_count ?? rows.length
        : specialistsForLista.length;
    return `${daysDiff} ${daysDiff === 1 ? 'día' : 'días'} · ${count} especialistas`;
  }, [activeTab, report?.specialists_count, rows.length, specialistsForLista.length, daysDiff]);

  return (
    <PageLayout
      title="Informe de Gestión Especialista"
      breadcrumbs={[{ label: 'Administración' }, { label: 'Informe de Gestión Especialista' }]}
    >
      <div className="bg-white border border-[#ebebee] rounded-[8px] mx-6 mt-5">
        <div className="bg-[#fafafb] border-b border-[#e5e5e9] flex h-[48px]">
          {(['consolidado', 'lista'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-6 text-[13px] h-full ${
                activeTab === tab
                  ? 'font-semibold text-[#0f0f12]'
                  : 'font-normal text-[#7d7d87]'
              }`}
            >
              {tab === 'consolidado' ? 'Consolidado' : 'Lista de reportes'}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#3a71f7]" />
              )}
            </button>
          ))}
        </div>

        <div className="border-b border-[#f0f0f2] px-5 py-3">
          <SpecialistReportsFiltersBar
            dateFrom={dateFrom}
            dateTo={dateTo}
            onRangeChange={handleRangeChange}
            specialists={specialists}
            selectedSpecialistId={selectedSpecialistId}
            onSpecialistChange={setSelectedSpecialistId}
            branchFilter={selectedSedeId}
            onBranchChange={setSelectedSedeId}
            statusRight={statusRightText}
          />
        </div>

        {activeTab === 'consolidado' && (
          <>
            <div className="flex gap-4 px-5 py-5 flex-wrap">
              <KpiCard label="Consultas Efectivas" value={kpis?.effective ?? 0} />
              <KpiCard label="Venta Fórmula" value={kpis?.formula_sale ?? 0} />
              <KpiCard label="Consultas No Efectivas" value={kpis?.ineffective ?? 0} />
              <KpiCard label="Control y Garantías" value={kpis?.follow_up ?? 0} />
            </div>

            <div className="border-t border-[#ebebee]">
              <div className="flex items-center justify-between px-5 py-3">
                <p className="text-[13px] font-semibold text-[#0f0f12]">
                  Consultas por tipo y especialista
                </p>
                <p className="text-[12px] text-[#7d7d87]">{rows.length} especialistas</p>
              </div>

              {isLoading ? (
                <p className="text-center text-[#7d7d87] py-12 text-[13px]">Cargando...</p>
              ) : (
                <table className="w-full text-[13px]">
                  <thead className="bg-[#f6f6f6] border-y border-[#e5e5ea]">
                    <tr>
                      {[
                        { key: 'name', label: 'ESPECIALISTA', w: '240px' },
                        { key: 'eff', label: 'CONS. EFECTIVAS', w: '130px' },
                        { key: 'fs', label: 'VENTA FÓRMULA', w: '130px' },
                        { key: 'in', label: 'NO EFECTIVAS', w: '130px' },
                        { key: 'fu', label: 'CTL. SEGUIMIENTO', w: '150px' },
                        { key: 'wf', label: 'SEG. GARANTÍAS', w: '150px' },
                        { key: 'total', label: 'TOTAL', w: '100px' },
                      ].map((col) => (
                        <th
                          key={col.key}
                          className="text-left text-[11px] font-semibold text-[#7d7d87] tracking-[0.4px] px-4 py-2.5 border-r border-[#e5e5ea] last:border-r-0"
                          style={{ width: col.w }}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row: SpecialistSummaryRow, idx) => (
                      <tr
                        key={row.specialist_id}
                        className={`border-b border-[#f1f1f3] cursor-pointer hover:bg-[#f9f9fb] ${idx % 2 === 1 ? 'bg-[#fafafa]' : 'bg-white'}`}
                        onClick={() =>
                          navigate(
                            `/admin/specialist-reports/${row.specialist_id}?from=${fromStr}&to=${toStr}`,
                          )
                        }
                      >
                        <td className="px-4 py-3 font-semibold text-[#0f0f12]">
                          {row.specialist_name}
                        </td>
                        <td className="px-4 py-3 text-[#7d7d87]">{row.effective}</td>
                        <td className="px-4 py-3 text-[#7d7d87]">{row.formula_sale}</td>
                        <td className="px-4 py-3 text-[#7d7d87]">{row.ineffective}</td>
                        <td className="px-4 py-3 text-[#7d7d87]">{row.follow_up}</td>
                        <td className="px-4 py-3 text-[#7d7d87]">{row.warranty_follow_up}</td>
                        <td className="px-4 py-3 text-[#7d7d87]">{row.total}</td>
                      </tr>
                    ))}
                    {rows.length > 0 && (
                      <tr className="bg-[#f0f7f4]">
                        <td className="px-4 py-3 font-semibold text-[#3a71f7] text-[13px]">
                          TOTALES
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#0f0f12]">{totals.effective}</td>
                        <td className="px-4 py-3 font-semibold text-[#0f0f12]">{totals.formula_sale}</td>
                        <td className="px-4 py-3 font-semibold text-[#0f0f12]">{totals.ineffective}</td>
                        <td className="px-4 py-3 font-semibold text-[#0f0f12]">{totals.follow_up}</td>
                        <td className="px-4 py-3 font-semibold text-[#0f0f12]">{totals.warranty_follow_up}</td>
                        <td className="px-4 py-3 font-semibold text-[#0f0f12]">{totals.total}</td>
                      </tr>
                    )}
                    {rows.length === 0 && !isLoading && (
                      <tr>
                        <td colSpan={7} className="text-center text-[#7d7d87] py-10 text-[13px]">
                          Sin datos para el período seleccionado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
              <div className="border-t border-[#f1f1f3] px-5 py-3">
                <p className="text-[12px] text-[#7d7d87]">
                  Mostrando 1–{rows.length} de {rows.length} especialistas
                </p>
              </div>
            </div>

            {rows.some((r) => r.observation) && (
              <div className="border-t border-[#ebebee]">
                <div className="px-5 py-4">
                  <p className="text-[13px] font-semibold text-[#0f0f12] mb-4">
                    Observaciones por especialista
                  </p>
                  <div className="flex flex-col gap-6">
                    {rows
                      .filter((r) => r.observation)
                      .map((row) => (
                        <div key={row.specialist_id}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-[#eff1ff] text-[#3a71f7] text-[12px] font-semibold px-2 py-0.5 rounded-[4px]">
                              {row.specialist_name}
                            </span>
                          </div>
                          <p className="text-[12px] text-[#0f0f12] leading-relaxed">
                            {row.observation}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
                <p className="text-[11px] text-[#7d7d87] px-5 pb-4">
                  Datos del período {fmtDisplay(dateFrom)} – {fmtDisplay(dateTo)} · Registros guardados por
                  cada especialista.
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === 'lista' && (
          <div>
            <div className="flex items-center justify-between px-5 h-[56px] border-b border-[#e5e5e9] gap-3">
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="text-[14px] font-semibold text-[#121215]">Médicos con reportes de gestión</p>
                <p className="text-[11px] text-[#7d7d87]">
                  {specialistsForLista.length} especialistas
                  {listaBranchFilterActive && ` · ${fmtDisplay(dateFrom)} – ${fmtDisplay(dateTo)}`}
                </p>
              </div>
              <div className="flex items-center shrink-0">
                <input
                  type="text"
                  placeholder="Buscar especialista..."
                  value={specialistSearch}
                  onChange={(e) => setSpecialistSearch(e.target.value)}
                  className="bg-white border border-[#e5e5e9] h-[34px] w-[220px] rounded-[6px] px-3 text-[12px] placeholder:text-[#b4b5bc] outline-none"
                />
              </div>
            </div>

            <div className="min-h-[200px]">
              {listaBranchFilterActive && listaBranchFetching && !reportListaBranch && (
                <p className="text-center text-[#7d7d87] py-10 text-[13px]">Cargando...</p>
              )}
              {listaBranchFilterActive && listaBranchError && (
                <p className="text-center text-[#7d7d87] py-10 text-[13px]">
                  No se pudo cargar el listado filtrado
                </p>
              )}
              {!(
                listaBranchFilterActive &&
                (listaBranchFetching || !reportListaBranch || listaBranchError)
              ) &&
                specialistsForLista.length === 0 && (
                <p className="text-center text-[#7d7d87] py-10 text-[13px]">
                  {listaBranchFilterActive
                    ? 'Sin especialistas con actividad en esta sede para el período'
                    : 'No hay especialistas registrados'}
                </p>
              )}
              {specialistsForLista.map((specialist, idx) => {
                const initials = `${specialist.name?.[0] ?? ''}${specialist.last_name?.[0] ?? ''}`.toUpperCase();
                return (
                  <div
                    key={specialist.id}
                    onClick={() =>
                      navigate(
                        `/admin/specialist-reports/${specialist.id}?from=${fromStr}&to=${toStr}`,
                      )
                    }
                    className={`flex items-center h-[64px] border-b border-[#f1f1f3] cursor-pointer hover:bg-[#f9f9fb] px-5 transition-colors ${idx % 2 === 1 ? 'bg-[#fafafa]' : 'bg-white'}`}
                  >
                    <div className="size-9 rounded-full bg-[#e5f6ef] flex items-center justify-center shrink-0 mr-3">
                      <span className="text-[12px] font-semibold text-[#0f8f64]">{initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-[#0f0f12]">
                        {specialist.name} {specialist.last_name}
                      </p>
                      <p className="text-[11px] text-[#7d7d87]">Especialista</p>
                    </div>
                    <span className="bg-[#e5f6ef] text-[#0f8f64] text-[11px] font-semibold px-2.5 py-1 rounded-full mr-4 shrink-0">
                      Especialista
                    </span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#b4b5bc"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="shrink-0"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-[#e5e5e9] px-5 h-[48px] flex items-center">
              <span className="text-[12px] text-[#7d7d87]">
                Mostrando{' '}
                <span className="bg-[#f5f5f6] text-[#121215] font-semibold px-1.5 py-0.5 rounded-[4px] text-[12px]">
                  1–{specialistsForLista.length}
                </span>{' '}
                de {specialists.length} especialistas
              </span>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default SpecialistManagementReport;
