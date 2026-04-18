import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageLayout from '@/components/layouts/PageLayout';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { supplierService } from '@/services/supplierService';

const SupplierDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const supplierId = id ? Number(id) : NaN;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-supplier', supplierId],
    queryFn: () => supplierService.getSupplier(supplierId),
    enabled: Number.isFinite(supplierId),
  });

  if (!Number.isFinite(supplierId)) {
    navigate('/admin/suppliers', { replace: true });
    return null;
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isError || !data) {
    return (
      <PageLayout title="Proveedor" subtitle="Administración / Proveedores">
        <div className="rounded-lg border border-[#ebebee] bg-white p-8 text-center text-sm text-[#7d7d87]">
          No se encontró el proveedor.
          <div className="mt-4">
            <Button variant="outline" type="button" onClick={() => navigate('/admin/suppliers')}>
              Volver
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  const rows: { label: string; value: string }[] = [
    { label: 'Nombre', value: data.name },
    { label: 'NIT / R.U.T.', value: data.nit || '—' },
    { label: 'Tipo', value: data.person_type === 'natural' ? 'Persona natural' : 'Persona jurídica' },
    { label: 'País', value: data.country || '—' },
    { label: 'Ciudad', value: data.city || '—' },
    { label: 'Contacto', value: data.legal_representative || '—' },
    { label: 'Cargo / área', value: data.responsible_person || '—' },
    { label: 'Teléfono', value: data.phone || '—' },
    { label: 'Correo', value: data.email || '—' },
    { label: 'Sitio web', value: data.website || '—' },
    { label: 'Dirección', value: data.address || '—' },
  ];

  return (
    <PageLayout
      title={data.name}
      subtitle="Administración / Proveedores"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="h-9 rounded-md text-[13px]" asChild>
            <Link to="/admin/suppliers">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Volver
            </Link>
          </Button>
          <Button
            type="button"
            className="h-9 rounded-md bg-[#3a71f7] text-[13px] font-semibold text-white hover:bg-[#2f62db]"
            onClick={() => navigate(`/admin/suppliers/${data.id}/edit`)}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Editar
          </Button>
        </div>
      }
    >
      <div className="mx-auto flex max-w-[720px] flex-col gap-6">
        <Card className="rounded-lg border border-[#ebebee] shadow-sm">
          <CardHeader className="border-b border-[#e5e5e9]">
            <CardTitle className="text-[15px] font-semibold text-[#0f0f12]">Datos generales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {rows.map((r) => (
              <div key={r.label} className="min-w-0">
                <p className="text-[11px] font-medium text-[#7d7d87]">{r.label}</p>
                <p className="mt-0.5 text-[13px] text-[#121215]">{r.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        {data.notes ? (
          <Card className="rounded-lg border border-[#ebebee] shadow-sm">
            <CardHeader className="border-b border-[#e5e5e9]">
              <CardTitle className="text-[15px] font-semibold text-[#0f0f12]">Notas y términos</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-[#121215]">
                {data.notes}
              </pre>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </PageLayout>
  );
};

export default SupplierDetailPage;
