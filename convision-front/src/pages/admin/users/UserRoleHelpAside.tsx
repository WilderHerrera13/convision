import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { User } from '@/services/userService';

type Mode = 'create' | 'edit';

type Props = {
  mode: Mode;
  role: User['role'];
  displayName?: string;
  email?: string;
  createdAt?: string | null;
  branchAsideSummary?: string;
};

function roleBadgeVariant(role: User['role']) {
  if (role === 'admin') return 'default';
  if (role === 'specialist') return 'secondary';
  return 'outline';
}

function roleBadgeLabel(role: User['role']) {
  if (role === 'admin') return 'Administrador';
  if (role === 'specialist') return 'Especialista';
  return 'Recepcionista';
}

const UserRoleHelpAside: React.FC<Props> = ({
  mode,
  role,
  displayName,
  email,
  createdAt,
  branchAsideSummary,
}) => {
  if (mode === 'create') {
    return (
      <div className="flex w-full flex-col gap-4 lg:w-[332px] lg:shrink-0">
        <Card className="overflow-hidden rounded-lg border border-[#ebebee] shadow-sm">
          <CardHeader className="border-b border-[#e5e5e9] px-4 py-3">
            <CardTitle className="text-[13px] font-semibold text-[#0f0f12]">
              <span className="mr-2 text-[10px] text-convision-primary">◆</span>
              Permisos por rol
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-4 text-[12px]">
            <div className="flex gap-2">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-convision-primary" />
              <div>
                <p className="font-semibold text-[#0f0f12]">Administrador</p>
                <p className="text-[11px] text-[#7d7d87]">Acceso total al sistema</p>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#0f8f64]" />
              <div>
                <p className="font-semibold text-[#0f0f12]">Especialista</p>
                <p className="text-[11px] text-[#7d7d87]">Citas, pacientes y laboratorio</p>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#8753ef]" />
              <div>
                <p className="font-semibold text-[#0f0f12]">Recepcionista</p>
                <p className="text-[11px] text-[#7d7d87]">Citas, ventas y cotizaciones</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="rounded-lg border border-blue-200 bg-convision-light p-3.5 text-convision-primary">
          <p className="text-[13px] font-semibold">
            <span className="mr-2 text-[10px]">◆</span>
            Contraseña segura
          </p>
          <p className="mt-2 text-[12px] font-normal leading-snug">
            Mínimo 8 caracteres con letras y números.
          </p>
          <p className="text-[12px] font-normal leading-snug">
            El usuario podrá cambiarla al ingresar.
          </p>
        </div>
      </div>
    );
  }

  const initials =
    displayName
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '—';

  let memberLine = 'Miembro desde: —';
  if (createdAt) {
    try {
      memberLine = `Miembro desde: ${format(parseISO(createdAt), 'MMMM yyyy', { locale: es })}`;
    } catch {
      memberLine = 'Miembro desde: —';
    }
  }

  return (
    <div className="flex w-full flex-col gap-4 lg:w-[332px] lg:shrink-0">
      <Card className="overflow-hidden rounded-lg border border-[#ebebee] shadow-sm">
        <CardHeader className="border-b border-[#e5e5e9] px-4 py-3">
          <CardTitle className="text-[13px] font-semibold text-[#0f0f12]">
            <span className="mr-2 text-[10px] text-convision-primary">◆</span>
            Información de la cuenta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          <div className="flex gap-3">
            <Avatar className="size-10 bg-convision-light">
              <AvatarFallback className="bg-convision-light text-[11px] font-semibold text-convision-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-[#0f0f12]">{displayName}</p>
              <p className="truncate text-[11px] text-[#7d7d87]">{email}</p>
            </div>
          </div>
          <Badge variant={roleBadgeVariant(role)} className="text-[11px]">
            {roleBadgeLabel(role)}
          </Badge>
          <p className="text-[11px] text-[#7d7d87]">{memberLine}</p>
          {branchAsideSummary ? (
            <>
              <p className="text-[11px] font-medium text-[#121215]">Sedes asignadas</p>
              <p className="text-[11px] leading-snug text-[#7d7d87]">{branchAsideSummary}</p>
            </>
          ) : null}
        </CardContent>
      </Card>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-amber-950">
        <p className="text-[13px] font-semibold">
          <span className="mr-2 text-[10px]">◆</span>
          Cuidado al cambiar el rol
        </p>
        <p className="mt-2 text-[12px] leading-snug">
          El cambio aplica de inmediato y puede afectar el acceso del usuario al sistema.
        </p>
        <p className="text-[12px] leading-snug">No requiere cerrar sesión.</p>
      </div>
    </div>
  );
};

export default UserRoleHelpAside;
