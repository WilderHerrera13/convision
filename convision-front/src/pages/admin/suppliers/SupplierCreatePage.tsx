import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { supplierService } from '@/services/supplierService';
import SupplierFormPage from './SupplierFormPage';
import { supplierFormSchema, type SupplierFormInput } from './supplierSchemas';
import { emptySupplierFormValues, formValuesToCreatePayload } from './supplierFormUtils';

const SupplierCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SupplierFormInput>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: emptySupplierFormValues,
  });

  const onSubmit = async (data: SupplierFormInput) => {
    setIsSubmitting(true);
    try {
      await supplierService.createSupplier(formValuesToCreatePayload(data));
      await queryClient.invalidateQueries({ queryKey: ['admin-suppliers'] });
      toast({ title: 'Proveedor creado', description: 'Se guardó correctamente.' });
      navigate('/admin/suppliers');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo crear el proveedor';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SupplierFormPage
      form={form}
      onSubmit={onSubmit}
      onCancel={() => navigate('/admin/suppliers')}
      isSubmitting={isSubmitting}
      title="Nuevo proveedor"
      breadcrumb="Proveedores / Nuevo proveedor"
      submitLabel="Crear proveedor"
    />
  );
};

export default SupplierCreatePage;
