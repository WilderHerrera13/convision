import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import logoBrand from '@/assets/logo-brand.svg';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  specialist: 'Especialista',
  receptionist: 'Recepcionista',
};

const ROLE_ACCENT: Record<string, { primary: string; light: string; borderLight: string }> = {
  admin: { primary: '#195fa5', light: '#e6effa', borderLight: '#c5d8f0' },
  specialist: { primary: '#0f8f64', light: '#e5f6ef', borderLight: '#c4ecda' },
  receptionist: { primary: '#8753ef', light: '#f1edff', borderLight: '#ddd5ff' },
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getLastUsedBranchId(): number | null {
  try {
    const raw = localStorage.getItem('convision_branch_id');
    if (raw) return parseInt(raw, 10);
  } catch { /* ignore */ }
  return null;
}

const SelectBranchPage: React.FC = () => {
  const { branches, user, logout } = useAuth();
  const { setBranch } = useBranch();
  const navigate = useNavigate();

  const roleAccent = ROLE_ACCENT[user?.role ?? ''] ?? ROLE_ACCENT.receptionist;
  const lastUsedId = getLastUsedBranchId();

  const [selectedId, setSelectedId] = useState<number | null>(() => {
    if (branches.length === 1) return branches[0].id;
    const remembered = branches.find((b) => b.id === lastUsedId);
    return remembered ? remembered.id : null;
  });

  const selectedBranch = useMemo(
    () => {
      if (selectedId === 0) return { id: 0, name: 'Todas las sedes', city: '' };
      return branches.find((b) => b.id === selectedId) ?? null;
    },
    [branches, selectedId],
  );

  const sortedBranches = useMemo(() => {
    const other = branches.filter((b) => b.id !== lastUsedId);
    const remembered = branches.find((b) => b.id === lastUsedId);
    return remembered ? [remembered, ...other] : branches;
  }, [branches, lastUsedId]);

  const handleSelect = (id: number) => {
    setSelectedId(id);
  };

  const handleContinue = () => {
    if (!selectedBranch) return;
    setBranch(selectedBranch.id, selectedBranch.name);
    if (user?.role === 'admin') {
      navigate('/admin/dashboard');
    } else if (user?.role === 'specialist') {
      navigate('/specialist/dashboard');
    } else if (user?.role === 'receptionist') {
      navigate('/receptionist/dashboard');
    } else {
      navigate('/profile');
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen w-full bg-[#F5F5F6]">
      <div className="flex min-h-screen w-full">
        {/* Left brand panel — matches Login.tsx */}
        <div className="relative hidden h-screen w-[680px] flex-shrink-0 overflow-hidden bg-gradient-to-b from-[#363F80] to-[#566EDD] md:block">
          <div className="absolute -left-20 -top-20 h-[300px] w-[300px] rounded-full bg-white/5" />
          <div className="absolute bottom-5 right-[-20px] h-[200px] w-[200px] rounded-full bg-white/5" />
          <div className="flex h-full w-full flex-col items-center pt-[200px] text-center text-white">
            <img src={logoBrand} alt="Logo Óptica Convisión" className="h-[220px] w-[220px]" />
            <p className="mt-[14px] text-[38px] font-bold leading-[1.21]">ÓPTICA</p>
            <p className="text-[38px] font-bold leading-[1.21]">CONVISIÓN</p>
            <p className="mt-1 text-[18px] leading-[1.21] text-white/70">Villavicencio</p>
            <p className="mt-[50px] text-[15px] leading-[1.21] text-white/55">El sistema de gestión para tu óptica</p>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-1 flex-col items-center overflow-y-auto bg-white px-4 pt-6 md:pt-0 md:justify-center">
          <div className="w-full max-w-[440px] py-8 md:py-0">
            {/* User greeting */}
            <div className="flex items-center gap-3 mb-6">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-white flex-shrink-0"
                style={{ backgroundColor: roleAccent.primary }}
              >
                {user?.name ? getInitials(user.name) : '??'}
              </div>
              <div className="flex flex-col min-w-0">
                <p className="text-[14px] font-semibold text-[#121215] truncate">
                  {user?.name ?? 'Usuario'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold"
                    style={{
                      backgroundColor: roleAccent.light,
                      color: roleAccent.primary,
                    }}
                  >
                    {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Title + description */}
            <h1 className="text-[18px] font-bold text-[#121215] mb-2">
              Selecciona tu sede de trabajo
            </h1>
            <p className="text-[12px] text-[#7d7d87] leading-[18px] mb-6">
              Elige la sede desde donde atenderás hoy. Puedes cambiarla
              <br />
              en cualquier momento desde el menú lateral.
            </p>

            {sortedBranches.length === 0 && (
              <div className="rounded-lg border border-[#e5e5e9] bg-[#f9f9fa] px-4 py-8 text-center mb-6">
                <Building2 className="mx-auto h-8 w-8 text-[#b4b5bc] mb-3" />
                <p className="text-[13px] font-semibold text-[#121215] mb-1">Sin sedes asignadas</p>
                <p className="text-[12px] text-[#7d7d87]">No tienes sedes asignadas. Contacta al administrador.</p>
              </div>
            )}

            {sortedBranches.length > 0 && (
              <>
                {/* Última sede usada label */}
                <p className="text-[10px] font-semibold text-[#7d7d87] tracking-[0.8px] mb-2">
                  {user?.role === 'admin' ? 'SELECCIONA UNA SEDE' : 'ÚLTIMA SEDE USADA'}
                </p>

                {/* Branch cards */}
                <div className="flex flex-col gap-3 mb-6">
                  {user?.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => handleSelect(0)}
                      className={`relative flex items-center gap-3 w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                        selectedId === 0
                          ? 'border-2'
                          : 'border hover:border-[#c8c8d0]'
                      }`}
                      style={
                        selectedId === 0
                          ? {
                              borderColor: roleAccent.primary,
                              backgroundColor: roleAccent.light,
                            }
                          : {
                              borderColor: '#e5e5e9',
                              backgroundColor: '#ffffff',
                            }
                      }
                    >
                      <div
                        className="flex h-[18px] w-[18px] items-center justify-center rounded-full flex-shrink-0"
                        style={{ backgroundColor: selectedId === 0 ? roleAccent.primary : '#e5e5e9' }}
                      >
                        {selectedId === 0 && (
                          <div className="h-[7px] w-[7px] rounded-full bg-white" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span
                          className="text-[13px] font-semibold truncate"
                          style={{ color: '#121215' }}
                        >
                          Todas las sedes
                        </span>
                        <span className="text-[11px] text-[#7d7d87] truncate mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Tienes control sobre todas las sedes
                        </span>
                      </div>
                    </button>
                  )}
                  {sortedBranches.map((branch) => {
                const isSelected = selectedId === branch.id;
                const isLastUsed = branch.id === lastUsedId;
                const isActiveCard = isSelected || (isLastUsed && selectedId === null);

                return (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => handleSelect(branch.id)}
                    className={`relative flex items-center gap-3 w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                      isActiveCard
                        ? 'border-2'
                        : 'border hover:border-[#c8c8d0]'
                    }`}
                    style={
                      isActiveCard
                        ? {
                            borderColor: roleAccent.primary,
                            backgroundColor: roleAccent.light,
                          }
                        : {
                            borderColor: '#e5e5e9',
                            backgroundColor: '#ffffff',
                          }
                    }
                  >
                    <div
                      className="flex h-[18px] w-[18px] items-center justify-center rounded-full flex-shrink-0"
                      style={{ backgroundColor: isActiveCard ? roleAccent.primary : '#e5e5e9' }}
                    >
                      {isActiveCard && (
                        <div className="h-[7px] w-[7px] rounded-full bg-white" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span
                        className="text-[13px] font-semibold truncate"
                        style={{ color: isActiveCard ? '#121215' : '#121215' }}
                      >
                        {branch.name}
                      </span>
                      {branch.city && (
                        <span className="text-[11px] text-[#7d7d87] truncate mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {branch.city}
                        </span>
                      )}
                    </div>
                    {isSelected && isLastUsed && (
                      <span
                        className="inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold flex-shrink-0"
                        style={{
                          backgroundColor: roleAccent.light,
                          color: roleAccent.primary,
                          border: `1px solid ${roleAccent.primary}`,
                        }}
                      >
                        Recordada
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
              </>
            )}

            {/* Continue button */}
            <Button
              onClick={handleContinue}
              disabled={!selectedBranch}
              className="h-10 w-full rounded-[6px] text-[13px] font-semibold text-white"
              style={{
                backgroundColor: roleAccent.primary,
              }}
              onMouseEnter={(e) => {
                const dark = roleAccent.primary === '#0f8f64' ? '#0a6e4d' : '#6a3cc4';
                (e.currentTarget as HTMLElement).style.backgroundColor = dark;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = roleAccent.primary;
              }}
            >
              {selectedBranch
                ? `Continuar a ${selectedBranch.name}`
                : 'Selecciona una sede'}
            </Button>

            {/* Logout link */}
            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 w-full text-center text-[12px] font-medium text-[#7d7d87] hover:text-[#121215] transition-colors"
            >
              No soy {user?.name?.split(' ')[0] ?? 'usuario'} · Cerrar sesión
            </button>

            {/* Mobile brand footnote */}
            <div className="mt-8 text-center md:hidden">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Building2 className="h-4 w-4 text-[#566EDD]" />
                <span className="text-[13px] font-bold text-[#363F80]">ÓPTICA CONVISIÓN</span>
              </div>
              <p className="text-[12px] text-[#b4b5bc]">El sistema de gestión para tu óptica</p>
            </div>

            {/* Footer */}
            <p className="mt-6 text-center text-[11px] text-[#b4b5bc] hidden md:block">
              © 2026 Óptica Convisión — Villavicencio
            </p>
          </div>

          {/* Footer for mobile */}
          <div className="mt-auto pb-7 text-center text-[11px] text-[#b4b5bc] md:hidden">
            © 2026 Óptica Convisión — Villavicencio
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectBranchPage;
