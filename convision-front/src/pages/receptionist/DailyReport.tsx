import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import dailyActivityReportService, {
  SHIFT_OPTIONS,
  defaultCustomerAttention,
  defaultOperations,
  defaultSocialMedia,
  CustomerAttention,
  Operations,
  SocialMedia,
} from '@/services/dailyActivityReportService';
import DailyReportSection from '@/components/cashClose/DailyReportSection';

const CUSTOMER_FIELDS = [
  { key: 'questions_men', label: 'Preguntas H' },
  { key: 'questions_women', label: 'Preguntas M' },
  { key: 'questions_children', label: 'Preguntas N' },
  { key: 'quotes_men', label: 'Cotizaciones H' },
  { key: 'quotes_women', label: 'Cotizaciones M' },
  { key: 'quotes_children', label: 'Cotizaciones N' },
  { key: 'effective_consultations_men', label: 'Consultas Efectivas H' },
  { key: 'effective_consultations_women', label: 'Consultas Efectivas M' },
  { key: 'effective_consultations_children', label: 'Consultas Efectivas N' },
  { key: 'formula_sale_consultations_men', label: 'Consulta Venta Fórmula H' },
  { key: 'formula_sale_consultations_women', label: 'Consulta Venta Fórmula M' },
  { key: 'formula_sale_consultations_children', label: 'Consulta Venta Fórmula N' },
  { key: 'non_effective_consultations_men', label: 'Consultas No Efectivas H' },
  { key: 'non_effective_consultations_women', label: 'Consultas No Efectivas M' },
  { key: 'non_effective_consultations_children', label: 'Consultas No Efectivas N' },
];

const OPERATIONS_FIELDS = [
  { key: 'control_seguimiento', label: 'Control de Seguimiento' },
  { key: 'seguimiento_garantias', label: 'Seguimiento Garantías' },
  { key: 'ordenes', label: 'Órdenes' },
  { key: 'plan_separe', label: 'Plan Separe' },
  { key: 'otras_ventas', label: 'Otras Ventas' },
  { key: 'entregas', label: 'Entregas' },
  { key: 'sistecreditos_abonos', label: 'Sistecreditos Abonos' },
  { key: 'valor_ordenes', label: 'Valor de las Órdenes ($)' },
];

const SOCIAL_FIELDS = [
  { key: 'publicaciones_fb', label: 'Publicaciones FB' },
  { key: 'publicaciones_ig', label: 'Publicaciones IG' },
  { key: 'mensajes_fb', label: 'Mensajes FB' },
  { key: 'mensajes_ig', label: 'Mensajes IG' },
  { key: 'publicaciones_wa', label: 'Publicaciones WA' },
  { key: 'tiktoks', label: 'TikToks' },
  { key: 'bonos_regalo', label: 'Bonos Regalo' },
  { key: 'bonos_fidelizacion', label: 'Bonos Fidelización' },
];

const DailyReport: React.FC = () => {
  const { toast } = useToast();
  const [reportDate, setReportDate] = useState<Date>(new Date());
  const [shift, setShift] = useState<string>('morning');
  const [customerAttention, setCustomerAttention] = useState<CustomerAttention>(defaultCustomerAttention());
  const [operations, setOperations] = useState<Operations>(defaultOperations());
  const [socialMedia, setSocialMedia] = useState<SocialMedia>(defaultSocialMedia());
  const [observations, setObservations] = useState('');
  const [existingId, setExistingId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const dateStr = format(reportDate, 'yyyy-MM-dd');

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await dailyActivityReportService.list({ report_date: dateStr, shift });
        const items = resp?.data ?? (Array.isArray(resp) ? resp : []);
        if (items[0]) {
          const r = items[0];
          setExistingId(r.id);
          if (r.customer_attention) setCustomerAttention(r.customer_attention);
          if (r.operations) setOperations(r.operations);
          if (r.social_media) setSocialMedia(r.social_media);
          setObservations(r.observations ?? '');
        } else {
          setExistingId(null);
          setCustomerAttention(defaultCustomerAttention());
          setOperations(defaultOperations());
          setSocialMedia(defaultSocialMedia());
          setObservations('');
        }
      } catch {
        setExistingId(null);
      }
    };
    load();
  }, [dateStr, shift]);

  const handleFieldChange = <T extends Record<string, number>>(
    setter: React.Dispatch<React.SetStateAction<T>>
  ) => (key: string, value: number) => {
    setter((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        report_date: dateStr,
        shift,
        customer_attention: customerAttention,
        operations,
        social_media: socialMedia,
        observations,
      };
      if (existingId) {
        await dailyActivityReportService.update(existingId, payload);
      } else {
        const created = await dailyActivityReportService.create(payload);
        setExistingId((created?.data ?? created)?.id ?? null);
      }
      toast({ title: 'Guardado', description: 'Reporte diario guardado correctamente.' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar el reporte.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reporte Diario de Gestión</h1>
          <p className="text-muted-foreground text-sm">Registro de actividades y gestión del día</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-48">
            <DatePicker
              value={reportDate}
              onChange={(d) => d && setReportDate(d)}
              placeholder="Fecha del reporte"
            />
          </div>
          <Select value={shift} onValueChange={setShift}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Jornada" />
            </SelectTrigger>
            <SelectContent>
              {SHIFT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DailyReportSection
        title="Atención al Cliente"
        headerColor="bg-[#eff1ff] text-[#3a71f7]"
        fields={CUSTOMER_FIELDS}
        values={customerAttention as unknown as Record<string, number>}
        onChange={handleFieldChange(setCustomerAttention as React.Dispatch<React.SetStateAction<Record<string, number>>>)}
      />

      <DailyReportSection
        title="Operaciones"
        headerColor="bg-[#ebf5ef] text-[#228b52]"
        fields={OPERATIONS_FIELDS}
        values={operations as unknown as Record<string, number>}
        onChange={handleFieldChange(setOperations as React.Dispatch<React.SetStateAction<Record<string, number>>>)}
      />

      <DailyReportSection
        title="Redes Sociales"
        headerColor="bg-[#f1ebff] text-[#8753ef]"
        fields={SOCIAL_FIELDS}
        values={socialMedia as unknown as Record<string, number>}
        onChange={handleFieldChange(setSocialMedia as React.Dispatch<React.SetStateAction<Record<string, number>>>)}
      />

      <div className="space-y-2">
        <label className="text-sm font-medium">Observaciones</label>
        <Textarea
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          placeholder="Escribe tus observaciones del día..."
          rows={4}
        />
      </div>

      <div className="flex justify-end">
        <Button
          className="bg-green-700 hover:bg-green-800 text-white"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar Reporte
        </Button>
      </div>
    </div>
  );
};

export default DailyReport;
