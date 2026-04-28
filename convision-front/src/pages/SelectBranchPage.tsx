import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import SearchableCombobox, { ComboboxOption } from '@/components/ui/SearchableCombobox';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import { BranchInfo } from '@/services/auth';

const BRANCH_CARDS_THRESHOLD = 6;

const SelectBranchPage: React.FC = () => {
  const { branches, user } = useAuth();
  const { setBranch } = useBranch();
  const navigate = useNavigate();

  const getRoleDashboard = () => {
    if (user?.role === 'admin') return '/admin/dashboard';
    if (user?.role === 'specialist') return '/specialist/dashboard';
    return '/receptionist/dashboard';
  };

  const handleSelect = (branch: BranchInfo) => {
    setBranch(branch.id, branch.name);
    navigate(getRoleDashboard());
  };

  const handleComboboxSelect = (value: string) => {
    const selected = branches.find((b) => String(b.id) === value);
    if (selected) handleSelect(selected);
  };

  const branchOptions: ComboboxOption[] = branches.map((b) => ({
    value: String(b.id),
    label: b.city ? `${b.name} — ${b.city}` : b.name,
  }));

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-3">
            <Building2 className="h-8 w-8 text-[#8753ef]" />
          </div>
          <h1 className="text-2xl font-semibold text-[#121215]">Selecciona tu sede</h1>
          <p className="text-sm text-[#b4b5bc] mt-1">
            Elige la sede en la que trabajarás durante esta sesión.
          </p>
        </div>

        {branches.length === 0 && (
          <EmptyState
            leadingIcon={Building2}
            accentColor="#8753ef"
            title="Sin sedes asignadas"
            description="No tienes sedes asignadas. Contacta al administrador."
          />
        )}

        {branches.length > BRANCH_CARDS_THRESHOLD && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <p className="text-sm text-[#b4b5bc] mb-3">Busca y selecciona una sede</p>
            <SearchableCombobox
              options={branchOptions}
              value=""
              onChange={handleComboboxSelect}
              placeholder="Seleccione una sede..."
              searchPlaceholder="Buscar sede..."
            />
          </div>
        )}

        {branches.length > 0 && branches.length <= BRANCH_CARDS_THRESHOLD && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {branches.map((branch) => (
              <Card
                key={branch.id}
                className="cursor-pointer hover:shadow-md transition-shadow border border-[#e0e0e5]"
                onClick={() => handleSelect(branch)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base font-semibold text-[#121215]">
                      {branch.name}
                    </CardTitle>
                    {branch.is_primary && (
                      <Badge className="bg-[#8753ef] text-white text-xs">Principal</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {branch.city && (
                    <p className="text-sm text-[#b4b5bc] mb-3">{branch.city}</p>
                  )}
                  <Button
                    size="sm"
                    className="w-full bg-[#8753ef] hover:bg-[#6a3cc4] text-white"
                    onClick={(e) => { e.stopPropagation(); handleSelect(branch); }}
                  >
                    Seleccionar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectBranchPage;
