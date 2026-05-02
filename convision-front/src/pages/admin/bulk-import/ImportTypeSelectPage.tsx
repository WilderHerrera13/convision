import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/layouts/PageLayout';
import { UserRound, Stethoscope, CalendarCheck, Glasses, Users } from 'lucide-react';

interface ImportOption {
  type: string;
  title: string;
  description: string;
  columns: string[];
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const OPTIONS: ImportOption[] = [
  {
    type: 'patients',
    title: 'Pacientes',
    description: 'Carga masiva de pacientes desde un archivo Excel. Los pacientes que ya existan (por Documento) serán omitidos.',
    columns: ['Documento', 'Paciente', 'Telefono', 'Correo', 'FechaNacimiento'],
    icon: UserRound,
    path: '/admin/bulk-import/patients',
  },
  {
    type: 'doctors',
    title: 'Especialistas',
    description: 'Carga masiva de especialistas (doctores) que atendieron pacientes. Se crearán como usuarios con rol Especialista.',
    columns: ['Documento', 'Nombre', 'Apellido', 'Correo', 'Telefono'],
    icon: Stethoscope,
    path: '/admin/bulk-import/doctors',
  },
  {
    type: 'scheduled-appointments',
    title: 'Consultas Agendadas',
    description: 'Importa el historial de consultas atendidas. Crea automáticamente los pacientes que no existan y registra cada consulta con su especialista.',
    columns: ['FechaConsulta', 'Documento', 'Cliente', 'celular', 'correo', 'fechaNacimiento', 'Sede', 'Idusuario', 'Usuario', 'CreadoPor', 'CreadoPorNombre'],
    icon: CalendarCheck,
    path: '/admin/bulk-import/scheduled-appointments',
  },
  {
    type: 'lenses',
    title: 'Catálogo de Lentes',
    description: 'Carga masiva de lentes al catálogo central. Crea automáticamente los atributos (tipo, marca, material, clase, tratamiento) si no existen.',
    columns: ['CodigoInterno', 'Identificador', 'TipoLente', 'Marca', 'Material', 'ClaseLente', 'Tratamiento', 'Fotocromático', 'Descripción', 'Precio', 'Costo', 'Proveedor'],
    icon: Glasses,
    path: '/admin/bulk-import/lenses',
  },
  {
    type: 'staff-users',
    title: 'Usuarios del Sistema',
    description: 'Carga masiva de asesores y optómetras. Si la sede no existe se crea automáticamente. El número de documento se usa para iniciar sesión.',
    columns: ['Nombre', 'Documento', 'Rol', 'Sede'],
    icon: Users,
    path: '/admin/bulk-import/staff-users',
  },
];

const ImportTypeSelectPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageLayout
      title="Carga Masiva"
      subtitle="Selecciona el tipo de importación"
    >
      <div className="max-w-3xl">
        <p className="text-[13px] text-[#7d7d87] mb-6">
          Selecciona el tipo de datos que deseas importar. Cada tipo requiere un formato de archivo específico.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.type}
                onClick={() => navigate(opt.path)}
                className="bg-white border border-[#e5e5e9] rounded-[8px] p-6 text-left hover:border-[#3a71f7] hover:shadow-sm transition-all group"
              >
                <div className="bg-[#eff1ff] size-11 rounded-[8px] flex items-center justify-center mb-4 group-hover:bg-[#3a71f7] transition-colors">
                  <Icon className="size-5 text-[#3a71f7] group-hover:text-white transition-colors" />
                </div>

                <p className="text-[15px] font-semibold text-[#0f0f12] mb-1">{opt.title}</p>
                <p className="text-[12px] text-[#7d7d87] leading-relaxed mb-4">{opt.description}</p>

                <div className="border-t border-[#f0f0f2] pt-3">
                  <p className="text-[10px] font-semibold text-[#b4b5bc] tracking-wide mb-2">COLUMNAS REQUERIDAS</p>
                  <div className="flex flex-wrap gap-1.5">
                    {opt.columns.map((col) => (
                      <span
                        key={col}
                        className="bg-[#f5f5f6] text-[#7d7d87] text-[10px] font-medium px-2 py-0.5 rounded-[4px]"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </PageLayout>
  );
};

export default ImportTypeSelectPage;
