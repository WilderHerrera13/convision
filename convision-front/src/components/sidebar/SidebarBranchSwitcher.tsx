import React from 'react';
import { Building2, ArrowLeftRight } from 'lucide-react';
import { useBranch } from '@/contexts/BranchContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const SidebarBranchSwitcher: React.FC = () => {
  const { branchId, branchName } = useBranch();
  const { branches } = useAuth();
  const navigate = useNavigate();

  if (!branchName && !branchId) return null;

  const canSwitch = branches.length > 1;

  if (!canSwitch) {
    return (
      <div className="mx-3 mb-1 flex items-center gap-2 rounded-[6px] border border-convision-border-subtle bg-white px-[10px] py-[7px]">
        <Building2 className="size-3.5 shrink-0 text-convision-text-muted" />
        <span className="truncate text-[11px] font-medium text-convision-text-secondary leading-none">
          {branchName}
        </span>
      </div>
    );
  }

  return (
    <div className="mx-3 mb-1 space-y-2 rounded-[6px] border border-convision-border-subtle bg-white px-[10px] py-[8px]">
      <div className="flex items-center gap-2">
        <Building2 className="size-3.5 shrink-0 text-[var(--role-primary)]" />
        <span className="flex-1 truncate text-left text-[11px] font-medium text-convision-text-secondary leading-none">
          {branchName}
        </span>
      </div>
      <Button
        type="button"
        variant="outline"
        className="h-7 w-full justify-center gap-1.5 text-[11px]"
        onClick={() => navigate('/select-branch')}
      >
        <ArrowLeftRight className="h-3.5 w-3.5" />
        Cambiar sede
      </Button>
    </div>
  );
};

export default SidebarBranchSwitcher;
