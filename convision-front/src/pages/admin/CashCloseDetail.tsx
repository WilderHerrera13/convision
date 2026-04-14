import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import PageLayout from '@/components/layouts/PageLayout';
import cashRegisterCloseService, {
  CashClose,
  PAYMENT_METHOD_LABELS,
  PaymentMethodName,
} from '@/services/cashRegisterCloseService';

interface CashCloseDetail extends CashClose {
  user?: { id: number; name: string; last_name: string };
}

const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'border-gray-300 bg-[#f5f5f7] text-[#7d7d87]' },
  submitted: { label: 'Enviado', className: 'border-[#b57218] bg-[#fff6e3] text-[#b57218]' },
  approved: { label: 'Aprobado', className: 'border-[#228b52] bg-[#ebf5ef] text-[#228b52]' },
};

const AdminCashCloseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [close, setClose] = useState<CashCloseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isReturning, setIsReturning] = useState(false);

  useEffect(() => {
    if (!id) return;
    cashRegisterCloseService.get(Number(id))
      .then((resp) => {
        const data = resp?.data ?? resp;
        setClose(data);
        setAdminNotes(data?.admin_notes ?? '');
      })
      .catch(() => toast.error('No se pudo cargar el cierre'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleApprove = async () => {
    if (!confirm('¿Confirmas la aprobación de este cierre?')) return;
    setIsApproving(true);
    try {
      await cashRegisterCloseService.approve(Number(id), adminNotes);
      toast.success('Cierre aprobado correctamente');
      const resp = await cashRegisterCloseService.get(Number(id));
      setClose(resp?.data ?? resp);
    } catch {
      toast.error('Error al aprobar el cierre');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReturn = async () => {
    if (!confirm('¿Devolver este cierre al asesor?')) return;
    setIsReturning(true);
    try {
      await cashRegisterCloseService.approve(Number(id), adminNotes);
      toast.success('Cierre devuelto al asesor');
      const resp = await cashRegisterCloseService.get(Number(id));
      setClose(resp?.data ?? resp);
    } catch {
      toast.error('Error al devolver el cierre');
    } finally {
      setIsReturning(false);
    }
  };

  if (loading) return <PageLayout title="Cargando..."><p className="text-sm text-muted-foreground">Cargando cierre...</p></PageLayout>;
  if (!close) return <PageLayout title="No encontrado"><p className="text-sm">Cierre no encontrado.</p></PageLayout>;

  const statusCfg = STATUS_CONFIG[close.status] ?? STATUS_CONFIG.draft;
  const diff = close.total_difference ?? 0;
  const userName = close.user ? `${close.user.name} ${close.user.last_name}` : 'Asesor';
  const dateLabel = format(new Date(close.close_date + 'T12:00:00'), 'dd/MM/yyyy');
  const totalsDiff = close.payment_methods?.reduce((s, m) => s + ((m.counted_amount ?? 0) - (m.registered_amount ?? 0)), 0) ?? 0;

  return (
    <PageLayout
      title={`${userName} — ${dateLabel}`}
      subtitle={<Badge variant="outline" className={statusCfg.className}>{statusCfg.label}</Badge> as unknown as string}
      actions={
        <Button variant="ghost" size="sm" className="text-[#3a71f7]" onClick={() => navigate('/admin/cash-closes')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Cierres de Caja
        </Button>
      }
    >
      <div className="space-y-6 max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card style={{ background: '#eff1ff' }} className="border-[#c5d3f8]">
            <CardContent className="pt-5 pb-4">
              <p className="text-sm text-[#3a71f7]">Total Registrado</p>
              <p className="text-3xl font-bold text-[#3a71f7]">{formatCOP(close.total_registered ?? 0)}</p>
            </CardContent>
          </Card>
          <Card style={{ background: '#ebf5ef' }} className="border-[#a3d4b5]">
            <CardContent className="pt-5 pb-4">
              <p className="text-sm text-[#228b52]">Total Contado</p>
              <p className="text-3xl font-bold text-[#228b52]">{formatCOP(close.total_counted ?? 0)}</p>
            </CardContent>
          </Card>
          <Card style={{ background: '#ffeeed' }} className="border-[#f4b8b8]">
            <CardContent className="pt-5 pb-4">
              <p className="text-sm text-[#b82626]">Diferencia</p>
              <p className="text-3xl font-bold text-[#b82626]">{formatCOP(diff)}</p>
              <Badge variant="outline" className={diff < 0 ? 'border-red-400 bg-red-100 text-red-700 mt-1' : 'border-green-400 bg-green-100 text-green-700 mt-1'}>
                {diff < 0 ? 'FALTA' : 'SOBRA'}
              </Badge>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Medios de Pago</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  {['Medio de Pago', 'Valor Registrado', 'Valor Contado', 'Diferencia'].map((h) => (
                    <th key={h} className="text-left px-4 py-2 font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(close.payment_methods ?? []).map((pm, i) => {
                  const d = (pm.counted_amount ?? 0) - (pm.registered_amount ?? 0);
                  return (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-2">{PAYMENT_METHOD_LABELS[pm.name as PaymentMethodName] ?? pm.name}</td>
                      <td className="px-4 py-2">{formatCOP(pm.registered_amount ?? 0)}</td>
                      <td className="px-4 py-2">{formatCOP(pm.counted_amount ?? 0)}</td>
                      <td className={`px-4 py-2 font-medium ${d < 0 ? 'text-red-600' : 'text-green-700'}`}>{formatCOP(d)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t bg-[#eff1ff]">
                  <td className="px-4 py-2 font-semibold text-[#3a71f7]">TOTALES</td>
                  <td className="px-4 py-2 font-semibold text-[#3a71f7]">{formatCOP(close.total_registered ?? 0)}</td>
                  <td className="px-4 py-2 font-semibold text-[#3a71f7]">{formatCOP(close.total_counted ?? 0)}</td>
                  <td className={`px-4 py-2 font-semibold ${totalsDiff < 0 ? 'text-red-600' : 'text-[#3a71f7]'}`}>{formatCOP(totalsDiff)}</td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>

        {close.status === 'submitted' && (
          <Card className="border-[#f4c678]" style={{ background: '#fff6e3' }}>
            <CardContent className="pt-5 space-y-3">
              <p className="font-semibold text-[#b57218]">⚠ Pendiente de Aprobación</p>
              <p className="text-sm text-[#b57218]">Revisa el cierre y decide si aprueba o devuelve al asesor.</p>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Observaciones del administrador (opcional)..."
                rows={3}
              />
              <div className="flex gap-3">
                <Button
                  className="bg-[#228b52] hover:bg-[#1a6e3f] text-white"
                  onClick={handleApprove}
                  disabled={isApproving}
                >
                  {isApproving ? 'Aprobando...' : 'Aprobar Cierre'}
                </Button>
                <Button
                  variant="outline"
                  className="border-[#b82626] text-[#b82626] bg-[#fee] hover:bg-red-100"
                  onClick={handleReturn}
                  disabled={isReturning}
                >
                  {isReturning ? 'Devolviendo...' : 'Devolver'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {close.status === 'approved' && (
          <Card className="border-[#a3d4b5]" style={{ background: '#ebf5ef' }}>
            <CardContent className="pt-5">
              <p className="font-semibold text-[#228b52]">✓ Cierre Aprobado</p>
              {close.admin_notes && (
                <p className="text-sm text-[#228b52] mt-1">Observaciones: {close.admin_notes}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
};

export default AdminCashCloseDetail;
