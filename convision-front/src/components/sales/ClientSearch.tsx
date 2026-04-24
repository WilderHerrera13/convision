import React, { useState, useRef, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { patientService } from '@/services/patientService';
import { toast } from '@/components/ui/use-toast';

interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  identification: string;
  email: string;
  phone: string;
}

interface ClientSearchProps {
  selectedPatient: Patient | null;
  onSelectPatient: (patient: Patient) => void;
  onClearPatient: () => void;
}

const ClientSearch: React.FC<ClientSearchProps> = ({
  selectedPatient,
  onSelectPatient,
  onClearPatient,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (value: string) => {
    setSearchTerm(value);
    if (value.length < 3) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setIsSearching(true);
    try {
      const response = await patientService.searchPatients({ search: value, page: 1, perPage: 10 });
      setResults(response.data);
      setShowDropdown(true);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los pacientes.' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (patient: Patient) => {
    onSelectPatient(patient);
    setSearchTerm('');
    setShowDropdown(false);
    setResults([]);
  };

  return (
    <div className="px-4 pt-3 pb-4 space-y-3">
      {!selectedPatient && (
        <div ref={containerRef} className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#b4b5bc]" />
            <Input
              className="pl-9 h-[36px] border-[#e5e5e9] text-[13px] placeholder:text-[#b4b5bc]"
              placeholder="Buscar cliente por nombre, identificación o teléfono..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => results.length > 0 && setShowDropdown(true)}
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-t-[#8753ef] border-[#e5e5e9] rounded-full animate-spin" />
            )}
          </div>
          {showDropdown && results.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#e5e5e9] rounded-[6px] shadow-md max-h-[200px] overflow-y-auto">
              {results.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-[#f7f4ff] transition-colors"
                  onClick={() => handleSelect(patient)}
                >
                  <div className="text-[13px] font-semibold text-[#121212]">
                    {patient.first_name} {patient.last_name}
                  </div>
                  <div className="text-[11px] text-[#7d7d87]">
                    ID: {patient.identification}
                    {patient.phone ? `  ·  Tel: ${patient.phone}` : ''}
                  </div>
                </button>
              ))}
            </div>
          )}
          {showDropdown && results.length === 0 && searchTerm.length >= 3 && !isSearching && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#e5e5e9] rounded-[6px] shadow-md px-3 py-3 text-[13px] text-[#7d7d87]">
              No se encontraron pacientes
            </div>
          )}
        </div>
      )}

      {selectedPatient && (
        <div className="bg-[#f1edff] border border-[rgba(135,83,239,0.3)] rounded-[6px] px-4 py-3 flex items-start justify-between">
          <div>
            <div className="text-[14px] font-semibold text-[#121212]">
              {selectedPatient.first_name} {selectedPatient.last_name}
            </div>
            <div className="text-[12px] text-[#7d7d87] mt-1">
              {selectedPatient.identification && `ID: ${selectedPatient.identification}`}
              {selectedPatient.phone && `   Tel: ${selectedPatient.phone}`}
              {selectedPatient.email && `   ${selectedPatient.email}`}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[#7d7d87] hover:text-[#121212] hover:bg-[rgba(135,83,239,0.1)] shrink-0"
            onClick={onClearPatient}
            title="Cambiar cliente"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default ClientSearch;
