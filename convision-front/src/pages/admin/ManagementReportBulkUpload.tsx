import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import PageLayout from '@/components/layouts/PageLayout';
import { Button } from '@/components/ui/button';

const MAP_CHIPS = [
  { col: 'FechaConsulta',    label: 'Fecha Consulta'       },
  { col: 'Documento',        label: 'Documento Paciente'   },
  { col: 'Cliente',          label: 'Nombre Paciente'      },
  { col: 'celular',          label: 'Telefono'             },
  { col: 'correo',           label: 'Correo'               },
  { col: 'fechaNacimiento',  label: 'Fecha Nacimiento'     },
  { col: 'Sede',             label: 'ID Sede'              },
  { col: 'Idusuario',        label: 'ID Especialista'      },
  { col: 'Usuario',          label: 'Nombre Especialista'  },
  { col: 'CreadoPor',        label: 'ID Recepcionista'     },
  { col: 'CreadoPorNombre',  label: 'Nombre Recepcionista' },
];

const ASIDE_ITEMS = [
  {
    title: 'Columnas requeridas',
    body: '11 columnas — FechaConsulta, Documento, Cliente, celular, correo, fechaNacimiento, Sede, Idusuario, Usuario, CreadoPor, CreadoPorNombre',
  },
  { title: 'Formato de fechas', body: 'DD/MM/YYYY — ej. 01/04/2026' },
  {
    title: 'Identificacion Sede',
    body: 'Columna "Sede" debe contener el ID numérico de la sede (1, 2, 4, 5...)',
  },
  {
    title: 'Duplicados',
    body: 'El sistema omite registros ya existentes por Documento + FechaConsulta',
  },
];

const ManagementReportBulkUpload: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.name.match(/\.(xlsx|xls)$/i)) {
      toast({
        title: 'Formato no válido',
        description: 'Solo se aceptan archivos .xlsx o .xls',
        variant: 'destructive',
      });
      return;
    }
    setFile(f);
  }, [toast]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleProcessar = () => {
    if (!file) {
      toast({
        title: 'Sin archivo',
        description: 'Selecciona un archivo Excel primero',
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: 'Función pendiente',
      description: 'La carga masiva Excel está pendiente de implementación en el servidor.',
    });
  };

  return (
    <PageLayout
      title="Carga Masiva de Pacientes"
      subtitle="Informe de Gestión"
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-[13px] h-9"
            onClick={() => navigate('/admin/specialist-reports')}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            className="bg-[#3a71f7] hover:bg-[#2d5fd6] text-white text-[13px] h-9"
            onClick={handleProcessar}
          >
            Procesar Carga
          </Button>
        </div>
      }
    >
      <div className="flex gap-6">
        {/* Form card */}
        <div className="bg-white border border-[#ebebee] rounded-[8px] flex-1 min-w-0 overflow-hidden">
          {/* Tab bar */}
          <div className="bg-[#fafafb] border-b border-[#e5e5e9] flex h-[48px]">
            {(['upload', 'history'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative px-6 text-[13px] h-full ${
                  activeTab === tab ? 'font-semibold text-[#3a71f7]' : 'font-normal text-[#7d7d87]'
                }`}
              >
                {tab === 'upload' ? 'Cargar Archivo' : 'Historial de Cargas'}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#3a71f7]" />
                )}
              </button>
            ))}
          </div>

          {activeTab === 'upload' && (
            <div className="px-8 py-6 flex flex-col gap-6">
              {/* Upload section */}
              <div>
                <p className="text-[13px] font-semibold text-[#0f0f12]">Archivo Excel</p>
                <div className="h-px bg-[#f0f0f2] mt-3 mb-4" />

                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                  onClick={() => inputRef.current?.click()}
                  className={`border-[1.5px] border-dashed rounded-[8px] h-[176px] flex flex-col items-center justify-center cursor-pointer transition-colors ${
                    isDragging ? 'border-[#3a71f7] bg-[#f0f4ff]' : 'border-[#3a71f7] bg-[#f8f9ff]'
                  }`}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  />
                  <div className="bg-[#eff1ff] size-12 rounded-[8px] flex items-center justify-center mb-3">
                    <span className="text-[11px] font-semibold text-[#3a71f7]">XLS</span>
                  </div>
                  <p className="text-[13px] font-semibold text-[#0f0f12] text-center">
                    Arrastra tu archivo Excel aquí o haz clic para seleccionar
                  </p>
                  <p className="text-[12px] text-[#7d7d87] mt-1">
                    Formatos aceptados: .xlsx, .xls — Peso máximo: 10 MB
                  </p>
                  <p className="text-[12px] text-[#3a71f7] mt-0.5">o seleccionar archivo</p>
                </div>

                {/* File info row */}
                {file && (
                  <div className="bg-[#f8f9ff] border border-[#e0e0e4] rounded-[6px] h-[52px] flex items-center px-3 mt-3">
                    <div className="bg-[#eff1ff] rounded-[4px] size-9 flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-semibold text-[#3a71f7]">XLS</span>
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#0f0f12] leading-none truncate">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-[#7d7d87] mt-0.5">
                        {(file.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="size-6 flex items-center justify-center text-[#7d7d87] hover:text-[#b82626] text-[11px] font-semibold"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Mapping section */}
              <div>
                <p className="text-[13px] font-semibold text-[#0f0f12]">Configuración de Mapeo</p>
                <div className="h-px bg-[#f0f0f2] mt-3 mb-3" />
                <p className="text-[12px] text-[#7d7d87] mb-4">
                  El sistema detectará automáticamente las columnas del archivo. Verifica el mapeo
                  antes de procesar.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {MAP_CHIPS.map((chip) => (
                    <div
                      key={chip.col}
                      className="bg-[#f9f9fb] border border-[#e0e0e4] rounded-[6px] px-3 py-2 relative"
                    >
                      <div className="absolute right-2.5 top-2 size-1.5 bg-[#228b52] rounded-full" />
                      <p className="text-[10px] font-medium text-[#7d7d87] pr-3">{chip.col}</p>
                      <p className="text-[12px] font-semibold text-[#0f0f12]">{chip.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="px-8 py-12 text-center">
              <p className="text-[13px] text-[#7d7d87]">No hay historial de cargas disponible.</p>
            </div>
          )}
        </div>

        {/* Aside panel */}
        <div className="w-[372px] shrink-0 flex flex-col gap-4">
          {/* Estructura esperada card */}
          <div className="bg-white border border-[#ebebee] rounded-[8px] overflow-hidden">
            <div className="border-b border-[#ebebee] h-[52px] flex items-center px-5 gap-2">
              <span className="text-[10px] text-[#3a71f7]">◆</span>
              <p className="text-[13px] font-semibold text-[#0f0f12]">Estructura esperada</p>
            </div>
            <div className="px-5 py-4 flex flex-col gap-4">
              {ASIDE_ITEMS.map((item) => (
                <div key={item.title} className="flex gap-3">
                  <div className="size-1.5 bg-[#3a71f7] rounded-full mt-1.5 shrink-0" />
                  <div>
                    <p className="text-[12px] font-semibold text-[#0f0f12]">{item.title}</p>
                    <p className="text-[11px] text-[#7d7d87] mt-0.5 leading-relaxed">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tip card */}
          <div className="bg-[#eff1ff] border border-[#3a71f7] rounded-[8px] px-4 py-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-[#3a71f7]">◆</span>
              <p className="text-[13px] font-semibold text-[#3a71f7]">Impacto de la carga</p>
            </div>
            <p className="text-[12px] text-[#3a71f7] leading-relaxed">
              Los registros cargados se vinculan automáticamente a la Sede y al Especialista
              indicados. Los pacientes nuevos se crearán en el módulo de Pacientes. Los médicos
              deben existir previamente en el sistema.
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default ManagementReportBulkUpload;
