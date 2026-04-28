import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfMonth } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import PageLayout from '@/components/layouts/PageLayout';
import {
  specialistReportService,
  SpecialistSummaryRow,
} from '@/services/specialistReportService';
import { userService } from '@/services/userService';
import { branchService } from '@/services/branchService';
import { DatePicker } from '@/components/ui/date-picker';
import SearchableCombobox, { ComboboxOption } from '@/components/ui/SearchableCombobox';

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
const fmtDisplay = (d: Date) => format(d, 'dd/MM/yyyy');

type DatePreset = 'hoy' | '7d' | '14d' | 'mes';

function resolvePreset(preset: DatePreset): { from: Date; to: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (preset === 'hoy') return { from: today, to: today };
  if (preset === '7d') return { from: subDays(today, 6), to: today };
  if (preset === '14d') return { from: subDays(today, 13), to: today };
  return { from: startOfMonth(today), to: today };
}

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
  const [preset, setPreset] = useState<DatePreset>('14d');
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [selectedSpecialistId, setSelectedSpecialistId] = useState<string>('all');
  const [selectedSedeId, setSelectedSedeId] = useState<string>('all');
  const [specialistSearch, setSpecialistSearch] = useState('');

  const { from, to } = useMemo(() => {
    if (customFrom && customTo) return { from: customFrom, to: customTo };
    return resolvePreset(preset);
  }, [preset, customFrom, customTo]);

  const fromStr = fmt(from);
  const toStr = fmt(to);

  const { data: specialists = [] } = useQuery({
    queryKey: ['specialists-list'],
    queryFn: () => userService.getAll(),
    select: (users) => users.filter((u) => u.role === 'specialist'),
  });
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-list'],
    queryFn: () => branchService.listAll(),
  });

  const { data: report, isLoading } = useQuery({
    queryKey: ['specialist-report-consolidated', fromStr, toStr, selectedSpecialistId, selectedSedeId],
    queryFn: () =>
      specialistReportService.getConsolidated({
        from: fromStr,
        to: toStr,
        specialistIds:
          selectedSpecialistId !== 'all' ? [Number(selectedSpecialistId)] : undefined,
        branchId: selectedSedeId !== 'all' ? Number(selectedSedeId) : undefined,
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
    () => Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    [from, to],
  );

  const filteredSpecialists = useMemo(
    () =>
      specialists.filter((s) =>
        `${s.name} ${s.last_name}`.toLowerCase().includes(specialistSearch.toLowerCase()),
      ),
    [specialists, specialistSearch],
  );

  const specialistOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: 'all', label: `Todos (${specialists.length})` },
      ...specialists.map((s) => ({
        value: String(s.id),
        label: `${s.name} ${s.last_name}`,
      })),
    ],
    [specialists],
  );

  const sedeOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: 'all', label: `Todas (${branches.length})` },
      ...branches.map((branch) => ({
        value: String(branch.id),
        label: branch.name,
      })),
    ],
    [branches],
  );

  const applyPreset = (p: DatePreset) => {
    setPreset(p);
    setCustomFrom(undefined);
    setCustomTo(undefined);
  };

  const chipCls = (active: boolean) =>
    active
      ? 'bg-[#eff1ff] border border-[#3a71f7] text-[#3a71f7] font-semibold text-[11px] px-2 py-0.5 rounded-full cursor-pointer'
      : 'bg-[#f5f5f6] border border-[#e0e0e4] text-[#7d7d87] text-[11px] px-2 py-0.5 rounded-full cursor-pointer';

  const selectedSpecialist = specialists.find((s) => String(s.id) === selectedSpecialistId);
  const selectedBranch = branches.find((branch) => String(branch.id) === selectedSedeId);

  return (
    <PageLayout
      title="Informe de Gestión Especialista"
      breadcrumbs={[{ label: 'Administración' }, { label: 'Informe de Gestión Especialista' }]}
    >
      <div className="bg-white border border-[#ebebee] rounded-[8px] mx-6 mt-5">
        {/* Tab bar */}
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

        {/* Filter bar — only for consolidado */}
        {activeTab === 'consolidado' && (
          <div className="border-b border-[#f0f0f2] px-5 py-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-0">
              <div className="flex items-center bg-white border border-[#e0e0e4] rounded-[8px] h-[42px] px-3 gap-0 flex-1 min-w-0">
                <span className="text-[11px] font-semibold text-[#7d7d87] mr-2 shrink-0">Rango</span>
                <div className="w-[120px] shrink-0 [&_button]:h-[30px] [&_button]:text-[11px] [&_button]:border-0 [&_button]:shadow-none [&_button]:px-1">
                  <DatePicker
                    value={customFrom ?? from}
                    onChange={(d) => { if (d) { setCustomFrom(d); setPreset('14d'); } }}
                    placeholder="Desde"
                  />
                </div>
                <span className="text-[#7d7d87] text-[12px] mx-1 shrink-0">—</span>
                <div className="w-[120px] shrink-0 [&_button]:h-[30px] [&_button]:text-[11px] [&_button]:border-0 [&_button]:shadow-none [&_button]:px-1">
                  <DatePicker
                    value={customTo ?? to}
                    onChange={(d) => { if (d) { setCustomTo(d); setPreset('14d'); } }}
                    placeholder="Hasta"
                  />
                </div>
                <div className="w-px h-5 bg-[#e0e0e4] mx-2 shrink-0" />
                <div className="flex items-center gap-1 shrink-0">
                  {(['hoy', '7d', '14d', 'mes'] as DatePreset[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => applyPreset(p)}
                      className={chipCls(!customFrom && preset === p)}
                    >
                      {p === 'hoy' ? 'Hoy' : p === '7d' ? '7d' : p === '14d' ? '14d' : 'Mes'}
                    </button>
                  ))}
                </div>
                <div className="w-px h-5 bg-[#e0e0e4] mx-2 shrink-0" />
                <div className="flex flex-col leading-none shrink-0 w-[180px]">
                  <span className="text-[10px] font-medium text-[#7d7d87] tracking-[0.4px] mb-0.5">
                    ESPECIALISTA
                  </span>
                  <SearchableCombobox
                    options={specialistOptions}
                    value={selectedSpecialistId}
                    onChange={setSelectedSpecialistId}
                    placeholder="Todos"
                    searchPlaceholder="Buscar especialista..."
                    className="h-[22px] border-0 bg-transparent rounded-none px-0 text-[11px] shadow-none hover:border-transparent focus:border-transparent focus:ring-0 [&>span]:text-left"
                  />
                </div>
                <div className="w-px h-5 bg-[#e0e0e4] mx-2 shrink-0" />
                <div className="flex flex-col leading-none shrink-0 w-[130px]">
                  <span className="text-[10px] font-medium text-[#7d7d87] tracking-[0.4px] mb-0.5">
                    SEDES
                  </span>
                  <SearchableCombobox
                    options={sedeOptions}
                    value={selectedSedeId}
                    onChange={setSelectedSedeId}
                    placeholder="Todas"
                    searchPlaceholder="Buscar sede..."
                    className="h-[22px] border-0 bg-transparent rounded-none px-0 text-[11px] shadow-none hover:border-transparent focus:border-transparent focus:ring-0 [&>span]:text-left"
                  />
                </div>
              </div>
              <div className="text-[10px] text-[#7d7d87] ml-3 shrink-0 whitespace-nowrap">
                {daysDiff} {daysDiff === 1 ? 'día' : 'dias'} · {report?.specialists_count ?? specialists.length} especialistas
              </div>
            </div>
            {(selectedSpecialistId !== 'all' || selectedSedeId !== 'all') && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-medium text-[#7d7d87]">Filtros activos</span>
                {selectedSpecialist && (
                  <button
                    onClick={() => setSelectedSpecialistId('all')}
                    className="flex items-center gap-1 bg-[#eff1ff] text-[#3a71f7] text-[11px] font-semibold px-2 py-0.5 rounded-full hover:bg-[#dde6ff] transition-colors"
                  >
                    {selectedSpecialist.name} {selectedSpecialist.last_name}
                    <span className="text-[10px] leading-none">×</span>
                  </button>
                )}
                {selectedBranch && (
                  <button
                    onClick={() => setSelectedSedeId('all')}
                    className="flex items-center gap-1 bg-[#eff1ff] text-[#3a71f7] text-[11px] font-semibold px-2 py-0.5 rounded-full hover:bg-[#dde6ff] transition-colors"
                  >
                    {selectedBranch.name}
                    <span className="text-[10px] leading-none">×</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ---- CONSOLIDADO tab ---- */}
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
                  Datos del período {fmtDisplay(from)} – {fmtDisplay(to)} · Registros guardados por
                  cada especialista.
                </p>
              </div>
            )}
          </>
        )}

        {/* ---- LISTA tab ---- */}
        {activeTab === 'lista' && (
          <div>
            <div className="flex items-center justify-between px-5 h-[56px] border-b border-[#e5e5e9]">
              <div className="flex flex-col gap-0.5">
                <p className="text-[14px] font-semibold text-[#121215]">Médicos con reportes de gestión</p>
                <p className="text-[11px] text-[#7d7d87]">{filteredSpecialists.length} especialistas registrados</p>
              </div>
              <input
                type="text"
                placeholder="Buscar especialista..."
                value={specialistSearch}
                onChange={(e) => setSpecialistSearch(e.target.value)}
                className="bg-white border border-[#e5e5e9] h-[34px] w-[220px] rounded-[6px] px-3 text-[12px] placeholder:text-[#b4b5bc] outline-none"
              />
            </div>

            <div className="min-h-[200px]">
              {filteredSpecialists.length === 0 && (
                <p className="text-center text-[#7d7d87] py-10 text-[13px]">
                  No hay especialistas registrados
                </p>
              )}
              {filteredSpecialists.map((specialist, idx) => {
                const initials = `${specialist.name?.[0] ?? ''}${specialist.last_name?.[0] ?? ''}`.toUpperCase();
                return (
                  <div
                    key={specialist.id}
                    onClick={() => navigate(`/admin/specialist-reports/${specialist.id}`)}
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
                  1–{filteredSpecialists.length}
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
