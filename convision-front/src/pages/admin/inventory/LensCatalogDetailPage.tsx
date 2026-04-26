import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Tag, Layers, Zap, BadgeDollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageLayout from '@/components/layouts/PageLayout';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { inventoryService, LensCatalogItem } from '@/services/inventoryService';

const fmtNum = (v: number | null | undefined) =>
  v == null || v === 0 ? '—' : String(v);

const fmtPrice = (v: number | null | undefined) =>
  v == null ? '—' : `$${v.toLocaleString('es-CO')}`;

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
    status === 'enabled' ? 'bg-[#ebf5ef] text-[#228b52]' : 'bg-[#f9f9fb] text-[#7d7d87]'
  }`}>
    {status === 'enabled' ? 'Activo' : 'Inactivo'}
  </span>
);

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <p className="text-[11px] font-medium text-[#7d7d87]">{label}</p>
    <div className="mt-0.5 text-[13px] text-[#121215]">{value}</div>
  </div>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[11px] font-semibold text-[#7d7d87] uppercase tracking-[1px] mb-3">{children}</p>
);

const LensCatalogDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const productId = id ? Number(id) : NaN;

  const { data, isLoading, isError } = useQuery<LensCatalogItem>({
    queryKey: ['lens-catalog-detail', productId],
    queryFn: () => inventoryService.getLensProduct(productId),
    enabled: Number.isFinite(productId),
    staleTime: 30_000,
  });

  if (!Number.isFinite(productId)) {
    navigate('/admin/inventory', { replace: true });
    return null;
  }

  if (isLoading) return <LoadingScreen />;

  if (isError || !data) {
    return (
      <PageLayout title="Lente" subtitle="Inventario / Catálogo de Lentes">
        <div className="rounded-lg border border-[#ebebee] bg-white p-8 text-center text-sm text-[#7d7d87]">
          No se encontró el lente.
          <div className="mt-4">
            <Button variant="outline" onClick={() => navigate('/admin/inventory')}>Volver</Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  const la = data.lens_attributes;
  const margin = data.price && data.cost && data.price > 0
    ? (((data.price - data.cost) / data.price) * 100).toFixed(1) + '%'
    : '—';

  return (
    <PageLayout
      title={data.identifier || data.internal_code}
      subtitle="Inventario / Catálogo de Lentes"
      actions={
        <Button type="button" variant="outline" className="h-9 rounded-md text-[13px]" asChild>
          <Link to="/admin/inventory">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Volver
          </Link>
        </Button>
      }
    >
      <div className="mx-auto flex max-w-[880px] flex-col gap-5 pb-8">

        {/* Summary header */}
        <div className="bg-white border border-[#e5e5e9] rounded-xl px-6 py-5 flex flex-wrap gap-y-4">
          <div className="flex-1 min-w-[220px] pr-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold text-[#7d7d87] bg-[#f5f5f6] px-2 py-0.5 rounded">
                {data.internal_code}
              </span>
              <StatusBadge status={data.status} />
            </div>
            <h2 className="text-[18px] font-bold text-[#121215] leading-snug">{data.identifier}</h2>
            {data.description && (
              <p className="text-[12px] text-[#7d7d87] mt-1">{data.description}</p>
            )}
          </div>

          <div className="hidden sm:block w-px bg-[#e5e5e9] self-stretch" />

          <div className="flex flex-col justify-center gap-0.5 px-6">
            <span className="text-[10px] font-semibold text-[#7d7d87] uppercase tracking-[1px]">Marca</span>
            <span className="text-[15px] font-semibold text-[#121215]">{data.brand?.name ?? '—'}</span>
          </div>

          <div className="hidden sm:block w-px bg-[#e5e5e9] self-stretch" />

          <div className="flex flex-col justify-center gap-0.5 px-6">
            <span className="text-[10px] font-semibold text-[#7d7d87] uppercase tracking-[1px]">Precio de venta</span>
            <span className="text-[22px] font-bold text-[#3a71f7] leading-none">{fmtPrice(data.price)}</span>
          </div>

          <div className="hidden sm:block w-px bg-[#e5e5e9] self-stretch" />

          <div className="flex flex-col justify-center gap-0.5 px-6">
            <span className="text-[10px] font-semibold text-[#7d7d87] uppercase tracking-[1px]">Costo</span>
            <span className="text-[15px] font-semibold text-[#121215]">{fmtPrice(data.cost)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Datos generales */}
          <Card className="rounded-lg border border-[#ebebee] shadow-sm">
            <CardHeader className="border-b border-[#e5e5e9] pb-3 pt-4 px-5">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-[#3a71f7]" />
                <CardTitle className="text-[14px] font-semibold text-[#0f0f12]">Datos generales</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 p-5">
              <Field label="Código interno" value={data.internal_code} />
              <Field label="Identificador / Ref." value={data.identifier} />
              <Field label="Marca" value={data.brand?.name ?? '—'} />
              <Field label="Estado" value={<StatusBadge status={data.status} />} />
              <Field
                label="Modo de inventario"
                value={
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#eff1ff] text-[#3a71f7]">
                    Catálogo — sin stock físico
                  </span>
                }
              />
            </CardContent>
          </Card>

          {/* Precios */}
          <Card className="rounded-lg border border-[#ebebee] shadow-sm">
            <CardHeader className="border-b border-[#e5e5e9] pb-3 pt-4 px-5">
              <div className="flex items-center gap-2">
                <BadgeDollarSign className="h-4 w-4 text-[#3a71f7]" />
                <CardTitle className="text-[14px] font-semibold text-[#0f0f12]">Precio y costo</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 p-5">
              <Field
                label="Precio de venta"
                value={<span className="text-[15px] font-bold text-[#3a71f7]">{fmtPrice(data.price)}</span>}
              />
              <Field label="Costo" value={fmtPrice(data.cost)} />
              <Field label="Margen bruto" value={margin} />
            </CardContent>
          </Card>

          {/* Atributos ópticos */}
          {la && (
            <Card className="rounded-lg border border-[#ebebee] shadow-sm md:col-span-2">
              <CardHeader className="border-b border-[#e5e5e9] pb-3 pt-4 px-5">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[#3a71f7]" />
                  <CardTitle className="text-[14px] font-semibold text-[#0f0f12]">Atributos ópticos</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-5">

                {/* Clasificación */}
                <div>
                  <SectionLabel>Clasificación</SectionLabel>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4">
                    <Field label="Tipo de lente" value={la.lens_type?.name ?? '—'} />
                    <Field label="Material / Índice" value={la.material?.name ?? '—'} />
                    <Field label="Clase / Diseño" value={la.lens_class?.name ?? '—'} />
                    <Field label="Tratamiento" value={la.treatment?.name ?? '—'} />
                    <Field label="Fotocromático" value={la.photochromic?.name ?? '—'} />
                    <Field label="Disponibilidad" value={la.availability || '—'} />
                  </div>
                </div>

                <div className="border-t border-[#e5e5e9]" />

                {/* Rangos de prescripción */}
                <div>
                  <SectionLabel>Rangos de prescripción</SectionLabel>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4">
                    <Field label="Esfera mín." value={fmtNum(la.sphere_min)} />
                    <Field label="Esfera máx." value={fmtNum(la.sphere_max)} />
                    <Field label="Cilindro mín." value={fmtNum(la.cylinder_min)} />
                    <Field label="Cilindro máx." value={fmtNum(la.cylinder_max)} />
                    <Field label="Adición mín." value={fmtNum(la.addition_min)} />
                    <Field label="Adición máx." value={fmtNum(la.addition_max)} />
                  </div>
                </div>

                {(la.diameter !== 0 || la.base_curve !== 0 || la.prism !== 0) && (
                  <>
                    <div className="border-t border-[#e5e5e9]" />
                    <div>
                      <SectionLabel>Geometría</SectionLabel>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4">
                        <Field label="Diámetro" value={fmtNum(la.diameter)} />
                        <Field label="Curva base" value={fmtNum(la.base_curve)} />
                        <Field label="Prisma" value={fmtNum(la.prism)} />
                      </div>
                    </div>
                  </>
                )}

                <div className="border-t border-[#e5e5e9]" />

                {/* Características adicionales */}
                <div>
                  <SectionLabel>Características adicionales</SectionLabel>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4">
                    <Field
                      label="Protección UV"
                      value={
                        la.uv_protection ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#ebf5ef] text-[#228b52]">Sí</span>
                        ) : <span className="text-[#7d7d87]">No</span>
                      }
                    />
                    <Field label="Grabado" value={la.engraving || '—'} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tipo de producto */}
          <Card className="rounded-lg border border-[#ebebee] shadow-sm md:col-span-2">
            <CardHeader className="border-b border-[#e5e5e9] pb-3 pt-4 px-5">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#3a71f7]" />
                <CardTitle className="text-[14px] font-semibold text-[#0f0f12]">Tipo de producto</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4 p-5">
              <Field label="Clasificación" value="Lente óptico" />
              <Field label="Gestión de stock" value="Catálogo — pedido bajo demanda" />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
};

export default LensCatalogDetailPage;
