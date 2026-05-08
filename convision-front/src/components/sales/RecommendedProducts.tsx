import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { lensService } from '@/services/lensService';
import type { Lens } from '@/services/lensService';
import { appointmentsService } from '@/services/appointmentsService';
import api from '@/lib/axios';

interface RecommendedProductsProps {
  appointmentId?: number;
  patientId?: number;
  onAddProduct: (lens: Lens, qty: number) => void;
  addedProductIds: number[];
  onViewPrescription?: () => void;
  selectedPatientName?: string;
}

interface ClinicalRecordPrescription {
  lens_type?: string;
  lens_material?: string;
  lens_use?: string;
  treatments?: string[] | null;
}

interface ClinicalRecordResponse {
  prescription?: ClinicalRecordPrescription | null;
}

const TREATMENT_ALIASES: Record<string, string[]> = {
  antirreflejo: ['antirreflejo', 'antireflejo', 'anti-reflective', 'ar'],
  filtro_luz_azul: ['filtro_luz_azul', 'filtro_azul', 'blue_filter', 'luz_azul', 'azul'],
  fotocromatico: ['fotocromatico', 'fotocromático', 'photochromic'],
  polarizado: ['polarizado', 'polarized'],
  filtro_uv: ['filtro_uv', 'uv'],
};

function normalize(text?: string | null): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function expandTreatment(slug: string): string[] {
  const norm = normalize(slug);
  if (TREATMENT_ALIASES[norm]) return TREATMENT_ALIASES[norm];
  for (const aliases of Object.values(TREATMENT_ALIASES)) {
    if (aliases.includes(norm)) return aliases;
  }
  return [norm];
}

function lensMatchesTreatment(lens: Lens, slug: string): boolean {
  const aliases = expandTreatment(slug);
  const haystacks = [lens.treatment?.name, lens.description].map(normalize);
  return haystacks.some((h) => aliases.some((a) => h.includes(a)));
}

function rankLensesByPrescription(
  lenses: Lens[],
  prescription: ClinicalRecordPrescription | null | undefined,
): Lens[] {
  if (!prescription) return lenses;

  const targetType = normalize(prescription.lens_type);
  const targetMaterial = normalize(prescription.lens_material);
  const targetTreatments = (prescription.treatments ?? []).filter(Boolean);

  const scored = lenses.map((lens) => {
    let score = 0;
    const lensType = normalize(lens.type?.name ?? lens.lens_class?.name);
    const lensMaterial = normalize(lens.material?.name);

    if (targetType) {
      if (lensType && (lensType === targetType || lensType.includes(targetType) || targetType.includes(lensType))) {
        score += 100;
      } else if (lensType) {
        score -= 50;
      }
    }

    if (targetMaterial) {
      if (lensMaterial && (lensMaterial === targetMaterial || lensMaterial.includes(targetMaterial) || targetMaterial.includes(lensMaterial))) {
        score += 30;
      }
    }

    for (const t of targetTreatments) {
      if (lensMatchesTreatment(lens, t)) score += 10;
    }

    return { lens, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const filtered = scored.filter((s) => s.score > 0);
  return (filtered.length > 0 ? filtered : scored).map((s) => s.lens);
}

function RecommendedCard({
  lens,
  isAdded,
  onAdd,
}: {
  lens: Lens;
  isAdded: boolean;
  onAdd: () => void;
}) {
  const brandName = lens.brand?.name ?? '';
  const typeName = lens.type?.name ?? '';
  const materialName = lens.material?.name ?? '';
  const subtitle = [typeName, materialName].filter(Boolean).join(' · ');
  const price = parseFloat(lens.price ?? '0');

  return (
    <button
      type="button"
      disabled={isAdded}
      onClick={onAdd}
      aria-label={isAdded ? `${lens.description} ya agregado` : `Agregar ${lens.description} al carrito`}
      className={`text-left border border-[#e5e5e9] rounded-[6px] bg-white shrink-0 h-[60px] flex-1 min-w-[180px] max-w-[246px] relative overflow-hidden px-[9px] pt-[6px] pb-[8px] transition-colors ${
        isAdded ? 'cursor-default' : 'cursor-pointer hover:border-[#8753ef] hover:bg-[#fbfaff]'
      }`}
    >
      {brandName && (
        <p className="text-[9px] font-semibold tracking-[0.6px] text-[#b4b5bc] uppercase leading-none mb-[4px]">
          {brandName}
        </p>
      )}
      <p className="text-[12px] font-semibold text-[#121215] leading-tight truncate pr-[60px]">
        {lens.description}
      </p>
      {subtitle && (
        <p className="text-[10px] text-[#7d7d87] leading-none mt-[2px]">{subtitle}</p>
      )}
      <span className="absolute top-[7px] right-[36px] text-[11px] font-semibold text-[#121215]">
        {formatCurrency(price)}
      </span>
      <span
        aria-hidden
        className={`absolute bottom-[9px] right-[9px] size-[24px] rounded-full flex items-center justify-center shrink-0 transition-colors ${
          isAdded ? 'bg-emerald-500 text-white' : 'bg-[#8753ef] text-white'
        }`}
      >
        {isAdded ? <Check size={12} /> : <Plus size={12} />}
      </span>
    </button>
  );
}

const RecommendedProducts: React.FC<RecommendedProductsProps> = ({
  appointmentId,
  patientId,
  onAddProduct,
  addedProductIds,
  onViewPrescription,
  selectedPatientName,
}) => {
  const navigate = useNavigate();

  const { data: appointment } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: () => appointmentsService.getAppointmentById(appointmentId!),
    enabled: !!appointmentId,
  });

  const { data: clinicalRecord } = useQuery<ClinicalRecordResponse | null>({
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

  const { data: lensPool } = useQuery({
    queryKey: ['recommended-lenses-pool', appointmentId, patientId],
    queryFn: async () => {
      const response = await lensService.searchLenses({ page: 1, perPage: 20 });
      return response.data;
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
  });

  const recommendedLenses = React.useMemo(() => {
    if (!lensPool || lensPool.length === 0) return [] as Lens[];
    const ranked = rankLensesByPrescription(lensPool, clinicalRecord?.prescription);
    return ranked.slice(0, 3);
  }, [lensPool, clinicalRecord?.prescription]);

  const handleExploreCatalog = () => {
    const existing = sessionStorage.getItem('pendingSale');
    const base = existing ? JSON.parse(existing) : {};
    const apptPayload = appointment as { prescription?: unknown } | undefined;
    const updated = {
      ...base,
      patientId: patientId ?? base.patientId,
      patientName: selectedPatientName ?? base.patientName,
      appointmentId: appointmentId ?? base.appointmentId,
      prescription: apptPayload?.prescription ?? base.prescription ?? null,
    };
    sessionStorage.setItem('pendingSale', JSON.stringify(updated));
    const targetAppointmentId = appointmentId ?? base.appointmentId;
    const qs = targetAppointmentId ? `?appointment_id=${targetAppointmentId}` : '';
    navigate(`/receptionist/sales/catalog${qs}`);
  };

  const formatAppointmentDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const appointmentNumber = appointment
    ? `#C-${String(appointment.id).padStart(4, '0')}`
    : appointmentId
    ? `#C-${String(appointmentId).padStart(4, '0')}`
    : '';

  const specialist = (appointment as { specialist?: { name?: string; last_name?: string } })?.specialist;
  const specialistFullName = [specialist?.name, specialist?.last_name].filter(Boolean).join(' ').trim();
  const scheduledDate = (appointment as { scheduled_at?: string })?.scheduled_at
    ? formatAppointmentDate((appointment as { scheduled_at: string }).scheduled_at)
    : '';

  return (
    <div className="px-4 pt-3 pb-4 space-y-3">
      {appointmentId && (
        <>
          <div className="bg-[#f1edff] border border-[rgba(135,83,239,0.3)] rounded-[6px] px-3 py-2.5 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-semibold tracking-[0.8px] text-[#8753ef] uppercase leading-none mb-1">
                Cita Vinculada
              </p>
              <p className="text-[11px] text-[#7d7d87]">
                {[appointmentNumber, specialistFullName && `Dr. ${specialistFullName}`, scheduledDate]
                  .filter(Boolean)
                  .join('  ·  ')}
              </p>
            </div>
            {onViewPrescription && (
              <button
                type="button"
                onClick={onViewPrescription}
                className="text-[11px] font-semibold text-[#8753ef] hover:underline shrink-0 ml-4"
              >
                Ver prescripción
              </button>
            )}
          </div>

          {recommendedLenses.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] font-semibold tracking-[0.8px] text-[#b4b5bc] uppercase">
                Recomendados según la prescripción
              </p>
              <div className="flex gap-[5px]">
                {recommendedLenses.map((lens) => (
                  <RecommendedCard
                    key={lens.id}
                    lens={lens}
                    isAdded={addedProductIds.includes(lens.id)}
                    onAdd={() => onAddProduct(lens, 1)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className={appointmentId ? 'border-t border-[#ebebee] pt-3' : ''}>
        <button
          type="button"
          onClick={handleExploreCatalog}
          className="w-full border border-dashed border-[#e5e5e9] rounded-[6px] h-[36px] text-[13px] text-[#7d7d87] hover:text-[#8753ef] hover:border-[#8753ef] transition-colors"
        >
          Explorar catálogo de productos
        </button>
      </div>
    </div>
  );
};

export default RecommendedProducts;
