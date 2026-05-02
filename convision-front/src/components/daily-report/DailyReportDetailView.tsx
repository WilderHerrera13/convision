import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { defaultRecepcionesDinero, type DailyActivityReport } from '@/services/dailyActivityReportService';
import DailyReportAttentionTable from '@/components/daily-report/DailyReportAttentionTable';
import DailyReportRecepcionesSection from '@/components/daily-report/DailyReportRecepcionesSection';
import { formatCOP } from '@/lib/formatMoney';

type RoleVariant = 'admin' | 'receptionist';

const primaryButtonClass: Record<RoleVariant, string> = {
  admin: 'bg-[#3a71f7] text-white hover:bg-[#2558d4]',
  receptionist: 'bg-[#8753ef] text-white hover:bg-[#7440d9]',
};

type FieldBoxProps = { label: string; value: string | number };

const FieldBox: React.FC<FieldBoxProps> = ({ label, value }) => (
  <div className="space-y-1.5">
    <p className="text-[11px] font-medium text-[#7d7d87]">{label}</p>
    <div className="flex h-[30px] items-center rounded-md border border-[#dcdce0] bg-white px-2 text-[12px] tabular-nums text-[#0f0f12]">
      {value}
    </div>
  </div>
);

const DailyReportDetailView: React.FC<{
  report: DailyActivityReport;
  role: RoleVariant;
  onExportPrint: () => void;
}> = ({ report, role, onExportPrint }) => {
  const op = report.operations;
  const sm = report.social_media;

  return (
    <div className="daily-report-detail-print space-y-5 pb-24">
      <DailyReportAttentionTable customerAttention={report.customer_attention} operations={op} />

      <DailyReportRecepcionesSection
        recepciones={report.recepciones_dinero ?? defaultRecepcionesDinero()}
        variant="compact"
      />

      <div className="overflow-hidden rounded-lg border border-[#e5e5e9] bg-white p-6 pt-0">
        <div className="-mx-6 mb-4 border-b border-[#a3d9b8] bg-[#ebf5ef] px-4 py-3">
          <p className="text-[13px] font-semibold text-[#228b52]">Operaciones</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <FieldBox label="Control de Seguimiento" value={op.control_seguimiento} />
          <FieldBox label="Seguimiento Garantías" value={op.seguimiento_garantias} />
          <FieldBox label="Órdenes" value={op.ordenes} />
          <FieldBox label="Plan Separe" value={op.plan_separe} />
          <FieldBox label="Otras Ventas" value={op.otras_ventas} />
          <FieldBox label="Entregas" value={op.entregas} />
          <FieldBox label="Sistecreditos Abonos" value={op.sistecreditos_abonos} />
          <FieldBox label="Valor de las Órdenes ($)" value={formatCOP(op.valor_ordenes)} />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#e5e5e9] bg-white p-6 pt-0">
        <div className="-mx-6 mb-4 border border-[#8753ef] bg-[#f1ebff] px-4 py-3">
          <p className="text-[13px] font-semibold text-[#8753ef]">Redes Sociales</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <FieldBox label="Publicaciones FB" value={sm.publicaciones_fb} />
          <FieldBox label="Publicaciones IG" value={sm.publicaciones_ig} />
          <FieldBox label="Mensajes FB" value={sm.mensajes_fb} />
          <FieldBox label="Mensajes IG" value={sm.mensajes_ig} />
          <FieldBox label="Publicaciones WA" value={sm.publicaciones_wa} />
          <FieldBox label="TikToks" value={sm.tiktoks} />
          <FieldBox label="Bonos Regalo" value={sm.bonos_regalo} />
          <FieldBox label="Bonos Fidelización" value={sm.bonos_fidelizacion} />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[12px] font-semibold text-[#0f0f12]">Observaciones</p>
        <Textarea
          readOnly
          value={report.observations ?? ''}
          placeholder="Sin observaciones registradas."
          className="min-h-[80px] resize-none rounded-lg border-[#dcdce0] bg-white text-[12px] text-[#0f0f12] placeholder:text-[#b0b0bc]"
        />
      </div>

      <div className="flex justify-end print:hidden">
        <Button type="button" className={`h-9 rounded-md px-6 text-[13px] font-semibold ${primaryButtonClass[role]}`} onClick={onExportPrint}>
          Exportar informe
        </Button>
      </div>
    </div>
  );
};

export default DailyReportDetailView;
