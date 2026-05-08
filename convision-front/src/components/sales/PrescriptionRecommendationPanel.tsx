import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stethoscope } from 'lucide-react';
import api from '@/lib/axios';

interface ClinicalRecordResponse {
  id: number;
  appointment_id: number;
  status: string;
  updated_at?: string;
  diagnosis?: {
    primary_code?: string;
    primary_description?: string;
    optical_correction_plan?: string;
    patient_education?: string;
  } | null;
  prescription?: {
    lens_type?: string;
    lens_material?: string;
    lens_use?: string;
    treatments?: string[] | null;
    validity_months?: number;
    professional_tp?: string;
    signed_at?: string;
  } | null;
}

const LENS_TYPE_LABELS: Record<string, string> = {
  monofocal: 'Monofocal',
  bifocal: 'Bifocal',
  progresivo: 'Progresivo',
  ocupacional: 'Ocupacional',
};
const LENS_MATERIAL_LABELS: Record<string, string> = {
  cr39: 'CR-39',
  policarbonato: 'Policarbonato',
  alto_indice: 'Alto índice',
  trivex: 'Trivex',
};
const LENS_USE_LABELS: Record<string, string> = {
  permanente: 'Uso permanente',
  ocupacional: 'Uso ocupacional',
  esporadico: 'Uso esporádico',
};

const TREATMENT_LABELS: Record<string, string> = {
  antirreflejo: 'Antirreflejo',
  fotocromatico: 'Fotocromático',
  filtro_azul: 'Filtro azul',
  blue_filter: 'Filtro azul',
  polarizado: 'Polarizado',
  uv: 'Filtro UV',
};

function labelize(map: Record<string, string>, value?: string) {
  if (!value) return '';
  return map[value] ?? value;
}

interface Props {
  patientId?: number;
}

const PrescriptionRecommendationPanel: React.FC<Props> = ({ patientId }) => {
  const { data, isLoading, error } = useQuery<ClinicalRecordResponse | null>({
    queryKey: ['patient-latest-clinical-record', patientId],
    queryFn: async () => {
      if (!patientId) return null;
      try {
        const res = await api.get<ClinicalRecordResponse>(`/api/v1/patients/${patientId}/latest-clinical-record`);
        return res.data;
      } catch (e: unknown) {
        const status = (e as { response?: { status?: number } })?.response?.status;
        if (status === 404) return null;
        throw e;
      }
    },
    enabled: !!patientId,
    staleTime: 60_000,
  });

  if (!patientId) return null;
  if (isLoading) {
    return (
      <div className="px-4 pt-3 pb-1">
        <div className="bg-[#f7f4ff] border border-[#e5e5e9] rounded-[6px] px-3 py-2.5 text-[11px] text-[#7d7d87]">
          Cargando recomendación del médico...
        </div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="px-4 pt-3 pb-1">
        <div className="bg-[#fff7ed] border border-[#fed7aa] rounded-[6px] px-3 py-2.5 text-[11px] text-[#9a3412]">
          Este paciente no tiene una fórmula firmada por el médico aún.
        </div>
      </div>
    );
  }

  const diagnosis = data.diagnosis;
  const rx = data.prescription;
  const treatments = (rx?.treatments ?? []).map((t) => labelize(TREATMENT_LABELS, t)).filter(Boolean);

  return (
    <div className="px-4 pt-3 pb-1">
      <div className="bg-[#f7f4ff] border border-[rgba(135,83,239,0.3)] rounded-[6px] px-3 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <Stethoscope className="size-3.5 text-[#8753ef]" />
          <p className="text-[10px] font-semibold tracking-[0.6px] text-[#8753ef] uppercase leading-none">
            Recomendación del médico
          </p>
        </div>

        {diagnosis?.primary_code && (
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[#7d7d87] font-medium">Diagnóstico principal</p>
            <p className="text-[12px] text-[#121215]">
              <span className="font-semibold">{diagnosis.primary_code}</span>
              {diagnosis.primary_description ? ` · ${diagnosis.primary_description}` : ''}
            </p>
          </div>
        )}

        {rx && (rx.lens_type || rx.lens_material || rx.lens_use) && (
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[#7d7d87] font-medium">Tipo de lente sugerido</p>
            <p className="text-[12px] text-[#121215]">
              {[
                labelize(LENS_TYPE_LABELS, rx.lens_type),
                labelize(LENS_MATERIAL_LABELS, rx.lens_material),
                labelize(LENS_USE_LABELS, rx.lens_use),
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        )}

        {treatments.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[#7d7d87] font-medium">Tratamientos</p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {treatments.map((t) => (
                <span key={t} className="text-[11px] bg-white border border-[#e5d5ff] text-[#5b32b6] px-2 py-0.5 rounded-full">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {diagnosis?.optical_correction_plan && (
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[#7d7d87] font-medium">Plan óptico</p>
            <p className="text-[12px] text-[#121215]">{diagnosis.optical_correction_plan}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrescriptionRecommendationPanel;
