import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { superAdminService } from '@/services/superAdmin';
import type { Optica, OpticaFeature } from '@/types/optica';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';

interface FeatureCol {
  key: string;
  shortLabel: string;
}

const FEATURE_COLS: FeatureCol[] = [
  { key: 'sidebar.appointments',          shortLabel: 'Citas' },
  { key: 'sidebar.sales',                 shortLabel: 'Ventas' },
  { key: 'sidebar.laboratory',            shortLabel: 'Lab.' },
  { key: 'sidebar.quotes',                shortLabel: 'Cotiz.' },
  { key: 'sidebar.cash_close',            shortLabel: 'Caja' },
  { key: 'sidebar.advisor_report',        shortLabel: 'G. Asesor' },
  { key: 'sidebar.specialist_management', shortLabel: 'G. Esp.' },
  { key: 'sidebar.purchases',             shortLabel: 'Compras' },
  { key: 'sidebar.inventory',             shortLabel: 'Inventario' },
  { key: 'sidebar.payroll',               shortLabel: 'Nómina' },
  { key: 'sidebar.expenses',              shortLabel: 'Gastos' },
];

function useOpticasList() {
  return useQuery({
    queryKey: ['super-admin-opticas-all'],
    queryFn: () => superAdminService.listOpticas(1, 100),
  });
}

function useOpticaFeatures(opticaId: number, enabled: boolean) {
  return useQuery({
    queryKey: ['super-admin-optica-features', opticaId],
    queryFn: () => superAdminService.listFeatures(opticaId),
    enabled,
    staleTime: 30_000,
  });
}

function FeatureRow({ optica, search }: { optica: Optica; search: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const navigate = useNavigate();

  const { data, isLoading } = useOpticaFeatures(optica.id, true);
  const features: OpticaFeature[] = data?.features ?? [];

  if (search && !optica.name.toLowerCase().includes(search.toLowerCase())) return null;

  const getEnabled = (key: string) => features.find((f) => f.feature_key === key)?.is_enabled ?? false;

  const handleToggle = async (key: string) => {
    const current = getEnabled(key);
    setTogglingKey(key);
    try {
      await superAdminService.toggleFeature(optica.id, key, !current);
      await queryClient.invalidateQueries({ queryKey: ['super-admin-optica-features', optica.id] });
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el módulo', variant: 'destructive' });
    } finally {
      setTogglingKey(null);
    }
  };

  return (
    <div className="flex items-center border-b border-[#e5e5e9] h-[64px] w-full hover:bg-[#fafafa] transition-colors">
      <div className="w-[200px] shrink-0 px-4">
        <p className="text-[13px] font-semibold text-[#121215] leading-none">{optica.name}</p>
        <p className="text-[11px] text-[#7d7d87] mt-0.5 leading-none">{optica.slug}</p>
      </div>
      {isLoading ? (
        <div className="flex-1 px-4 text-[12px] text-[#b4b5bc]">Cargando...</div>
      ) : (
        FEATURE_COLS.map((col) => (
          <div key={col.key} className="w-[80px] shrink-0 flex items-center justify-center">
            <Switch
              checked={getEnabled(col.key)}
              disabled={togglingKey === col.key}
              onCheckedChange={() => handleToggle(col.key)}
              className="scale-90"
            />
          </div>
        ))
      )}
      <div className="flex-1 flex items-center justify-end pr-4">
        <button
          onClick={() => navigate(`/super-admin/opticas/${optica.id}`)}
          className="h-[30px] px-4 rounded-[6px] bg-[#eff1ff] border border-[#c5d3f8] text-[12px] font-semibold text-[#3a71f7] hover:bg-[#e0e8ff] transition-colors"
        >
          Editar
        </button>
      </div>
    </div>
  );
}

const FeatureFlagsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useOpticasList();
  const opticas = data?.data ?? [];

  const activeCount = opticas.length;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-[#ebebee] bg-white px-6 h-[60px] flex items-center shrink-0">
        <div>
          <p className="text-[12px] text-[#7d7d87] leading-none mb-1">Panel Super Admin / Feature Flags</p>
          <h1 className="text-[16px] font-semibold text-[#0f0f12] leading-none">Feature Flags</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex gap-4 mb-6">
          <div className="rounded-[8px] border border-[#ebebee] bg-white px-4 py-4 w-[240px]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[#3a71f7] text-[10px]">◆</span>
              <span className="text-[11px] text-[#7d7d87]">Ópticas registradas</span>
            </div>
            <p className="text-[28px] font-semibold text-[#0f0f12] leading-none mb-1">{isLoading ? '–' : activeCount}</p>
            <p className="text-[10px] text-[#7d7d87]">Total en el sistema</p>
          </div>
          <div className="rounded-[8px] border border-[#ebebee] bg-white px-4 py-4 w-[240px]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[#3a71f7] text-[10px]">◆</span>
              <span className="text-[11px] text-[#7d7d87]">Módulos disponibles</span>
            </div>
            <p className="text-[28px] font-semibold text-[#0f0f12] leading-none mb-1">{FEATURE_COLS.length}</p>
            <p className="text-[10px] text-[#7d7d87]">Configurables por óptica</p>
          </div>
          <div className="rounded-[8px] border border-[#ebebee] bg-white px-4 py-4 w-[240px]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[#3a71f7] text-[10px]">◆</span>
              <span className="text-[11px] text-[#7d7d87]">Módulos principales activos</span>
            </div>
            <p className="text-[28px] font-semibold text-[#0f0f12] leading-none mb-1">3</p>
            <p className="text-[10px] text-[#7d7d87]">Cierre de caja, asesor, especialista</p>
          </div>
        </div>

        <div className="rounded-[8px] border border-[#ebebee] bg-white overflow-hidden">
          <div className="border-b border-[#e5e5e9] h-[52px] flex items-center justify-between px-4">
            <div>
              <p className="text-[14px] font-semibold text-[#121215] leading-none">Configuración por óptica</p>
              <p className="text-[11px] text-[#7d7d87] mt-0.5">Activa o desactiva módulos para cada óptica registrada</p>
            </div>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar óptica..."
                className="h-[34px] w-[220px] rounded-[6px] border border-[#e0e0e4] bg-white px-3 text-[12px] text-[#121215] placeholder-[#b4b5bc] focus:outline-none focus:ring-2 focus:ring-[#3a71f7] focus:ring-offset-0"
              />
            </div>
          </div>

          <div className="bg-[#fafafa] border-b border-[#e5e5e9] flex h-[40px] items-center">
            <div className="w-[200px] shrink-0 px-4">
              <span className="text-[10px] font-semibold text-[#7d7d87] uppercase tracking-[0.8px]">ÓPTICA</span>
            </div>
            {FEATURE_COLS.map((col) => (
              <div key={col.key} className="w-[80px] shrink-0 flex items-center justify-center">
                <span className="text-[9px] font-semibold text-[#7d7d87] text-center leading-tight">{col.shortLabel}</span>
              </div>
            ))}
            <div className="flex-1 flex justify-end pr-4">
              <span className="text-[10px] font-semibold text-[#7d7d87] uppercase tracking-[0.8px]">ACCIONES</span>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-[13px] text-[#7d7d87]">Cargando ópticas...</div>
          ) : opticas.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-[#7d7d87]">No hay ópticas registradas.</div>
          ) : (
            opticas.map((optica) => (
              <FeatureRow key={optica.id} optica={optica} search={search} />
            ))
          )}

          <div className="border-t border-[#e5e5e9] bg-[#fafafa] h-[44px] flex items-center px-4">
            <p className="text-[11px] text-[#7d7d87]">
              {opticas.length} óptica{opticas.length !== 1 ? 's' : ''} · Los cambios se aplican inmediatamente para todos los usuarios de la óptica
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureFlagsPage;
