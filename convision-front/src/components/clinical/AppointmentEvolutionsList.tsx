import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, User, Eye } from 'lucide-react';
import { clinicalEvolutionService } from '@/services/clinicalEvolutionService';
import { ClinicalEvolution } from '@/services/clinicalHistoryService';

interface AppointmentEvolutionsListProps {
  patientId: number;
  appointmentId: number;
  onEvolutionsChange?: (hasEvolutions: boolean) => void;
}

const AppointmentEvolutionsList: React.FC<AppointmentEvolutionsListProps> = ({
  patientId,
  appointmentId,
  onEvolutionsChange
}) => {
  const [evolutions, setEvolutions] = useState<ClinicalEvolution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvolutions = async () => {
      try {
        setLoading(true);
        const evolutionsList = await clinicalEvolutionService.getEvolutionsByPatient(patientId, appointmentId);
        setEvolutions(evolutionsList);
        if (onEvolutionsChange) {
          onEvolutionsChange(evolutionsList.length > 0);
        }
      } catch (error) {
        console.error('Error fetching evolutions:', error);
        setEvolutions([]);
        if (onEvolutionsChange) {
          onEvolutionsChange(false);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEvolutions();
  }, [patientId, appointmentId, onEvolutionsChange]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Evoluciones Clínicas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="h-6 w-6 border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Cargando evoluciones...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Evoluciones Clínicas
          {evolutions.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {evolutions.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {evolutions.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-3">
              {appointmentId ? 'No hay evoluciones para esta cita' : 'No hay evoluciones registradas'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {evolutions.map((evolution) => (
              <Card
                key={evolution.id}
                className="shadow-sm hover:shadow-md transition-shadow bg-white"
              >
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span className="font-semibold text-blue-700 text-sm">
                        {formatDate(evolution.evolution_date)}
                      </span>
                      {evolution.appointment_id && (
                        <Badge variant="outline" className="text-xs border-blue-300 text-blue-600">
                          Cita ID: {evolution.appointment_id}
                        </Badge>
                      )}
                    </div>
                    {evolution.creator && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <User className="h-3 w-3" />
                        <span>{evolution.creator.name}</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div>
                      <strong className="text-gray-600">S:</strong>
                      <p className="text-gray-500 pl-1 line-clamp-2 leading-relaxed">{evolution.subjective || '-'}</p>
                    </div>
                    <div>
                      <strong className="text-gray-600">O:</strong>
                      <p className="text-gray-500 pl-1 line-clamp-2 leading-relaxed">{evolution.objective || '-'}</p>
                    </div>
                    <div>
                      <strong className="text-gray-600">A:</strong>
                      <p className="text-gray-500 pl-1 line-clamp-2 leading-relaxed">{evolution.assessment || '-'}</p>
                    </div>
                    <div>
                      <strong className="text-gray-600">P:</strong>
                      <p className="text-gray-500 pl-1 line-clamp-2 leading-relaxed">{evolution.plan || '-'}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                      onClick={() => {
                        window.open(`/specialist/patients/${patientId}/history?evolutionId=${evolution.id}`, '_blank');
                      }}
                    >
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      Ver Evolución Completa
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AppointmentEvolutionsList; 