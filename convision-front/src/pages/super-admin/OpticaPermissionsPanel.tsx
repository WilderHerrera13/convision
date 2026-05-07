import React, { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { opticaPermissionsService } from '@/services/opticaPermissions';
import type { Permission } from '@/services/roles';

interface Props {
  opticaId: number;
}

const OpticaPermissionsPanel: React.FC<Props> = ({ opticaId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: allPerms = [], isLoading: loadingPerms } = useQuery<Permission[]>({
    queryKey: ['super-admin-all-permissions'],
    queryFn: opticaPermissionsService.getAllPermissions,
    staleTime: 5 * 60 * 1000,
  });

  const { data: opticaPerms, isLoading: loadingOpticaPerms } = useQuery({
    queryKey: ['super-admin-optica-permissions', opticaId],
    queryFn: () => opticaPermissionsService.getOpticaPermissions(opticaId),
    enabled: Number.isFinite(opticaId),
  });

  const allPermKeys = useMemo(() => allPerms.map(p => `${p.module}:${p.action}`), [allPerms]);

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (opticaPerms === undefined || allPermKeys.length === 0) return;
    const keys = opticaPerms.permission_keys.length === 0 ? allPermKeys : opticaPerms.permission_keys;
    setSelectedKeys(new Set(keys));
  }, [opticaPerms, allPermKeys]);

  const moduleMap = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of allPerms) {
      const list = map.get(p.module) ?? [];
      list.push(p);
      map.set(p.module, list);
    }
    return map;
  }, [allPerms]);

  const saveMutation = useMutation({
    mutationFn: (keys: string[]) => opticaPermissionsService.updateOpticaPermissions(opticaId, keys),
    onSuccess: () => {
      toast({ title: 'Permisos actualizados', description: 'Los permisos de la óptica se han guardado.' });
      queryClient.invalidateQueries({ queryKey: ['super-admin-optica-permissions', opticaId] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudieron guardar los permisos.', variant: 'destructive' });
    },
  });

  const toggleKey = (key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const selectAllModule = (module: string) => {
    const perms = moduleMap.get(module) ?? [];
    setSelectedKeys(prev => {
      const next = new Set(prev);
      perms.forEach(p => next.add(`${p.module}:${p.action}`));
      return next;
    });
  };

  const clearModule = (module: string) => {
    const perms = moduleMap.get(module) ?? [];
    setSelectedKeys(prev => {
      const next = new Set(prev);
      perms.forEach(p => next.delete(`${p.module}:${p.action}`));
      return next;
    });
  };

  const handleSave = () => {
    const keys = selectedKeys.size === allPermKeys.length ? [] : [...selectedKeys];
    saveMutation.mutate(keys);
  };

  if (loadingPerms || loadingOpticaPerms) {
    return <div className="py-8 text-center text-sm text-[#7d7d87]">Cargando permisos...</div>;
  }

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <div className="rounded-[8px] border border-[#ebebee] bg-white overflow-hidden">
          <div className="border-b border-[#e5e5e9] px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-semibold text-[#121215]">Matriz de permisos</h2>
              <p className="text-[12px] text-[#7d7d87] mt-0.5">
                Define qué acciones puede realizar el administrador de esta óptica. Sin restricciones = todos los permisos activos.
              </p>
            </div>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              size="sm"
              className="h-[34px] shrink-0 rounded-[6px] bg-[#3a71f7] text-[12px] font-semibold text-white hover:bg-[#2558d4]"
            >
              {saveMutation.isPending ? 'Guardando...' : 'Guardar permisos'}
            </Button>
          </div>

          <div className="p-6">
            <Accordion type="multiple" className="w-full">
              {[...moduleMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([module, perms]) => {
                const moduleKeys = perms.map(p => `${p.module}:${p.action}`);
                const checkedCount = moduleKeys.filter(k => selectedKeys.has(k)).length;
                return (
                  <AccordionItem key={module} value={module}>
                    <AccordionTrigger className="text-[13px] font-medium capitalize hover:no-underline">
                      <span className="flex-1 text-left capitalize">{module.replace(/_/g, ' ')}</span>
                      <span className="mr-2 text-[11px] text-[#7d7d87]">
                        {checkedCount}/{moduleKeys.length}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="flex gap-2 mb-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-[28px] text-[11px] border-[#e5e5e9]"
                          onClick={() => selectAllModule(module)}
                        >
                          Seleccionar todo
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-[28px] text-[11px] border-[#e5e5e9]"
                          onClick={() => clearModule(module)}
                        >
                          Limpiar
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {perms.map(p => {
                          const key = `${p.module}:${p.action}`;
                          return (
                            <label key={key} className="flex items-center gap-2 cursor-pointer">
                              <Checkbox
                                checked={selectedKeys.has(key)}
                                onCheckedChange={() => toggleKey(key)}
                              />
                              <span className="text-[12px] capitalize text-[#121215]">
                                {p.action.replace(/_/g, ' ')}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        </div>
      </div>

      <div className="w-[280px] shrink-0">
        <div className="rounded-[8px] border border-[#3a71f7] bg-[#eff1ff] p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[#3a71f7] text-[10px]">◆</span>
            <span className="text-[13px] font-semibold text-[#3a71f7]">Sobre los permisos</span>
          </div>
          <p className="text-[12px] text-[#3a71f7] leading-relaxed">
            Los permisos aplican a todos los administradores de esta óptica. Si no hay restricciones configuradas,
            los administradores tienen acceso a todos los módulos habilitados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OpticaPermissionsPanel;
