import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import PageLayout from '@/components/layouts/PageLayout';
import { branchService } from '@/services/branchService';
import BranchFormFields from './BranchFormFields';
import { branchFormSchema, emptyBranchFormValues, type BranchFormInput } from './branchSchemas';
import { branchFormToPayload } from './branchFormUtils';

const FORM_ID = 'branch-admin-form';

const BranchCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BranchFormInput>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: emptyBranchFormValues,
  });

  const onSubmit = async (data: BranchFormInput) => {
    setIsSubmitting(true);
    try {
      const created = await branchService.create(branchFormToPayload(data));
      await queryClient.invalidateQueries({ queryKey: ['branches'] });
      await queryClient.invalidateQueries({ queryKey: ['branches-all'] });
      await queryClient.invalidateQueries({ queryKey: ['branches-list'] });
      toast({ title: 'Sede creada', description: 'La sede fue creada correctamente.' });
      navigate(`/admin/sedes/${created.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo crear la sede';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout
      title="Nueva sede"
      subtitle="Admin / Sedes / Nueva sede"
      topbarClassName="h-auto min-h-[56px] py-3"
      titleStackClassName="gap-1"
      actions={
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-9 min-w-[160px] rounded-md text-[13px] font-semibold"
            onClick={() => navigate('/admin/sedes')}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            className="h-9 min-w-[160px] rounded-md bg-[#3a71f7] text-[13px] font-semibold text-white hover:bg-[#2f62db]"
            disabled={isSubmitting}
          >
            Crear sede
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

export default BranchCreatePage;
