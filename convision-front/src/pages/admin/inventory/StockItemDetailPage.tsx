import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Tag, BadgeDollarSign, Layers, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageLayout from '@/components/layouts/PageLayout';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { inventoryService, LensCatalogItem } from '@/services/inventoryService';

const fmtPrice = (v: number | null | undefined) =>
  v == null ? '—' : `$${v.toLocaleString('es-CO')}`;

const fmtMeasure = (v: number | null | undefined) =>
  !v ? '—' : `${v} mm`;

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

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  frame: 'Montura',
  accessory: 'Accesorio',
  contact_lens: 'Lente de contacto',
  liquid: 'Líquido / Solución',
  other: 'Otro',
};

const StockItemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const productId = id ? Number(id) : NaN;

  const { data, isLoading, isError } = useQuery<LensCatalogItem>({
    queryKey: ['stock-item-detail', productId],
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
      <PageLayout title="Producto" subtitle="Inventario / Stock Físico">
        <div className="rounded-lg border border-[#ebebee] bg-white p-8 text-center text-sm text-[#7d7d87]">
          No se encontró el producto.
          <div className="mt-4">
            <Button variant="outline" onClick={() => navigate('/admin/inventory')}>Volver</Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  const fa = data.frame_attributes;
  const ca = data.contact_lens_attributes;
  const margin = data.price && data.cost && data.price > 0
    ? (((data.price - data.cost) / data.price) * 100).toFixed(1) + '%'
    : '—';
  const typeLabel = data.product_type ? (PRODUCT_TYPE_LABELS[data.product_type] ?? data.product_type) : '—';

  return (
    <PageLayout
      title={data.identifier || data.internal_code}
      subtitle="Inventario / Stock Físico"
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

        <div className="bg-white border border-[#e5e5e9] rounded-xl px-6 py-5 flex flex-wrap gap-y-4">
          <div className="flex-1 min-w-[220px] pr-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold text-[#7d7d87] bg-[#f5f5f6] px-2 py-0.5 rounded">
                {data.internal_code}
              </span>
              <StatusBadge status={data.status} />
            </div>
            <h2 className="text-[18px] font-bold text-[#121215] leading-snug">
              {data.description || data.identifier}
            </h2>
            {data.description && data.identifier && data.description !== data.identifier && (
              <p className="text-[12px] text-[#7d7d87] mt-1">{data.identifier}</p>
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

          <Card className="rounded-lg border border-[#ebebee] shadow-sm">
            <CardHeader className="border-b border-[#e5e5e9] pb-3 pt-4 px-5">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-[#3a71f7]" />
                <CardTitle className="text-[14px] font-semibold text-[#0f0f12]">Datos generales</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 p-5">
              <Field label="Código interno" value={data.internal_code} />
              <Field label="Referencia" value={data.identifier} />
              <Field label="Marca" value={data.brand?.name ?? '—'} />
              <Field label="Tipo de producto" value={typeLabel} />
              <Field label="Estado" value={<StatusBadge status={data.status} />} />
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-[#ebebee] shadow-sm">
            <CardHeader className="border-b border-[#e5e5e9] pb-3 pt-4 px-5">
              <div className="flex items-center gap-2">
                <BadgeDollarSign className="h-4 w-4 text-[#3a71f7]" />
                <CardTitle className="text-[14px] font-semibold text-[#0f0f12]">Precio y costo</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 p-5">
              <Field label="Precio de venta" value={
                <span className="text-[15px] font-bold text-[#3a71f7]">{fmtPrice(data.price)}</span>
              } />
              <Field label="Costo" value={fmtPrice(data.cost)} />
              <Field label="Margen bruto" value={margin} />
            </CardContent>
          </Card>

          {fa && (
            <Card className="rounded-lg border border-[#ebebee] shadow-sm md:col-span-2">
              <CardHeader className="border-b border-[#e5e5e9] pb-3 pt-4 px-5">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[#3a71f7]" />
                  <CardTitle className="text-[14px] font-semibold text-[#0f0f12]">Atributos de montura</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4">
                  <Field label="Tipo de armazón" value={fa.frame_type || '—'} />
                  <Field label="Material" value={fa.material_frame || '—'} />
                  <Field label="Género" value={fa.gender || '—'} />
                  <Field label="Color" value={fa.color || '—'} />
                  <Field label="Forma" value={fa.shape || '—'} />
                  <Field label="Ancho de lente" value={fmtMeasure(fa.lens_width)} />
                  <Field label="Puente" value={fmtMeasure(fa.bridge_width)} />
                  <Field label="Varilla (templo)" value={fmtMeasure(fa.temple_length)} />
                </div>
              </CardContent>
            </Card>
          )}

          {ca && (
            <Card className="rounded-lg border border-[#ebebee] shadow-sm md:col-span-2">
              <CardHeader className="border-b border-[#e5e5e9] pb-3 pt-4 px-5">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[#3a71f7]" />
                  <CardTitle className="text-[14px] font-semibold text-[#0f0f12]">Atributos de lente de contacto</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4">
                  <Field label="Tipo" value={ca.contact_type || '—'} />
                  <Field label="Reemplazo" value={ca.replacement_schedule || '—'} />
                  <Field label="Material" value={ca.material_contact || '—'} />
                  <Field label="Curva base" value={ca.base_curve ? String(ca.base_curve) : '—'} />
                  <Field label="Diámetro" value={ca.diameter ? String(ca.diameter) : '—'} />
                  <Field label="Contenido de agua" value={ca.water_content ? `${ca.water_content}%` : '—'} />
                  <Field
                    label="Protección UV"
                    value={ca.uv_protection
                      ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#ebf5ef] text-[#228b52]">Sí</span>
                      : <span className="text-[#7d7d87]">No</span>
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-lg border border-[#ebebee] shadow-sm md:col-span-2">
            <CardHeader className="border-b border-[#e5e5e9] pb-3 pt-4 px-5">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-[#3a71f7]" />
                <CardTitle className="text-[14px] font-semibold text-[#0f0f12]">Gestión de inventario</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4 p-5">
              <Field label="Clasificación" value={typeLabel} />
              <Field
                label="Gestión de stock"
                value={
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#eff1ff] text-[#3a71f7]">
                    Stock físico — trazado por unidades
                  </span>
                }
              />
            </CardContent>
          </Card>

        </div>
      </div>
    </PageLayout>
  );
};

export default StockItemDetailPage;
