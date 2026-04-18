import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageLayout from '@/components/layouts/PageLayout';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useToast } from '@/components/ui/use-toast';
import { laboratoryService, type Laboratory } from '@/services/laboratoryService';

const LaboratoryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lab, setLab] = useState<Laboratory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const n = Number(id);
    if (!id || Number.isNaN(n)) {
      navigate('/admin/laboratories');
      return;
    }
    (async () => {
      try {
        const data = await laboratoryService.getLaboratory(n);
        setLab(data);
      } catch {
        toast({ title: 'Error', description: 'No se pudo cargar el laboratorio.', variant: 'destructive' });
        navigate('/admin/laboratories');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate, toast]);

  if (loading || !lab) {
    return <LoadingScreen />;
  }

  return (
    <PageLayout
      title={lab.name}
      subtitle="Administración / Detalle de laboratorio"
      actions={
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="min-w-[120px]" onClick={() => navigate('/admin/laboratories')}>
            Volver
          </Button>
          <Button
            type="button"
            className="min-w-[140px] bg-[#3a71f7] text-white hover:bg-[#2f62db]"
            onClick={() => navigate(`/admin/laboratories/${lab.id}/edit`)}
          >
            Editar
          </Button>
        </div>
      }
    >
      <Card className="max-w-2xl rounded-lg border border-[#ebebee] shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Datos del laboratorio</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-medium text-[#7d7d87]">Persona de contacto</p>
            <p className="mt-1 text-[#121215]">{lab.contact_person || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-[#7d7d87]">Teléfono</p>
            <p className="mt-1 text-[#121215]">{lab.phone || '—'}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-[11px] font-medium text-[#7d7d87]">Correo electrónico</p>
            <p className="mt-1 text-[#121215]">{lab.email || '—'}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-[11px] font-medium text-[#7d7d87]">Dirección</p>
            <p className="mt-1 text-[#121215]">{lab.address || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-[#7d7d87]">Estado</p>
            <p className="mt-1 font-medium text-[#121215]">{lab.status === 'active' ? 'Activo' : 'Inactivo'}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-[11px] font-medium text-[#7d7d87]">Notas</p>
            <p className="mt-1 whitespace-pre-wrap text-[#121215]">{lab.notes || '—'}</p>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
};

export default LaboratoryDetailPage;
