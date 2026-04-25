import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { getAppointmentsBySpecialist, type Appointment } from '../../services/appointmentService';

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Programada',
  in_progress: 'En curso',
  paused: 'Pausada',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-green-100 text-[#0f8f64]',
  paused: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-800',
};

function AppointmentCard({ appointment, onClick }: { appointment: Appointment; onClick: () => void }) {
  const patientName = appointment.patient?.full_name
    || (appointment.patient?.first_name && appointment.patient?.last_name
      ? `${appointment.patient.first_name} ${appointment.patient.last_name}`
      : 'Paciente');

  return (
    <div
      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
      onClick={onClick}
    >
      <div>
        <p className="font-medium text-gray-900">{patientName}</p>
        <p className="text-sm text-gray-500">
          {new Date(appointment.scheduled_at).toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[appointment.status] ?? 'bg-gray-100 text-gray-700'}`}>
        {STATUS_LABELS[appointment.status] ?? appointment.status}
      </span>
    </div>
  );
}

export default function SpecialistAppointmentsPage() {
  const navigate = useNavigate();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['specialist-appointments', date, search, statusFilter],
    queryFn: () =>
      getAppointmentsBySpecialist({
        start_date: date,
        end_date: date,
        search: search || undefined,
        status: statusFilter || undefined,
      }),
  });

  const appointments: Appointment[] = data?.data?.data ?? [];
  const todayCount = appointments.filter(a => a.status !== 'cancelled').length;
  const inProgressCount = appointments.filter(a => a.status === 'in_progress').length;
  const completedCount = appointments.filter(a => a.status === 'completed').length;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mi Agenda</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Citas hoy</p>
          <p className="text-2xl font-bold text-gray-900">{todayCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">En curso</p>
          <p className="text-2xl font-bold text-[#0f8f64]">{inProgressCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Completadas</p>
          <p className="text-2xl font-bold text-gray-900">{completedCount}</p>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <input
          type="search"
          placeholder="Buscar paciente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm flex-1"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <p className="text-center text-gray-500 py-8">Cargando citas...</p>
        ) : appointments.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No hay citas para este día</p>
        ) : (
          appointments.map(appt => (
            <AppointmentCard
              key={appt.id}
              appointment={appt}
              onClick={() => navigate(`/specialist/appointments/${appt.id}`)}
            />
          ))
        )}
      </div>
    </div>
  );
}
