import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import PageLayout from '@/components/layouts/PageLayout';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useToast } from '@/components/ui/use-toast';
import { superAdminService } from '@/services/superAdmin';

const PLAN_LABELS: Record<string, string> = {
  standard: 'Estándar',
  premium: 'Premium',
  enterprise: 'Enterprise',
};

const FEATURE_LABELS: Record<string, string> = {
  'sidebar.appointments': 'Citas',
  'sidebar.sales': 'Ventas',
  'sidebar.purchases': 'Compras',
  'sidebar.inventory': 'Inventario',
  'sidebar.laboratory': 'Laboratorio',
  'sidebar.reports': 'Reportes',
  'sidebar.payroll': 'Nómina',
  'sidebar.expenses': 'Gastos',
  'sidebar.clinical': 'Historia Clínica',
  'sidebar.catalog': 'Catálogo',
  'sidebar.quotes': 'Cotizaciones',
  'sidebar.discounts': 'Descuentos',
};

const OpticaDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const opticaId = id ? Number(id) : NaN;
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const { data: optica, isLoading: loadingOptica, isError: errorOptica } = useQuery({
    queryKey: ['super-admin-optica', opticaId],
    queryFn: () => superAdminService.getOptica(opticaId),
    enabled: Number.isFinite(opticaId),
  });

  const { data: featuresData, isLoading: loadingFeatures } = useQuery({
    queryKey: ['super-admin-optica-features', opticaId],
    queryFn: () => superAdminService.listFeatures(opticaId),
    enabled: Number.isFinite(opticaId),
  });

  if (!Number.isFinite(opticaId)) {
    navigate('/super-admin/opticas', { replace: true });
    return null;
  }

  if (loadingOptica) return <LoadingScreen />;

  if (errorOptica || !optica) {
    return (
      <PageLayout title="Óptica" subtitle="Super Admin / Ópticas">
        <div className="rounded-lg border border-[#ebebee] bg-white p-8 text-center text-sm text-[#7d7d87]">
          No se encontró la óptica.
          <div className="mt-4">
            <Button type="button" variant="outline" onClick={() => navigate('/super-admin/opticas')}>Volver</Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  const handleToggle = async (featureKey: string, currentValue: boolean) => {
    setTogglingKey(featureKey);
    try {
      await superAdminService.toggleFeature(opticaId, featureKey, !currentValue);
      await queryClient.invalidateQueries({ queryKey: ['super-admin-optica-features', opticaId] });
      toast({ title: 'Funcionalidad actualizada', description: `${FEATURE_LABELS[featureKey] ?? featureKey} ${!currentValue ? 'activada' : 'desactivada'}.` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo actualizar la funcionalidad';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setTogglingKey(null);
    }
  };

  const features = featuresData?.features ?? [];

  return (
    <PageLayout
      title={optica.name}
      subtitle="Super Admin / Ópticas"
      actions={
        <Button type="button" variant="outline" className="h-9 rounded-md text-[13px]" onClick={() => navigate('/super-admin/opticas')}>
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Volver
        </Button>
      }
    >
      <div className="mx-auto flex max-w-[720px] flex-col gap-6">
        <Card className="rounded-lg border border-[#ebebee] shadow-sm">
          <CardHeader className="border-b border-[#e5e5e9]">
            <CardTitle className="text-[15px] font-semibold text-[#121215]">Información</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-[13px]">
              {[
                { label: 'Nombre', value: optica.name },
                { label: 'Slug', value: optica.slug },
                { label: 'Esquema', value: optica.schema_name },
                { label: 'Plan', value: <Badge variant="outline">{PLAN_LABELS[optica.plan] ?? optica.plan}</Badge> },
                { label: 'Estado', value: <Badge variant={optica.is_active ? 'default' : 'secondary'}>{optica.is_active ? 'Activa' : 'Inactiva'}</Badge> },
                { label: 'Creada', value: new Date(optica.created_at).toLocaleDateString('es-CO') },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <dt className="text-[11px] font-medium text-[#7d7d87] uppercase tracking-wide">{label}</dt>
                  <dd className="font-medium text-[#121215]">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card className="rounded-lg border border-[#ebebee] shadow-sm">
          <CardHeader className="border-b border-[#e5e5e9]">
            <CardTitle className="text-[15px] font-semibold text-[#121215]">Banderas de funcionalidades</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {loadingFeatures ? (
              <div className="py-8 text-center text-sm text-[#7d7d87]">Cargando funcionalidades...</div>
            ) : (
              <>
                <div className="flex items-start gap-2 rounded-md bg-[#f8f7fa] border border-[#ebebee] p-3 mb-4">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#7d7d87]" />
                  <p className="text-[12px] text-[#7d7d87]">Los cambios tomarán efecto cuando el usuario vuelva a iniciar sesión.</p>
                </div>
                <div className="flex flex-col divide-y divide-[#f0f0f3]">
                  {Object.keys(FEATURE_LABELS).map((key) => {
                    const feature = features.find((f) => f.feature_key === key);
                    const isEnabled = feature?.is_enabled ?? false;
                    return (
                      <div key={key} className="flex items-center justify-between py-3">
                        <Label htmlFor={`feature-${key}`} className="text-[13px] font-normal text-[#121215] cursor-pointer">
                          {FEATURE_LABELS[key]}
                        </Label>
                        <Switch
                          id={`feature-${key}`}
                          checked={isEnabled}
                          disabled={togglingKey === key}
                          onCheckedChange={() => handleToggle(key, isEnabled)}
                        />
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default OpticaDetailPage;
