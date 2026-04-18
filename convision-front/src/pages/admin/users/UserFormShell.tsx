import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PageLayout from '@/components/layouts/PageLayout';
import UserRoleHelpAside from './UserRoleHelpAside';
import UserFormFields from './UserFormFields';
import type { User } from '@/services/userService';
import type { AdminUserFormInput } from './userSchemas';

type Props = {
  mode: 'create' | 'edit' | 'view';
  title: string;
  breadcrumb: string;
  form: UseFormReturn<AdminUserFormInput>;
  onSubmit: (v: AdminUserFormInput) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel: string;
  asideUser?: Pick<User, 'role' | 'name' | 'last_name' | 'email' | 'created_at'>;
  footerNote: string;
  onEdit?: () => void;
};

const UserFormShell: React.FC<Props> = ({
  mode,
  title,
  breadcrumb,
  form,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel,
  asideUser,
  footerNote,
  onEdit,
}) => {
  const roleWatch = form.watch('role') as User['role'];
  const displayName =
    asideUser && [asideUser.name, asideUser.last_name].filter(Boolean).join(' ').trim();
  const asideMode = mode === 'view' ? 'edit' : mode;

  return (
    <PageLayout
      title={title}
      subtitle={breadcrumb}
      topbarClassName="h-auto min-h-[56px] py-3"
      titleStackClassName="gap-1"
      actions={
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="min-w-[160px]" onClick={onCancel}>
            Cancelar
          </Button>
          {mode === 'view' ? (
            <Button
              type="button"
              className="min-w-[160px] bg-convision-primary text-white hover:bg-convision-dark"
              onClick={() => onEdit?.()}
            >
              Editar
            </Button>
          ) : (
            <Button
              type="submit"
              form="user-admin-form"
              className="min-w-[160px] bg-convision-primary text-white hover:bg-convision-dark"
              disabled={isSubmitting}
            >
              {submitLabel}
            </Button>
          )}
        </div>
      }
    >
      <div className="flex min-h-[calc(100%-2rem)] w-full flex-col gap-6 lg:flex-row lg:items-start lg:gap-6">
        <Card className="min-w-0 w-full flex-1 overflow-hidden rounded-lg border border-[#ebebee] shadow-sm">
          <div className="border-b border-[#e5e5e9] bg-[#fafafb] px-0">
            <div className="inline-flex h-12 items-center border-b-2 border-convision-primary bg-white px-5">
              <span className="text-[12px] font-semibold text-[#0f0f12]">Información de usuario</span>
            </div>
          </div>
          <CardContent className="p-0">
            <UserFormFields mode={mode} form={form} onSubmit={onSubmit} />
          </CardContent>
        </Card>

        <UserRoleHelpAside
          mode={asideMode}
          role={asideUser?.role ?? roleWatch}
          displayName={displayName}
          email={asideUser?.email}
          createdAt={asideUser?.created_at}
        />
      </div>
      <div className="mt-8 w-full border-t border-[#e5e5e9] pt-4 text-[12px] text-[#7d7d87]">
        {footerNote}
      </div>
    </PageLayout>
  );
};

export default UserFormShell;
