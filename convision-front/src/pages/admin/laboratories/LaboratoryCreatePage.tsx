import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { laboratoryService } from '@/services/laboratoryService';
import LaboratoryFormShell from './LaboratoryFormShell';
import { laboratoryFormSchema, type LaboratoryFormInput } from './laboratorySchemas';

const LaboratoryCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const onSubmit = async (data: LaboratoryFormInput) => {
    setIsSubmitting(true);
    try {
      await laboratoryService.createLaboratory({
        name: data.name,
        contact_person: data.contact_person || null,
        phone: data.phone || null,
        email: data.email && data.email !== '' ? data.email : null,
        address: data.address || null,
        status: data.status,
        notes: data.notes || null,
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-laboratories'] });
      toast({ title: 'Laboratorio creado', description: 'Se guardó correctamente.' });
      navigate('/admin/laboratories');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo crear el laboratorio';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LaboratoryFormShell
      title="Nuevo Laboratorio"
      breadcrumb="Administración / Nuevo Laboratorio"
      form={form}
      onSubmit={onSubmit}
      onCancel={() => navigate('/admin/laboratories')}
      isSubmitting={isSubmitting}
      submitLabel="Crear Laboratorio"
      footerNote="Campos marcados con * son obligatorios"
    />
  );
};

export default LaboratoryCreatePage;
