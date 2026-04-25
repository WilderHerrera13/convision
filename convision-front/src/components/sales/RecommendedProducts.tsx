import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { lensService } from '@/services/lensService';
import type { Lens } from '@/services/lensService';
import { appointmentsService } from '@/services/appointmentsService';

interface RecommendedProductsProps {
  appointmentId?: number;
  patientId?: number;
  onAddProduct: (lens: Lens, qty: number) => void;
  addedProductIds: number[];
  onViewPrescription?: () => void;
  selectedPatientName?: string;
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
    <div className="border border-[#e5e5e9] rounded-[6px] bg-white shrink-0 h-[60px] flex-1 min-w-[180px] max-w-[246px] relative overflow-hidden px-[9px] pt-[6px] pb-[8px]">
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
      <button
        type="button"
        disabled={isAdded}
        onClick={onAdd}
        className={`absolute bottom-[9px] right-[9px] size-[24px] rounded-full flex items-center justify-center shrink-0 transition-colors ${
          isAdded
            ? 'bg-emerald-500 text-white cursor-default'
            : 'bg-[#8753ef] text-white hover:bg-[#7340d8]'
        }`}
      >
        {isAdded ? <Check size={12} /> : <Plus size={12} />}
      </button>
    </div>
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

  const { data: suggestedLenses } = useQuery({
    queryKey: ['recommended-lenses', appointmentId, patientId],
    queryFn: async () => {
      const response = await lensService.searchLenses({ page: 1, perPage: 3 });
      return response.data;
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
  });

  const handleExploreCatalog = () => {
    const existing = sessionStorage.getItem('pendingSale');
    const base = existing ? JSON.parse(existing) : {};
    const updated = {
      ...base,
      patientId: patientId ?? base.patientId,
      patientName: selectedPatientName ?? base.patientName,
      appointmentId: appointmentId ?? base.appointmentId,
    };
    sessionStorage.setItem('pendingSale', JSON.stringify(updated));
    navigate('/receptionist/sales/catalog');
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

  const specialistName = (appointment as { specialist?: { name?: string } })?.specialist?.name ?? '';
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
                {[appointmentNumber, specialistName && `Dr. ${specialistName}`, scheduledDate]
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

          {suggestedLenses && suggestedLenses.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] font-semibold tracking-[0.8px] text-[#b4b5bc] uppercase">
                Recomendados según la prescripción
              </p>
              <div className="flex gap-[5px]">
                {suggestedLenses.map((lens) => (
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
