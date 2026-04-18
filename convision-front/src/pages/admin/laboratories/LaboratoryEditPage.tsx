import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { laboratoryService } from '@/services/laboratoryService';
import LaboratoryFormShell from './LaboratoryFormShell';
import { laboratoryFormSchema, type LaboratoryFormInput } from './laboratorySchemas';

const LaboratoryEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const labId = id ? Number(id) : NaN;

  const { data: loaded, isLoading, isError } = useQuery({
    queryKey: ['laboratory', labId],
    queryFn: () => laboratoryService.getLaboratory(labId),
    enabled: Number.isFinite(labId),
  });

  const form = useForm<LaboratoryFormInput>({
    resolver: zodResolver(laboratoryFormSchema),
    defaultValues: {
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      status: 'active',
      notes: '',
    },
  });

  const { reset } = form;

  useEffect(() => {
    if (!loaded) return;
    reset({
      name: loaded.name,
      contact_person: loaded.contact_person ?? '',
      phone: loaded.phone ?? '',
      email: loaded.email ?? '',
      address: loaded.address ?? '',
      status: loaded.status,
      notes: loaded.notes ?? '',
    });
  }, [loaded, reset]);

  useEffect(() => {
    if (!isError) return;
    toast({ title: 'Error', description: 'No se pudo cargar el laboratorio.', variant: 'destructive' });
    navigate('/admin/laboratories');
  }, [isError, navigate, toast]);

  const onSubmit = async (data: LaboratoryFormInput) => {
    if (!Number.isFinite(labId)) return;
    setIsSubmitting(true);
    try {
      await laboratoryService.updateLaboratory(labId, {
        name: data.name,
        contact_person: data.contact_person || null,
        phone: data.phone || null,
        email: data.email && data.email.trim() !== '' ? data.email.trim() : null,
        address: data.address || null,
        status: data.status,
        notes: data.notes || null,
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-laboratories'] });
      await queryClient.invalidateQueries({ queryKey: ['laboratory', labId] });
      toast({ title: 'Laboratorio actualizado', description: 'Los cambios se guardaron correctamente.' });
      navigate('/admin/laboratories');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo actualizar';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!Number.isFinite(labId)) {
    navigate('/admin/laboratories', { replace: true });
    return null;
  }

  if (isError) {
    return null;
  }

  if (isLoading || !loaded) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[420px] w-full rounded-lg" />
      </div>
    );
  }

  return (
    <LaboratoryFormShell
      title="Editar Laboratorio"
      breadcrumb="Administración / Editar Laboratorio"
      form={form}
      onSubmit={onSubmit}
      onCancel={() => navigate('/admin/laboratories')}
      isSubmitting={isSubmitting}
      submitLabel="Guardar cambios"
      footerNote="Campos marcados con * son obligatorios"
    />
  );
};

export default LaboratoryEditPage;
