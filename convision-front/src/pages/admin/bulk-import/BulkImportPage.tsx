import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import PageLayout from '@/components/layouts/PageLayout';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';
import bulkImportService, { BulkImportLogEntry, ImportResult, ImportType, RecordResult } from '@/services/bulkImportService';

// ─── Config por tipo ──────────────────────────────────────────────────────────

interface TypeConfig {
  title: string;
  mapChips: { col: string; label: string }[];
  asideItems: { title: string; body: string }[];
  tipBody: string;
  tableHeaders: string[];
  cancelPath: string;
}

const PATIENTS_CONFIG: TypeConfig = {
  title: 'Carga Masiva de Pacientes',
  mapChips: [
    { col: 'Documento',       label: 'Documento Paciente'  },
    { col: 'Paciente',        label: 'Nombre Paciente'     },
    { col: 'Telefono',        label: 'Teléfono'            },
    { col: 'Correo',          label: 'Correo Electrónico'  },
    { col: 'FechaNacimiento', label: 'Fecha Nacimiento'    },
  ],
  asideItems: [
    { title: 'Columnas requeridas', body: '5 columnas — Documento, Paciente, Telefono, Correo, FechaNacimiento' },
    { title: 'Formato de fechas', body: 'DD/MM/YYYY — ej. 01/04/2026' },
    { title: 'Campo Documento', body: 'Número de identificación del paciente. Se usa para evitar duplicados.' },
    { title: 'Duplicados', body: 'El sistema omite pacientes que ya existan por Documento.' },
  ],
  tipBody: 'Los pacientes nuevos se crearán en el módulo de Pacientes. Los que ya existan (por Documento) serán omitidos sin generar error.',
  tableHeaders: ['FILA', 'DOCUMENTO', 'PACIENTE', 'TELEFONO', 'CORREO', 'ESTADO'],
  cancelPath: '/admin/bulk-import',
};

const DOCTORS_CONFIG: TypeConfig = {
  title: 'Carga Masiva de Especialistas',
  mapChips: [
    { col: 'Documento', label: 'Documento'           },
    { col: 'Nombre',    label: 'Nombre'              },
    { col: 'Apellido',  label: 'Apellido'            },
    { col: 'Correo',    label: 'Correo Electrónico'  },
    { col: 'Telefono',  label: 'Teléfono'            },
  ],
  asideItems: [
    { title: 'Columnas requeridas', body: '5 columnas — Documento, Nombre, Apellido, Correo, Telefono' },
    { title: 'Campo Correo', body: 'El correo es obligatorio — se usará para el acceso al sistema.' },
    { title: 'Contraseña temporal', body: 'Los especialistas importados recibirán una contraseña temporal que deben cambiar al primer acceso.' },
    { title: 'Duplicados', body: 'El sistema omite especialistas que ya existan por Correo.' },
  ],
  tipBody: 'Los especialistas creados tendrán rol "Especialista" y deberán cambiar su contraseña en el primer inicio de sesión.',
  tableHeaders: ['FILA', 'DOCUMENTO', 'NOMBRE', 'APELLIDO', 'CORREO', 'ESTADO'],
  cancelPath: '/admin/bulk-import',
};

// ─── Badge de estado ──────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'created') {
    return (
      <span className="bg-[#ebf5ef] text-[#228b52] text-[11px] font-semibold px-[10px] py-[3px] rounded-full">
        Creado
      </span>
    );
  }
  if (status === 'skipped') {
    return (
      <span className="bg-[#fff6e3] text-[#b57218] text-[11px] font-semibold px-[10px] py-[3px] rounded-full">
        Duplicado
      </span>
    );
  }
  return (
    <span className="bg-[#fef2f2] text-[#b91c1c] text-[11px] font-semibold px-[10px] py-[3px] rounded-full">
      Error
    </span>
  );
};

// ─── Tabla de resultados ──────────────────────────────────────────────────────

const PAGE_SIZE = 10;

interface ResultTableProps {
  records: RecordResult[];
  headers: string[];
  importType: ImportType;
}

const ResultTable: React.FC<ResultTableProps> = ({ records, headers, importType }) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = records.filter((r) => {
    if (!search) return true;
    const vals = Object.values(r.data).join(' ').toLowerCase();
    return vals.includes(search.toLowerCase());
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const dataKeys =
    importType === 'patients' ? ['documento', 'paciente', 'telefono', 'correo']
    : importType === 'scheduled-appointments' ? ['documento', 'cliente', 'fechaconsulta', 'usuario']
    : importType === 'lenses' ? ['codigointerno', 'descripción', 'precio', 'proveedor']
    : ['documento', 'nombre', 'apellido', 'correo'];

  const searchPlaceholder =
    importType === 'patients' ? 'Buscar paciente...'
    : importType === 'scheduled-appointments' ? 'Buscar consulta...'
    : importType === 'lenses' ? 'Buscar lente...'
    : 'Buscar especialista...';

  return (
    <div className="bg-white border border-[#e5e5e9] rounded-[8px] overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 h-[52px] border-b border-[#e5e5e9]">
        <div>
          <p className="text-[14px] font-semibold text-[#121215]">Vista Previa del Archivo</p>
          <p className="text-[11px] text-[#7d7d87]">
            {records.length} registros detectados
          </p>
        </div>
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="border border-[#e5e5e9] rounded-[6px] h-[34px] px-[10px] text-[12px] text-[#0f0f12] placeholder:text-[#b4b5bc] w-[220px] outline-none focus:border-[#3a71f7]"
        />
      </div>

      {/* Column headers */}
      <div className="bg-[#f5f5f6] flex">
        {headers.map((h) => (
          <div key={h} className="flex-1 px-3 h-[36px] flex items-center">
            <span className="text-[11px] font-semibold text-[#7d7d87]">{h}</span>
          </div>
        ))}
      </div>

      {/* Rows */}
      {slice.map((rec) => (
        <div key={rec.row} className="flex border-b border-[#e5e5e9] h-[48px] items-center">
          <div className="flex-1 px-3 text-[13px] text-[#7d7d87]">{rec.row}</div>
          {dataKeys.map((key) => (
            <div key={key} className="flex-1 px-3 text-[13px] text-[#7d7d87] truncate">
              {rec.data[key] ?? '—'}
            </div>
          ))}
          <div className="flex-1 px-3">
            <StatusBadge status={rec.status} />
          </div>
          {rec.reason && (
            <div className="flex-1 px-3 text-[11px] text-[#b91c1c] truncate" title={rec.reason}>
              {rec.reason}
            </div>
          )}
        </div>
      ))}

      {slice.length === 0 && (
        <div className="px-5 py-8 text-center text-[13px] text-[#7d7d87]">
          Sin resultados para la búsqueda.
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between px-5 h-[48px]">
        <div className="flex items-center gap-1.5 text-[12px] text-[#7d7d87]">
          <span>Mostrando</span>
          <span className="bg-[#f5f5f6] text-[#121215] font-semibold px-1.5 py-0.5 rounded-[4px] text-[12px]">
            {filtered.length === 0 ? '0' : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)}`}
          </span>
          <span>de {filtered.length} resultados</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="size-8 border border-[#e5e5e9] rounded-[6px] flex items-center justify-center text-[#7d7d87] disabled:opacity-40"
          >
            ←
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = i + 1;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`size-8 rounded-[6px] flex items-center justify-center text-[12px] ${
                  page === p
                    ? 'bg-[#3a71f7] text-white font-semibold'
                    : 'border border-[#e5e5e9] text-[#7d7d87]'
                }`}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="size-8 border border-[#e5e5e9] rounded-[6px] flex items-center justify-center text-[#121215] disabled:opacity-40"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
};

const LENSES_CONFIG: TypeConfig = {
  title: 'Carga Masiva de Catálogo de Lentes',
  mapChips: [
    { col: 'CodigoInterno',  label: 'Código Interno'   },
    { col: 'Identificador',  label: 'Identificador'    },
    { col: 'TipoLente',      label: 'Tipo de Lente'    },
    { col: 'Marca',          label: 'Marca'            },
    { col: 'Material',       label: 'Material'         },
    { col: 'ClaseLente',     label: 'Clase de Lente'   },
    { col: 'Tratamiento',    label: 'Tratamiento'      },
    { col: 'Fotocromático',  label: 'Fotocromático'    },
    { col: 'Descripción',    label: 'Descripción'      },
    { col: 'Precio',         label: 'Precio'           },
    { col: 'Costo',          label: 'Costo'            },
    { col: 'Proveedor',      label: 'Proveedor'        },
  ],
  asideItems: [
    { title: 'Columnas requeridas', body: 'CodigoInterno y Precio son obligatorios. Las demás son opcionales.' },
    { title: 'Catálogo central', body: 'Los lentes se agregan al catálogo global. No están atados a ninguna sede.' },
    { title: 'Atributos automáticos', body: 'TipoLente, Marca, Material, ClaseLente, Tratamiento y Fotocromático se crean automáticamente si no existen en el catálogo.' },
    { title: 'Proveedor', body: 'Si el proveedor no existe en el sistema, el lente se crea sin proveedor asignado.' },
    { title: 'Duplicados', body: 'El sistema omite lentes que ya existan por CodigoInterno.' },
  ],
  tipBody: 'Los lentes nuevos quedarán habilitados en el catálogo central con estado "enabled". Los que ya existan (por CodigoInterno) serán omitidos sin generar error.',
  tableHeaders: ['FILA', 'CÓDIGO', 'DESCRIPCIÓN', 'PRECIO', 'PROVEEDOR', 'ESTADO'],
  cancelPath: '/admin/bulk-import',
};

const SCHEDULED_APPOINTMENTS_CONFIG: TypeConfig = {
  title: 'Carga Masiva de Consultas Agendadas',
  mapChips: [
    { col: 'FechaConsulta',   label: 'Fecha Consulta'       },
    { col: 'Documento',       label: 'Documento Paciente'   },
    { col: 'Cliente',         label: 'Nombre Paciente'      },
    { col: 'celular',         label: 'Teléfono'             },
    { col: 'correo',          label: 'Correo'               },
    { col: 'fechaNacimiento', label: 'Fecha Nacimiento'     },
    { col: 'Sede',            label: 'ID Sede'              },
    { col: 'Idusuario',       label: 'ID Especialista'      },
    { col: 'Usuario',         label: 'Nombre Especialista'  },
    { col: 'CreadoPor',       label: 'ID Recepcionista'     },
    { col: 'CreadoPorNombre', label: 'Nombre Recepcionista' },
  ],
  asideItems: [
    { title: 'Columnas requeridas', body: '11 columnas — FechaConsulta, Documento, Cliente, celular, correo, fechaNacimiento, Sede, Idusuario, Usuario, CreadoPor, CreadoPorNombre' },
    { title: 'Formato de fechas', body: 'DD/MM/YYYY — ej. 01/04/2026' },
    { title: 'Paciente', body: 'Se busca por Documento. Si no existe, se crea automáticamente con los datos de la fila.' },
    { title: 'Especialista', body: 'Se busca por Idusuario (ID en el sistema). Si no se encuentra, la consulta se crea sin especialista asignado.' },
    { title: 'Duplicados', body: 'Cada fila crea una consulta nueva. Revisar el resultado antes de procesar el mismo archivo dos veces.' },
  ],
  tipBody: 'Este importador crea consultas completadas (status: completado) vinculadas al paciente y especialista. Los pacientes nuevos se registran automáticamente en el módulo de Pacientes.',
  tableHeaders: ['FILA', 'DOCUMENTO', 'PACIENTE', 'FECHA CONSULTA', 'ESPECIALISTA', 'ESTADO'],
  cancelPath: '/admin/bulk-import',
};

// ─── Página principal ─────────────────────────────────────────────────────────

const BulkImportPage: React.FC = () => {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const importType: ImportType =
    type === 'doctors' ? 'doctors'
    : type === 'scheduled-appointments' ? 'scheduled-appointments'
    : type === 'lenses' ? 'lenses'
    : 'patients';

  const config =
    importType === 'doctors' ? DOCTORS_CONFIG
    : importType === 'scheduled-appointments' ? SCHEDULED_APPOINTMENTS_CONFIG
    : importType === 'lenses' ? LENSES_CONFIG
    : PATIENTS_CONFIG;

  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [detectedCols, setDetectedCols] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<BulkImportLogEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await bulkImportService.getHistory(importType);
      setHistory(res.data ?? []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [importType]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const parseHeaders = useCallback((f: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
        const headers = (rows[0] ?? []).map((h) => String(h).trim().toLowerCase());
        setDetectedCols(new Set(headers));
      } catch {
        setDetectedCols(new Set());
      }
    };
    reader.readAsArrayBuffer(f);
  }, []);

  const handleFile = useCallback((f: File) => {
    if (!f.name.match(/\.(xlsx|xls)$/i)) {
      toast({ title: 'Formato no válido', description: 'Solo se aceptan archivos .xlsx o .xls', variant: 'destructive' });
      return;
    }
    setFile(f);
    setResult(null);
    setDetectedCols(new Set());
    parseHeaders(f);
  }, [toast, parseHeaders]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleProcess = async () => {
    if (!file) {
      toast({ title: 'Sin archivo', description: 'Selecciona un archivo Excel primero', variant: 'destructive' });
      return;
    }
    setIsProcessing(true);
    try {
      const res =
        importType === 'doctors' ? await bulkImportService.uploadDoctors(file)
        : importType === 'scheduled-appointments' ? await bulkImportService.uploadScheduledAppointments(file)
        : importType === 'lenses' ? await bulkImportService.uploadLenses(file)
        : await bulkImportService.uploadPatients(file);
      setResult(res);
      await fetchHistory();
      toast({
        title: 'Carga completada',
        description: `${res.created} creados · ${res.skipped} duplicados · ${res.errors} errores`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado';
      toast({ title: 'Error en la carga', description: msg, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <PageLayout
      title={config.title}
      subtitle="Carga Masiva"
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-[13px] h-9"
            onClick={() => navigate(config.cancelPath)}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            className="bg-[#3a71f7] hover:bg-[#2d5fd6] text-white text-[13px] h-9"
            onClick={handleProcess}
            disabled={isProcessing || !file}
          >
            {isProcessing ? 'Procesando...' : 'Procesar Carga'}
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
              {/* Upload zone */}
              <div>
                <p className="text-[13px] font-semibold text-[#0f0f12]">Archivo Excel</p>
                <div className="h-px bg-[#f0f0f2] mt-3 mb-4" />

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

                {file && (
                  <div className="bg-[#f8f9ff] border border-[#e0e0e4] rounded-[6px] h-[52px] flex items-center px-3 mt-3">
                    <div className="bg-[#eff1ff] rounded-[4px] size-9 flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-semibold text-[#3a71f7]">XLS</span>
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#0f0f12] leading-none truncate">{file.name}</p>
                      <p className="text-[11px] text-[#7d7d87] mt-0.5">{(file.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); setDetectedCols(new Set()); }}
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
                  El sistema detectará automáticamente las columnas del archivo. Verifica el mapeo antes de procesar.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {config.mapChips.map((chip) => {
                    const found = file
                      ? detectedCols.has(chip.col.toLowerCase())
                      : null;
                    return (
                      <div key={chip.col} className="bg-[#f9f9fb] border border-[#e0e0e4] rounded-[6px] px-3 py-2 relative">
                        <div
                          className={`absolute right-2.5 top-2 size-1.5 rounded-full ${
                            found === null ? 'bg-[#b4b5bc]'
                            : found ? 'bg-[#228b52]'
                            : 'bg-[#b82626]'
                          }`}
                        />
                        <p className="text-[10px] font-medium text-[#7d7d87] pr-3">{chip.col}</p>
                        <p className="text-[12px] font-semibold text-[#0f0f12]">{chip.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resumen tras procesar */}
              {result && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#ebf5ef] border border-[#228b52] rounded-[8px] px-4 py-3">
                    <p className="text-[11px] font-semibold text-[#228b52]">Creados</p>
                    <p className="text-[22px] font-semibold text-[#228b52]">{result.created}</p>
                  </div>
                  <div className="bg-[#fff6e3] border border-[#b57218] rounded-[8px] px-4 py-3">
                    <p className="text-[11px] font-semibold text-[#b57218]">Duplicados</p>
                    <p className="text-[22px] font-semibold text-[#b57218]">{result.skipped}</p>
                  </div>
                  <div className="bg-[#fef2f2] border border-[#b91c1c] rounded-[8px] px-4 py-3">
                    <p className="text-[11px] font-semibold text-[#b91c1c]">Errores</p>
                    <p className="text-[22px] font-semibold text-[#b91c1c]">{result.errors}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="flex flex-col">
              <div className="bg-[#f5f5f6] flex border-b border-[#e5e5e9]">
                {['ARCHIVO', 'FECHA', 'TOTAL', 'CREADOS', 'DUPLICADOS', 'ERRORES'].map((h) => (
                  <div key={h} className="flex-1 px-4 h-[36px] flex items-center">
                    <span className="text-[11px] font-semibold text-[#7d7d87]">{h}</span>
                  </div>
                ))}
              </div>

              {historyLoading ? (
                <div className="px-8 py-12 text-center">
                  <p className="text-[13px] text-[#7d7d87]">Cargando historial...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="px-8 py-12 text-center">
                  <p className="text-[13px] text-[#7d7d87]">No hay historial de cargas disponible.</p>
                </div>
              ) : (
                history.map((e) => {
                  const date = new Date(e.processed_at);
                  const dateStr = date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  const timeStr = date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={e.id} className="flex border-b border-[#e5e5e9] h-[48px] items-center">
                      <div className="flex-1 px-4 text-[13px] font-semibold text-[#0f0f12] truncate" title={e.file_name}>
                        {e.file_name}
                      </div>
                      <div className="flex-1 px-4 text-[13px] text-[#7d7d87]">
                        {dateStr} {timeStr}
                      </div>
                      <div className="flex-1 px-4 text-[13px] text-[#7d7d87]">{e.total_rows}</div>
                      <div className="flex-1 px-4">
                        <span className="bg-[#ebf5ef] text-[#228b52] text-[11px] font-semibold px-[10px] py-[3px] rounded-full">
                          {e.created}
                        </span>
                      </div>
                      <div className="flex-1 px-4">
                        <span className="bg-[#fff6e3] text-[#b57218] text-[11px] font-semibold px-[10px] py-[3px] rounded-full">
                          {e.skipped}
                        </span>
                      </div>
                      <div className="flex-1 px-4">
                        <span className={`text-[11px] font-semibold px-[10px] py-[3px] rounded-full ${e.errors > 0 ? 'bg-[#fef2f2] text-[#b91c1c]' : 'bg-[#f5f5f6] text-[#7d7d87]'}`}>
                          {e.errors}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Aside panel */}
        <div className="w-[372px] shrink-0 flex flex-col gap-4">
          <div className="bg-white border border-[#ebebee] rounded-[8px] overflow-hidden">
            <div className="border-b border-[#ebebee] h-[52px] flex items-center px-5 gap-2">
              <span className="text-[10px] text-[#3a71f7]">◆</span>
              <p className="text-[13px] font-semibold text-[#0f0f12]">Estructura esperada</p>
            </div>
            <div className="px-5 py-4 flex flex-col gap-4">
              {config.asideItems.map((item) => (
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

          <div className="bg-[#eff1ff] border border-[#3a71f7] rounded-[8px] px-4 py-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-[#3a71f7]">◆</span>
              <p className="text-[13px] font-semibold text-[#3a71f7]">Impacto de la carga</p>
            </div>
            <p className="text-[12px] text-[#3a71f7] leading-relaxed">{config.tipBody}</p>
          </div>
        </div>
      </div>

      {/* Preview table (only after processing) */}
      {result && result.records.length > 0 && (
        <div className="mt-6">
          <ResultTable
            records={result.records}
            headers={config.tableHeaders}
            importType={importType}
          />
        </div>
      )}
    </PageLayout>
  );
};

export default BulkImportPage;
