import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { payrollService, type Payroll } from '@/services/payrollService';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, Upload } from 'lucide-react';

const statusVariant: Record<string, 'default' | 'destructive' | 'outline' | 'secondary' | 'success' | 'warning' | 'info'> = {
  pending: 'secondary',
  paid: 'default',
  cancelled: 'destructive',
};

const PayrollDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [payroll, setPayroll] = useState<Payroll | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    try {
      if (!id) return;
      const data = await payrollService.getPayroll(Number(id));
      setPayroll(data);
    } catch (e) {
      toast({ title: 'Error', description: 'No se pudo cargar la nómina', variant: 'destructive' });
    }
  };

  useEffect(() => { load(); }, [id]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !payroll?.employee_id) return;
    try {
      setUploading(true);
      const file = e.target.files[0];
      await payrollService.uploadEmployeePhoto(payroll.employee_id, file);
      toast({ title: 'Foto actualizada', description: 'La foto del empleado fue actualizada.' });
      await load();
    } catch (err) {
      toast({ title: 'Error', description: 'No se pudo actualizar la foto del empleado', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/payrolls')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Volver
          </Button>
          <h2 className="text-2xl font-bold">Detalle de Nómina</h2>
        </div>
      </div>

      {/* Employee Card */}
      <Card>
        <CardHeader>
          <CardTitle>Empleado</CardTitle>
          <CardDescription>Información del empleado</CardDescription>
        </CardHeader>
        <CardContent>
          {payroll ? (
            <div className="flex items-start gap-6">
              <div className="w-28 h-28 rounded-md bg-muted overflow-hidden flex items-center justify-center">
                {payroll.employee_photo_url ? (
                  <img src={payroll.employee_photo_url} alt="Empleado" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm text-muted-foreground">Sin foto</span>
                )}
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nombre</p>
                  <p className="font-medium">{payroll.employee_name || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Identificación</p>
                  <p className="font-medium">{payroll.employee_identification || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cargo</p>
                  <p className="font-medium">{payroll.employee_position || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <Badge variant={statusVariant[payroll.status] || 'default'}>
                    {{ pending: 'Pendiente', paid: 'Pagado', cancelled: 'Cancelado' }[payroll.status] || payroll.status}
                  </Badge>
                </div>
                <div className="md:col-span-2">
                  <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                    <Upload className="h-4 w-4" />
                    <span>Actualizar foto</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div>Cargando...</div>
          )}
        </CardContent>
      </Card>

      {/* Payroll summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Pago</CardTitle>
        </CardHeader>
        <CardContent>
          {payroll && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Período</p>
                <p className="font-medium">{formatDate(payroll.pay_period_start)} al {formatDate(payroll.pay_period_end)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Salario Base</p>
                <p className="font-medium">{formatCurrency(payroll.base_salary)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Salario Neto</p>
                <p className="font-medium text-green-600">{formatCurrency(payroll.net_salary || 0)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollDetail;


