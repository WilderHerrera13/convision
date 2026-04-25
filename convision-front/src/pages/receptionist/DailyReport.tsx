import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import dailyActivityReportService, {
  defaultCustomerAttention,
  defaultOperations,
  defaultRecepcionesDinero,
  defaultSocialMedia,
  normalizeDailyActivityReport,
  CustomerAttention,
  Operations,
  RecepcionesDinero,
  SocialMedia,
} from '@/services/dailyActivityReportService';
import DailyReportRecepcionesSection from '@/components/daily-report/DailyReportRecepcionesSection';
import { Link } from 'react-router-dom';
import CustomerAttentionMatrix from '@/components/cashClose/CustomerAttentionMatrix';
import DailyReportSection from '@/components/cashClose/DailyReportSection';

const OPERATIONS_FIELDS = [
  { key: 'bonos_entregados', label: 'Bonos entregados' },
  { key: 'bonos_redimidos', label: 'Bonos redimidos' },
  { key: 'sistecreditos_realizados', label: 'Sistecréditos realizados' },
  { key: 'addi_realizados', label: 'Addi realizados' },
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
  const today = format(new Date(), 'yyyy-MM-dd');

  const [customerAttention, setCustomerAttention] = useState<CustomerAttention>(defaultCustomerAttention());
  const [operations, setOperations] = useState<Operations>(defaultOperations());
  const [socialMedia, setSocialMedia] = useState<SocialMedia>(defaultSocialMedia());
  const [recepcionesDinero, setRecepcionesDinero] = useState<RecepcionesDinero>(defaultRecepcionesDinero());
  const [observations, setObservations] = useState('');
  const [existingId, setExistingId] = useState<number | null>(null);
  const [status, setStatus] = useState<'pending' | 'closed'>('pending');
  const [isSaving, setIsSaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const isClosed = status === 'closed';

  const loadTodayReport = useCallback(async () => {
    try {
      const resp = await dailyActivityReportService.list({ date_from: today, date_to: today });
      const rawList = (resp as { data?: unknown[] })?.data ?? (Array.isArray(resp) ? resp : []);
      const items = Array.isArray(rawList) ? rawList : [];
      if (items[0]) {
        const r = normalizeDailyActivityReport(items[0] as Record<string, unknown>);
        setExistingId(r.id);
        setStatus(r.status ?? 'pending');
        setCustomerAttention(r.customer_attention);
        setOperations(r.operations);
        setSocialMedia(r.social_media);
        setRecepcionesDinero(r.recepciones_dinero ?? defaultRecepcionesDinero());
        setObservations(r.observations ?? '');
      } else {
        setExistingId(null);
        setStatus('pending');
        setCustomerAttention(defaultCustomerAttention());
        setOperations(defaultOperations());
        setSocialMedia(defaultSocialMedia());
        setRecepcionesDinero(defaultRecepcionesDinero());
        setObservations('');
      }
    } catch {
      setExistingId(null);
    }
  }, [today]);

  useEffect(() => {
    loadTodayReport();
  }, [loadTodayReport]);

  const handleFieldChange = <T extends Record<string, number>>(
    setter: React.Dispatch<React.SetStateAction<T>>,
    prefix: string,
  ) =>
    (key: string, value: number) => {
      setter((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        if (!prev[`${prefix}.${key}`]) return prev;
        const next = { ...prev };
        delete next[`${prefix}.${key}`];
        return next;
      });
    };

  const handleSave = async () => {
    if (isClosed) return;
    setIsSaving(true);
    setErrors({});
    try {
      const payload = {
        customer_attention: customerAttention,
        operations,
        social_media: socialMedia,
        observations,
      };
      if (existingId) {
        const result = await dailyActivityReportService.update(existingId, payload);
        const updated = normalizeDailyActivityReport((result?.data ?? result) as Record<string, unknown>);
        setStatus(updated.status ?? 'pending');
      } else {
        const created = await dailyActivityReportService.create(payload);
        const normalized = normalizeDailyActivityReport((created?.data ?? created) as Record<string, unknown>);
        setExistingId(normalized.id);
        setStatus(normalized.status ?? 'pending');
      }
      toast({ title: 'Guardado', description: 'Reporte diario guardado correctamente.' });
    } catch (err: any) {
      if (err.response?.status === 409) {
        await loadTodayReport();
        toast({ title: 'Aviso', description: 'Se cargó el reporte existente del día.' });
      } else if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
        toast({ title: 'Error de Validación', description: 'Revisa los campos marcados en rojo.', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: 'No se pudo guardar el reporte.', variant: 'destructive' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = async () => {
    if (!existingId) {
      toast({ title: 'Error', description: 'Guarda el reporte antes de cerrarlo.', variant: 'destructive' });
      setShowCloseConfirm(false);
      return;
    }
    setIsClosing(true);
    try {
      const result = await dailyActivityReportService.close(existingId);
      const normalized = normalizeDailyActivityReport((result?.data ?? result) as Record<string, unknown>);
      setStatus(normalized.status ?? 'closed');
      toast({ title: 'Reporte cerrado', description: 'El reporte del día ha sido cerrado definitivamente.' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo cerrar el reporte.', variant: 'destructive' });
    } finally {
      setIsClosing(false);
      setShowCloseConfirm(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reporte Diario de Gestión</h1>
          <p className="text-muted-foreground text-sm">Registro de actividades y gestión del día · {today}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {isClosed ? (
            <Badge className="rounded-full border-0 bg-[#ebf5ef] px-3 py-1.5 text-[12px] font-semibold text-[#228b52]">
              <Lock className="mr-1.5 h-3 w-3" />
              Cerrado
            </Badge>
          ) : (
            <Badge className="rounded-full border-0 bg-[#fff6e3] px-3 py-1.5 text-[12px] font-semibold text-[#b57218]">
              Pendiente
            </Badge>
          )}
          <Button variant="outline" asChild className="border-[#8753ef] text-[#8753ef] hover:bg-[#f5f0ff]">
            <Link to="/receptionist/daily-report/quick-attention">
              Registro rápido de atención
            </Link>
          </Button>
        </div>
      </div>

      {isClosed && (
        <div className="rounded-lg border border-[#d1fae5] bg-[#f0fdf4] px-4 py-3 text-sm text-[#166534]">
          Este reporte fue cerrado y no puede ser editado. Solo el administrador puede reabrirlo.
        </div>
      )}

      <CustomerAttentionMatrix
        values={customerAttention}
        onChange={(key, value) => {
          if (isClosed) return;
          setCustomerAttention((prev) => ({ ...prev, [key]: value }));
          setErrors((prev) => {
            if (!prev[`customer_attention.${key}`]) return prev;
            const next = { ...prev };
            delete next[`customer_attention.${key}`];
            return next;
          });
        }}
        errors={errors}
        errorPrefix="customer_attention."
      />

      <DailyReportRecepcionesSection recepciones={recepcionesDinero} />

      <DailyReportSection
        title="Operaciones"
        headerColor="bg-[#ebf5ef] text-[#228b52]"
        fields={OPERATIONS_FIELDS}
        values={operations as unknown as Record<string, number>}
        onChange={handleFieldChange(setOperations as React.Dispatch<React.SetStateAction<Record<string, number>>>, 'operations')}
        errors={errors}
        errorPrefix="operations."
      />

      <DailyReportSection
        title="Redes Sociales"
        headerColor="bg-[#f1ebff] text-[#8753ef]"
        fields={SOCIAL_FIELDS}
        values={socialMedia as unknown as Record<string, number>}
        onChange={handleFieldChange(setSocialMedia as React.Dispatch<React.SetStateAction<Record<string, number>>>, 'social_media')}
        errors={errors}
        errorPrefix="social_media."
      />

      <div className="space-y-2">
        <label className="text-sm font-medium">Observaciones</label>
        <Textarea
          value={observations}
          onChange={(e) => {
            if (isClosed) return;
            setObservations(e.target.value);
            setErrors((prev) => {
              if (!prev.observations) return prev;
              const next = { ...prev };
              delete next.observations;
              return next;
            });
          }}
          placeholder="Escribe tus observaciones del día..."
          rows={4}
          disabled={isClosed}
          className={errors.observations ? 'border-red-500 focus-visible:ring-red-500' : ''}
        />
        {errors.observations && (
          <p className="text-[12px] text-red-500 mt-1">{errors.observations[0]}</p>
        )}
      </div>

      {!isClosed && (
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50"
            onClick={() => setShowCloseConfirm(true)}
            disabled={isSaving || !existingId}
          >
            <Lock className="mr-2 h-4 w-4" />
            Cerrar Reporte
          </Button>
          <Button
            className="bg-[#8753ef] hover:bg-[#7345d6] text-white"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Reporte
          </Button>
        </div>
      )}

      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar el reporte del día?</AlertDialogTitle>
            <AlertDialogDescription>
              Al cerrar el reporte no podrás editarlo nuevamente. Solo el administrador puede reabrirlo y únicamente durante el mismo día. Esta acción es definitiva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClosing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleClose}
              disabled={isClosing}
            >
              {isClosing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cerrar Reporte
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DailyReport;
