import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { superAdminService } from '@/services/superAdmin';
import type { OpticaAdmin } from '@/types/optica';

interface Props {
  opticaId: number;
  opticaName: string;
}

interface AddAdminForm {
  name: string;
  last_name: string;
  email: string;
  password: string;
}

const EMPTY_FORM: AddAdminForm = { name: '', last_name: '', email: '', password: '' };

function getInitials(name: string, lastName: string) {
  const parts = [name, lastName].filter(Boolean);
  return parts.map((p) => p[0] ?? '').join('').toUpperCase().slice(0, 2);
}

const OpticaAdminsTab: React.FC<Props> = ({ opticaId, opticaName }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddAdminForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['super-admin-optica-admins', opticaId],
    queryFn: () => superAdminService.listAdmins(opticaId),
  });

  const admins: OpticaAdmin[] = data?.data ?? [];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password) return;
    setSubmitting(true);
    try {
      await superAdminService.createAdmin(opticaId, {
        name: form.name.trim(),
        last_name: form.last_name.trim() || undefined,
        email: form.email.trim(),
        password: form.password,
      });
      await queryClient.invalidateQueries({ queryKey: ['super-admin-optica-admins', opticaId] });
      toast({ title: 'Administrador creado', description: `${form.name} fue agregado como administrador de ${opticaName}.` });
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo crear el administrador';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (admin: OpticaAdmin) => {
    setDeletingId(admin.id);
    try {
      await superAdminService.deleteAdmin(opticaId, admin.id);
      await queryClient.invalidateQueries({ queryKey: ['super-admin-optica-admins', opticaId] });
      toast({ title: 'Administrador eliminado', description: `${admin.name} fue eliminado.` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo eliminar el administrador';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <div className="rounded-[8px] border border-[#ebebee] bg-white overflow-hidden">
          <div className="border-b border-[#e5e5e9] px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-semibold text-[#121215]">Administradores</h2>
              <p className="text-[12px] text-[#7d7d87] mt-0.5">Usuarios con rol admin en esta óptica</p>
            </div>
            <Button
              type="button"
              className="h-[34px] min-w-[148px] shrink-0 rounded-[6px] bg-[#3a71f7] px-3 text-[12px] font-semibold text-white hover:bg-[#2558d4]"
              onClick={() => setShowForm((v) => !v)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Agregar Admin
            </Button>
          </div>

          {showForm && (
            <form onSubmit={handleAdd} className="border-b border-[#e5e5e9] bg-[#fafafa] px-6 py-5">
              <p className="text-[12px] font-semibold text-[#121215] mb-3">Nuevo administrador</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-[#7d7d87]">Nombre *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Nombre"
                    className="h-[34px] rounded-[6px] border border-[#e0e0e4] bg-white px-3 text-[12px] text-[#121215] placeholder-[#b4b5bc] focus:outline-none focus:ring-2 focus:ring-[#3a71f7]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-[#7d7d87]">Apellido</label>
                  <input
                    value={form.last_name}
                    onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                    placeholder="Apellido"
                    className="h-[34px] rounded-[6px] border border-[#e0e0e4] bg-white px-3 text-[12px] text-[#121215] placeholder-[#b4b5bc] focus:outline-none focus:ring-2 focus:ring-[#3a71f7]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-[#7d7d87]">Correo electrónico *</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="admin@ejemplo.com"
                    className="h-[34px] rounded-[6px] border border-[#e0e0e4] bg-white px-3 text-[12px] text-[#121215] placeholder-[#b4b5bc] focus:outline-none focus:ring-2 focus:ring-[#3a71f7]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-[#7d7d87]">Contraseña *</label>
                  <input
                    required
                    type="password"
                    minLength={6}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Mínimo 6 caracteres"
                    className="h-[34px] rounded-[6px] border border-[#e0e0e4] bg-white px-3 text-[12px] text-[#121215] placeholder-[#b4b5bc] focus:outline-none focus:ring-2 focus:ring-[#3a71f7]"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-[32px] rounded-[6px] bg-[#3a71f7] px-4 text-[12px] font-semibold text-white hover:bg-[#2558d4]"
                >
                  {submitting ? 'Guardando...' : 'Crear administrador'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-[32px] rounded-[6px] border-[#e5e5e9] px-4 text-[12px]"
                  onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}

          <div className="divide-y divide-[#f0f0f3]">
            {isLoading ? (
              <div className="py-10 text-center text-sm text-[#7d7d87]">Cargando administradores...</div>
            ) : admins.length === 0 ? (
              <div className="py-10 text-center text-sm text-[#7d7d87]">No hay administradores registrados en esta óptica.</div>
            ) : (
              admins.map((admin) => (
                <div key={admin.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="size-[36px] rounded-full bg-[#eff1ff] flex items-center justify-center shrink-0">
                    <span className="text-[11px] font-semibold text-[#3a71f7]">
                      {getInitials(admin.name, admin.last_name)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#121215] leading-none">
                      {admin.name}{admin.last_name ? ` ${admin.last_name}` : ''}
                    </p>
                    <p className="text-[11px] text-[#7d7d87] mt-0.5 leading-none">{admin.email}</p>
                  </div>
                  <span className="h-[22px] px-2.5 rounded-full bg-[#eff1ff] text-[11px] font-semibold text-[#3a71f7] flex items-center">
                    Admin
                  </span>
                  <button
                    type="button"
                    disabled={deletingId === admin.id}
                    onClick={() => handleDelete(admin)}
                    className="p-1.5 rounded-[4px] text-[#7d7d87] hover:bg-[#fff0f0] hover:text-[#dc2626] transition-colors disabled:opacity-40"
                    aria-label="Eliminar administrador"
                  >
                    <Trash2 className="size-[14px]" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-[#e5e5e9] bg-[#fafafa] px-6 py-3">
            <p className="text-[11px] text-[#7d7d87]">
              {admins.length} administrador{admins.length !== 1 ? 'es' : ''} · Los cambios aplican en el próximo inicio de sesión del usuario.
            </p>
          </div>
        </div>
      </div>

      <div className="w-[280px] shrink-0">
        <div className="rounded-[8px] border border-[#3a71f7] bg-[#eff1ff] p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[#3a71f7] text-[10px]">◆</span>
            <span className="text-[13px] font-semibold text-[#3a71f7]">Acceso de administradores</span>
          </div>
          <p className="text-[12px] text-[#3a71f7] leading-relaxed">
            Los administradores tienen acceso completo a la clínica. Sus credenciales les permiten iniciar sesión en el subdominio de la óptica.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OpticaAdminsTab;
