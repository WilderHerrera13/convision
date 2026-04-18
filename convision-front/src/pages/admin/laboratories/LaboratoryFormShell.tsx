import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PageLayout from '@/components/layouts/PageLayout';
import LaboratoryHelpAside from './LaboratoryHelpAside';
import LaboratoryFormFields from './LaboratoryFormFields';
import type { LaboratoryFormInput } from './laboratorySchemas';

type Props = {
  title: string;
  breadcrumb: string;
  form: UseFormReturn<LaboratoryFormInput>;
  onSubmit: (v: LaboratoryFormInput) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel: string;
  footerNote: string;
};

const LaboratoryFormShell: React.FC<Props> = ({
  title,
  breadcrumb,
  form,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel,
  footerNote,
}) => (
  <PageLayout
    title={title}
    subtitle={breadcrumb}
    topbarClassName="h-auto min-h-[56px] py-3"
    titleStackClassName="gap-1"
    actions={
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="h-9 min-w-[160px] rounded-md text-[13px] font-semibold" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          form="laboratory-admin-form"
          className="h-9 min-w-[160px] rounded-md bg-[#3a71f7] text-[13px] font-semibold text-white hover:bg-[#2f62db]"
          disabled={isSubmitting}
        >
          {submitLabel}
        </Button>
      </div>
    }
  >
    <div className="flex min-h-[calc(100%-2rem)] w-full flex-col gap-6 lg:flex-row lg:items-start lg:gap-6">
      <Card className="min-w-0 w-full flex-1 overflow-hidden rounded-lg border border-[#ebebee] shadow-sm">
        <div className="border-b border-[#e5e5e9] bg-[#fafafb] px-0">
          <div className="inline-flex h-12 items-center border-b-2 border-[#3a71f7] bg-white px-5">
            <span className="text-[12px] font-semibold text-[#0f0f12]">Información del laboratorio</span>
          </div>
        </div>
        <CardContent className="p-0">
          <LaboratoryFormFields form={form} onSubmit={onSubmit} />
        </CardContent>
      </Card>
      <LaboratoryHelpAside />
    </div>
    <div className="mt-8 w-full border-t border-[#e5e5e9] pt-4 text-[12px] text-[#7d7d87]">{footerNote}</div>
  </PageLayout>
);

export default LaboratoryFormShell;
