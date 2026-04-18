import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, CheckCircle, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import AdminCashCloseActualsSection from '@/components/admin/AdminCashCloseActualsSection';
import cashRegisterCloseService, {
  CashClose,
  PAYMENT_METHOD_LABELS,
  PaymentMethodName,
} from '@/services/cashRegisterCloseService';
import { formatCOP } from './cashClosesConfig';
import { formatTime12h } from '@/lib/utils';

interface CashCloseDetail extends CashClose {
  user?: { id: number; name: string; last_name: string };
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'border-gray-300 bg-[#f5f5f7] text-[#7d7d87]' },
  submitted: { label: 'Enviado', className: 'border-[#b57218] bg-[#fff6e3] text-[#b57218]' },
  approved: { label: 'Aprobado', className: 'border-[#228b52] bg-[#ebf5ef] text-[#228b52]' },
};

const AdminCashCloseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [close, setClose] = useState<CashCloseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);

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
    setShowApproveDialog(false);
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
    setShowReturnDialog(false);
    setIsReturning(true);
    try {
      await cashRegisterCloseService.returnToDraft(Number(id), adminNotes);
      toast.success('Cierre devuelto al asesor');
      const resp = await cashRegisterCloseService.get(Number(id));
      setClose(resp?.data ?? resp);
    } catch {
      toast.error('Error al devolver el cierre');
    } finally {
      setIsReturning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-[#e5e5e9] bg-white px-6 py-4">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex-1 overflow-auto p-6 space-y-6">
          <Skeleton className="h-[92px] w-full rounded-lg" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-[100px] rounded-lg" />
            <Skeleton className="h-[100px] rounded-lg" />
            <Skeleton className="h-[100px] rounded-lg" />
          </div>
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!close) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">Cierre no encontrado.</p>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[close.status] ?? STATUS_CONFIG.draft;
  const userName = close.user ? `${close.user.name} ${close.user.last_name}` : 'Asesor';
  const dateLabel = format(new Date(close.close_date + 'T12:00:00'), 'dd/MM/yyyy');
  const showAdminReconciliation =
    isAdmin && (close.status === 'submitted' || close.status === 'approved');

  const submittedLabel = close.updated_at
    ? `Enviado el ${format(new Date(close.updated_at), 'dd/MM/yyyy')} a las ${formatTime12h(close.updated_at)}`
    : null;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-[#e5e5e9] bg-white px-6 py-0 h-[72px] flex items-center gap-4 shrink-0">
        <button
          onClick={() => navigate(isAdmin ? '/admin/cash-closes' : '/receptionist/cash-close-history')}
          className="flex items-center gap-1.5 text-[11px] font-medium text-[#3a71f7] bg-[#eff1ff] border border-[#c5d3f8] rounded-md px-3 py-1.5 hover:bg-[#dce5ff] transition-colors shrink-0"
        >
          <ArrowLeft className="h-3 w-3" />
          {isAdmin ? 'Cierres de Caja' : 'Historial de cierres'}
        </button>

        <div className="w-px h-9 bg-[#dcdce0] shrink-0" />

        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-[#0f0f12] leading-tight">{userName}</p>
          <p className="text-[12px] text-[#7d7d87] leading-tight">{dateLabel}</p>
        </div>

        <Badge variant="outline" className={`shrink-0 ${statusCfg.className}`}>
          {statusCfg.label}
        </Badge>

        {submittedLabel && close.status === 'submitted' && (
          <p className="text-[11px] text-[#7d7d87] hidden lg:block ml-2">{submittedLabel}</p>
        )}

        <div className="flex-1" />

        {close.status === 'submitted' && isAdmin && (
          <>
            <div className="w-px h-9 bg-[#dcdce0] shrink-0" />
            <Button
              size="sm"
              className="bg-[#228b52] hover:bg-[#1a6e3f] text-white shrink-0 gap-1"
              onClick={() => setShowApproveDialog(true)}
              disabled={isApproving}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              {isApproving ? 'Aprobando...' : 'Aprobar'}
            </Button>
          </>
        )}

        {close.status === 'approved' && (
          <>
            <div className="w-px h-9 bg-[#dcdce0] shrink-0" />
            <Badge className="shrink-0 bg-[#228b52] text-white border-[#228b52]">
              ✓ Aprobado
            </Badge>
          </>
        )}
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <Card className="border-[#c5d3f8] bg-[#f8f9ff]">
          <CardContent className="pt-5 pb-4 border-l-4 border-l-[#3a71f7]">
            <p className="text-sm text-[#3a71f7]">Total declarado por el asesor (medios de pago)</p>
            <p className="text-3xl font-bold text-[#0f0f12]">{formatCOP(close.total_counted ?? 0)}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {isAdmin
                ? 'Los totales reales que registres como administrador se comparan con esta declaración en la sección de conciliación (solo visible para administradores).'
                : 'Total según tu declaración en el cierre. La revisión administrativa, si aplica, se hace por separado.'}
            </p>
          </CardContent>
        </Card>

        {close.advisor_notes && close.advisor_notes.trim() !== '' && (
          <Card className="border-border">
            <CardContent className="pt-5 pb-4">
              <p className="text-sm font-semibold text-foreground">Observaciones del asesor</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{close.advisor_notes}</p>
            </CardContent>
          </Card>
        )}

        {showAdminReconciliation ? (
          <AdminCashCloseActualsSection
            close={close}
            onUpdated={(data) => setClose(data as CashCloseDetail)}
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="border-b border-[#dcdce0] bg-[#f7f7f8] px-4 py-2.5">
                <p className="text-sm font-semibold text-[#0f0f12]">Medios de Pago — declaración del asesor</p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Medio de Pago</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Valor contado</th>
                  </tr>
                </thead>
                <tbody>
                  {(close.payment_methods ?? []).map((pm, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-2">{PAYMENT_METHOD_LABELS[pm.name as PaymentMethodName] ?? pm.name}</td>
                      <td className="px-4 py-2">{formatCOP(pm.counted_amount ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-[#eff1ff]">
                    <td className="px-4 py-2 font-semibold text-[#3a71f7]">Total</td>
                    <td className="px-4 py-2 font-semibold text-[#3a71f7]">{formatCOP(close.total_counted ?? 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        )}

        {close.status === 'submitted' && isAdmin && (
          <Card className="border-[#f4c678] bg-[#fff6e3]">
            <CardContent className="pt-5 space-y-3 border-l-4 border-l-[#b57218]">
              <p className="font-semibold text-[#b57218]">⚠ Pendiente de Aprobación</p>
              <p className="text-sm text-[#b57218]">
                Revisa el cierre y decide si aprueba o devuelve al asesor. El asesor no verá las observaciones.
              </p>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Observaciones del administrador (opcional)..."
                rows={3}
              />
              <div className="flex gap-3">
                <Button
                  className="bg-[#228b52] hover:bg-[#1a6e3f] text-white"
                  onClick={() => setShowApproveDialog(true)}
                  disabled={isApproving}
                >
                  {isApproving ? 'Aprobando...' : 'Aprobar Cierre'}
                </Button>
                <Button
                  variant="outline"
                  className="border-[#b82626] text-[#b82626] bg-[#ffeeed] hover:bg-red-100"
                  onClick={() => setShowReturnDialog(true)}
                  disabled={isReturning}
                >
                  {isReturning ? 'Devolviendo...' : 'Devolver'}
                </Button>
              </div>
              <p className="text-[11px] text-[#7d7d87]">
                Esta acción es registrada con marca de tiempo y no es reversible sin un nuevo envío del asesor.
              </p>
            </CardContent>
          </Card>
        )}

        {close.status === 'approved' && (
          <Card className="border-[#a3d4b5] bg-[#ebf5ef]">
            <CardContent className="pt-5 border-l-4 border-l-[#228b52]">
              <p className="font-semibold text-[#228b52]">✓ Cierre Aprobado</p>
              {close.admin_notes && (
                <p className="text-sm text-[#228b52] mt-1">Observaciones: {close.admin_notes}</p>
              )}
            </CardContent>
          </Card>
        )}

        {!isAdmin && close.status === 'draft' && (
          <Card className="border-[#c5d3f8] bg-[#eff1ff]">
            <CardContent className="pt-5 pb-4 border-l-4 border-l-[#3a71f7] space-y-3">
              <p className="font-semibold text-[#3a71f7]">Cierre en borrador</p>
              <p className="text-sm text-[#3a71f7]">
                Este cierre aún no ha sido enviado. Puedes editarlo y completar el proceso desde la pantalla de cierre.
              </p>
              <Button
                size="sm"
                className="bg-[#3a71f7] hover:bg-[#2d5dcc] text-white gap-1.5"
                onClick={() => navigate('/receptionist/cash-closes')}
              >
                <Pencil className="h-3.5 w-3.5" />
                Ir a editar cierre
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={showApproveDialog}
        onOpenChange={setShowApproveDialog}
        title="Aprobar cierre"
        description="Esta acción aprobará el cierre de caja del asesor. ¿Confirmas la aprobación?"
        confirmLabel="Aprobar"
        variant="default"
        onConfirm={handleApprove}
        isLoading={isApproving}
      />

      <ConfirmDialog
        open={showReturnDialog}
        onOpenChange={setShowReturnDialog}
        title="Devolver cierre"
        description="El cierre será devuelto al asesor para revisión. ¿Confirmas esta acción?"
        confirmLabel="Devolver"
        variant="danger"
        onConfirm={handleReturn}
        isLoading={isReturning}
      />
    </div>
  );
};

export default AdminCashCloseDetail;
