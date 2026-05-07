import React, { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PageLayout from '@/components/layouts/PageLayout';
import UserRoleHelpAside from './UserRoleHelpAside';
import UserFormFields from './UserFormFields';
import type { User } from '@/services/userService';
import type { AdminUserFormInput } from './userSchemas';
import type { ViewBranchAssignment } from './UserFormBranchesBlock';

type Props = {
  mode: 'create' | 'edit' | 'view';
  title: string;
  breadcrumb: string;
  form: UseFormReturn<AdminUserFormInput>;
  onSubmit: (v: AdminUserFormInput) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel: string;
  asideUser?: Pick<User, 'role' | 'name' | 'last_name' | 'email' | 'created_at' | 'branch_assignments'>;
  viewBranchAssignments?: ViewBranchAssignment[];
  footerNote: string;
  onEdit?: () => void;
  renderRolesTab?: React.ReactNode;
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
  viewBranchAssignments,
  footerNote,
  onEdit,
  renderRolesTab,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'roles'>('info');
  const hasRolesTab = !!renderRolesTab;

  const roleWatch = form.watch('role') as User['role'];
  const displayName =
    asideUser && [asideUser.name, asideUser.last_name].filter(Boolean).join(' ').trim();
  const asideMode = mode === 'view' ? 'edit' : mode;

  const branchAsideSummary =
    asideUser &&
    (asideUser.role === 'specialist' || asideUser.role === 'receptionist') &&
    asideUser.branch_assignments?.length
      ? asideUser.branch_assignments
          .slice()
          .sort((a, b) => (a.is_primary === b.is_primary ? 0 : a.is_primary ? -1 : 1))
          .map((a) => (a.is_primary ? `${a.name || 'Sede'} (Principal)` : a.name || `Sede ${a.branch_id}`))
          .join(' · ')
      : undefined;

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
            {hasRolesTab ? (
              <div className="flex">
                <button
                  type="button"
                  onClick={() => setActiveTab('info')}
                  className={`inline-flex h-12 items-center border-b-2 px-5 text-[12px] font-semibold transition-colors ${
                    activeTab === 'info'
                      ? 'border-convision-primary bg-white text-[#0f0f12]'
                      : 'border-transparent text-[#7d7d87] hover:text-[#0f0f12]'
                  }`}
                >
                  Información de usuario
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('roles')}
                  className={`inline-flex h-12 items-center border-b-2 px-5 text-[12px] font-semibold transition-colors ${
                    activeTab === 'roles'
                      ? 'border-convision-primary bg-white text-[#0f0f12]'
                      : 'border-transparent text-[#7d7d87] hover:text-[#0f0f12]'
                  }`}
                >
                  Roles y Permisos
                </button>
              </div>
            ) : (
              <div className="inline-flex h-12 items-center border-b-2 border-convision-primary bg-white px-5">
                <span className="text-[12px] font-semibold text-[#0f0f12]">Información de usuario</span>
              </div>
            )}
          </div>
          <CardContent className="p-0">
            <div className={activeTab === 'info' ? '' : 'hidden'}>
              <UserFormFields
                mode={mode}
                form={form}
                onSubmit={onSubmit}
                viewBranchAssignments={viewBranchAssignments}
              />
            </div>
            {hasRolesTab && (
              <div className={activeTab === 'roles' ? '' : 'hidden'}>{renderRolesTab}</div>
            )}
          </CardContent>
        </Card>

        <UserRoleHelpAside
          mode={asideMode}
          role={asideUser?.role ?? roleWatch}
          displayName={displayName}
          email={asideUser?.email}
          createdAt={asideUser?.created_at}
          branchAsideSummary={branchAsideSummary}
          isRolesTab={hasRolesTab && activeTab === 'roles'}
        />
      </div>
      <div className="mt-8 w-full border-t border-[#e5e5e9] pt-4 text-[12px] text-[#7d7d87]">
        {footerNote}
      </div>
    </PageLayout>
  );
};

export default UserFormShell;
