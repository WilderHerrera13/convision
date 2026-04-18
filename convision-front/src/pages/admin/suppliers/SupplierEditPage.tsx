import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { supplierService } from '@/services/supplierService';
import { LoadingScreen } from '@/components/ui/loading-screen';
import SupplierFormPage from './SupplierFormPage';
import { supplierFormSchema, type SupplierFormInput } from './supplierSchemas';
import { emptySupplierFormValues, formValuesToCreatePayload, supplierToFormValues } from './supplierFormUtils';

const SupplierEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supplierId = id ? Number(id) : NaN;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-supplier', supplierId],
    queryFn: () => supplierService.getSupplier(supplierId),
    enabled: Number.isFinite(supplierId),
  });

  const form = useForm<SupplierFormInput>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: emptySupplierFormValues,
  });

  useEffect(() => {
    if (!data) return;
    form.reset(supplierToFormValues(data));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when loaded entity changes
  }, [data]);

  const onSubmit = async (values: SupplierFormInput) => {
    if (!Number.isFinite(supplierId)) return;
    setIsSubmitting(true);
    try {
      await supplierService.updateSupplier(supplierId, formValuesToCreatePayload(values));
      await queryClient.invalidateQueries({ queryKey: ['admin-suppliers'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-supplier', supplierId] });
      toast({ title: 'Proveedor actualizado', description: 'Los cambios se guardaron.' });
      navigate(`/admin/suppliers/${supplierId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo actualizar';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!Number.isFinite(supplierId)) {
    navigate('/admin/suppliers', { replace: true });
    return null;
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isError || !data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-sm font-medium text-[#121215]">No se pudo cargar el proveedor</p>
        <button type="button" className="text-sm text-[#3a71f7] underline" onClick={() => navigate('/admin/suppliers')}>
          Volver al listado
        </button>
      </div>
    );
  }

  return (
    <SupplierFormPage
      form={form}
      onSubmit={onSubmit}
      onCancel={() => navigate(`/admin/suppliers/${supplierId}`)}
      isSubmitting={isSubmitting}
      title="Editar proveedor"
      breadcrumb="Proveedores / Editar proveedor"
      submitLabel="Guardar cambios"
    />
  );
};

export default SupplierEditPage;
