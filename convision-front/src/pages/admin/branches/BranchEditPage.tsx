import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import PageLayout from '@/components/layouts/PageLayout';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { branchService } from '@/services/branchService';
import BranchFormFields from './BranchFormFields';
import { branchFormSchema, emptyBranchFormValues, type BranchFormInput } from './branchSchemas';
import { branchFormToPayload, branchToFormValues } from './branchFormUtils';

const FORM_ID = 'branch-admin-edit-form';

const BranchEditPage: React.FC = () => {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const id = branchId ? Number(branchId) : NaN;

  const form = useForm<BranchFormInput>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: emptyBranchFormValues,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-branch', id],
    queryFn: () => branchService.getById(id),
    enabled: Number.isFinite(id),
  });

  useEffect(() => {
    if (data) {
      form.reset(branchToFormValues(data));
    }
  }, [data, form]);

  const onSubmit = async (values: BranchFormInput) => {
    if (!Number.isFinite(id)) return;
    setIsSubmitting(true);
    try {
      await branchService.update(id, branchFormToPayload(values));
      await queryClient.invalidateQueries({ queryKey: ['branches'] });
      await queryClient.invalidateQueries({ queryKey: ['branches-all'] });
      await queryClient.invalidateQueries({ queryKey: ['branches-list'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-branch', id] });
      toast({ title: 'Sede actualizada', description: 'Los datos se guardaron correctamente.' });
      navigate(`/admin/sedes/${id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo actualizar la sede';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!Number.isFinite(id)) {
    navigate('/admin/sedes', { replace: true });
    return null;
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isError || !data) {
    return (
      <PageLayout title="Editar sede" subtitle="Admin / Sedes">
        <div className="rounded-lg border border-[#ebebee] bg-white p-8 text-center text-sm text-[#7d7d87]">
          No se encontró la sede.
          <div className="mt-4">
            <Button type="button" variant="outline" onClick={() => navigate('/admin/sedes')}>
              Volver
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Editar sede"
      subtitle={`Admin / Sedes / ${data.name}`}
      topbarClassName="h-auto min-h-[56px] py-3"
      titleStackClassName="gap-1"
      actions={
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-9 min-w-[160px] rounded-md text-[13px] font-semibold"
            onClick={() => navigate(`/admin/sedes/${id}`)}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            className="h-9 min-w-[160px] rounded-md bg-[#3a71f7] text-[13px] font-semibold text-white hover:bg-[#2f62db]"
            disabled={isSubmitting}
          >
            Guardar cambios
          </Button>
        </div>
      }
    >
      <Form {...form}>
        <form id={FORM_ID} onSubmit={form.handleSubmit(onSubmit)} className="mx-auto flex max-w-[720px] flex-col gap-6">
          <Card className="rounded-lg border border-[#ebebee] shadow-sm">
            <CardHeader className="border-b border-[#e5e5e9]">
              <CardTitle className="text-[15px] font-semibold text-[#0f0f12]">Datos de la sede</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <BranchFormFields form={form} />
            </CardContent>
          </Card>
        </form>
      </Form>
    </PageLayout>
  );
};

export default BranchEditPage;
