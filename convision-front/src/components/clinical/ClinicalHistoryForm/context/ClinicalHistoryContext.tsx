import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

// Define the complete form data structure for all tabs
export interface ClinicalHistoryFormData {
  // Patient basic info (shared across tabs)
  patient_id?: number;
  first_name?: string;
  last_name?: string;
  documento?: string;
  
  // ClinicalHistoryTab data (from react-hook-form)
  clinicalHistoryTab?: Record<string, any>;
  
  // RxFinalTab data
  rxFinalTab?: {
    fecha?: string;
    documento?: string;
    nombre?: string;
    // Ojo Derecho
    od_esfera?: string;
    od_cilindro?: string;
    od_eje?: string;
    od_adicion?: string;
    od_altura_f?: string;
    od_distancia_p?: string;
    od_lejos?: string;
    od_cerca?: string;
    // Ojo Izquierdo
    oi_esfera?: string;
    oi_cilindro?: string;
    oi_eje?: string;
    oi_adicion?: string;
    oi_altura_f?: string;
    oi_distancia_p?: string;
    oi_lejos?: string;
    oi_cerca?: string;
    // Otros campos
    tipo_correccion?: string;
    forma_uso?: string;
    recomendacion?: string;
    profesional?: string;
    observacion?: string;
  };
  
  // ContactologiaTab data
  contactologiaTab?: {
    documento?: string;
    nombre_cliente?: string;
    celular?: string;
    telefono?: string;
    n_contactologia?: string;
    fecha?: string;
    n_formula?: string;
    n_historia?: string;
    // Ojo Derecho Visual Acuity
    od_esfera?: string;
    od_cilindro?: string;
    od_eje?: string;
    od_adicion?: string;
    od_av_lejos?: string;
    od_av_cerca?: string;
    od_queratometria?: string;
    // Ojo Izquierdo Visual Acuity
    oi_esfera?: string;
    oi_cilindro?: string;
    oi_eje?: string;
    oi_adicion?: string;
    oi_av_lejos?: string;
    oi_av_cerca?: string;
    oi_queratometria?: string;
    // Contact Lens Prescription
    tipo_lente?: string;
    // Ojo Derecho Contact Lens
    od_cl_esfera?: string;
    od_cl_cilindro?: string;
    od_cl_eje?: string;
    od_cl_adicion?: string;
    od_cl_diametro?: string;
    od_cl_curva?: string;
    od_cl_poder?: string;
    // Ojo Izquierdo Contact Lens
    oi_cl_esfera?: string;
    oi_cl_cilindro?: string;
    oi_cl_eje?: string;
    oi_cl_adicion?: string;
    oi_cl_diametro?: string;
    oi_cl_curva?: string;
    oi_cl_poder?: string;
    // Additional Fields
    profesional?: string;
    observacion?: string;
  };
  
  // ProtesisTab data
  protesisTab?: {
    protesis?: string;
    cascarilla?: string;
    od?: string;
    oi?: string;
    diametro_iris?: string;
    diametro_iris_muestra?: string;
    diametro_pupila?: string;
    diametro_pupila_muestra?: string;
    color_iris_muestra?: string;
    detalles?: string;
    esclera?: string;
    esclera_muestra?: string;
    cantidad_venas?: string;
    venas_muestra?: string;
    forma_muestra?: string;
    cantidad_muestras?: string;
    observaciones?: string;
  };
  
  // EvolucionesTab data
  evolucionesTab?: Record<string, any>;
  
  // DocumentosTab data
  documentosTab?: Record<string, any>;
  
  // RemisionTab data
  remisionTab?: {
    formData?: Record<string, any>;
    cupsData?: any[];
    medicamentosData?: any[];
    examenesData?: any[];
  };
  
  // Metadata
  lastSaved?: string;
  lastModified?: string;
}

interface ClinicalHistoryContextType {
  formData: ClinicalHistoryFormData;
  updateTabData: (tabName: keyof ClinicalHistoryFormData, data: any) => void;
  updateField: (tabName: keyof ClinicalHistoryFormData, field: string, value: any) => void;
  loadFromLocalStorage: (patientId: number) => void;
  saveToLocalStorage: () => void;
  clearFormData: () => void;
  // Autosave state
  isSaving: boolean;
  isAutoSaveEnabled: boolean;
  setAutoSaveEnabled: (enabled: boolean) => void;
  autoSaveInterval: number;
  setAutoSaveInterval: (interval: number) => void;
}

const ClinicalHistoryContext = createContext<ClinicalHistoryContextType | undefined>(undefined);

export const useClinicalHistoryContext = () => {
  const context = useContext(ClinicalHistoryContext);
  if (!context) {
    throw new Error('useClinicalHistoryContext must be used within ClinicalHistoryProvider');
  }
  return context;
};

interface ClinicalHistoryProviderProps {
  children: React.ReactNode;
  patient: {
    id: number;
    first_name?: string;
    last_name?: string;
    [key: string]: unknown;
  };
  initialData?: Record<string, unknown> | null;
}

export const ClinicalHistoryProvider: React.FC<ClinicalHistoryProviderProps> = ({
  children,
  patient,
  initialData
}) => {
  const [formData, setFormData] = useState<ClinicalHistoryFormData>(() => {
    try {
      const key = `clinical_history_draft_${patient.id}`;
      const saved = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lastSaved && !parsed.lastModified) {
          parsed.lastModified = parsed.lastSaved;
        }
        return parsed as ClinicalHistoryFormData;
      }
    } catch (error) {
      console.error('❌ Error reading initial draft from localStorage:', error);
    }
    // Fallback to initialData or patient basics
    return {
      patient_id: patient.id,
      first_name: patient.first_name,
      last_name: patient.last_name,
      ...(initialData as any || {}),
    } as ClinicalHistoryFormData;
  });
  
  const [isAutoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [autoSaveInterval, setAutoSaveInterval] = useState(30000); // 30 seconds default
  const [isSaving, setIsSaving] = useState(false);
  const latestFormDataRef = useRef<ClinicalHistoryFormData>(formData);
  const isSavingRef = useRef<boolean>(false);
  
  // Keep a ref with the latest form data so the interval callback always sees fresh data
  useEffect(() => {
    latestFormDataRef.current = formData;
  }, [formData]);
  
  // Generate localStorage key based on patient ID
  const getStorageKey = useCallback(() => {
    return `clinical_history_draft_${patient.id}`;
  }, [patient.id]);
  
  // Load from localStorage on mount
  useEffect(() => {
    loadFromLocalStorage(patient.id);
  }, [patient.id]);
  
  // Auto-save functionality
  useEffect(() => {
    if (!isAutoSaveEnabled) return;
    
    const intervalId = setInterval(() => {
      // Only save if there are changes since last save; otherwise, skip to reduce noise
      const { lastModified, lastSaved } = latestFormDataRef.current || {};
      const hasUnsavedChanges = !lastSaved || (lastModified && new Date(lastModified) > new Date(lastSaved));
      if (hasUnsavedChanges) {
        saveToLocalStorage();
      }
    }, autoSaveInterval);
    
    return () => clearInterval(intervalId);
  }, [isAutoSaveEnabled, autoSaveInterval]);
  
  // Save to localStorage
  const saveToLocalStorage = useCallback(() => {
    try {
      if (isSavingRef.current) {
        return;
      }
      isSavingRef.current = true;
      setIsSaving(true);
      const now = new Date().toISOString();
      const current = latestFormDataRef.current || {} as ClinicalHistoryFormData;
      const dataToSave = {
        ...current,
        lastSaved: now,
      };
      localStorage.setItem(getStorageKey(), JSON.stringify(dataToSave));
      // Reflect the new lastSaved in state without touching lastModified
      setFormData(prev => ({
        ...prev,
        lastSaved: now,
      }));
      console.log('✅ Auto-saved clinical history data to localStorage', new Date().toLocaleTimeString());
    } catch (error) {
      console.error('❌ Error saving to localStorage:', error);
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  }, [getStorageKey]);
  
  // Load from localStorage
  const loadFromLocalStorage = useCallback((patientId: number) => {
    try {
      const key = `clinical_history_draft_${patientId}`;
      const savedData = localStorage.getItem(key);
      
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        if (parsedData.lastSaved && !parsedData.lastModified) {
          parsedData.lastModified = parsedData.lastSaved;
        }
        setFormData(parsedData);
        console.log('📥 Loaded clinical history data from localStorage', parsedData);
      } else if (initialData) {
        // If no saved data but initialData exists, use it
        setFormData({
          patient_id: patient.id,
          first_name: patient.first_name,
          last_name: patient.last_name,
          ...initialData as any,
        });
      }
    } catch (error) {
      console.error('❌ Error loading from localStorage:', error);
    }
  }, [initialData, patient]);
  
  // Update entire tab data
  const updateTabData = useCallback((tabName: keyof ClinicalHistoryFormData, data: any) => {
    setFormData(prev => ({
      ...prev,
      [tabName]: data,
      lastModified: new Date().toISOString(),
    }));
  }, []);
  
  // Update a single field in a tab
  const updateField = useCallback((tabName: keyof ClinicalHistoryFormData, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [tabName]: {
        ...(prev[tabName] as any || {}),
        [field]: value,
      },
      lastModified: new Date().toISOString(),
    }));
  }, []);
  
  // Clear form data
  const clearFormData = useCallback(() => {
    try {
      localStorage.removeItem(getStorageKey());
      setFormData({
        patient_id: patient.id,
        first_name: patient.first_name,
        last_name: patient.last_name,
      });
      console.log('🗑️ Cleared clinical history draft data');
    } catch (error) {
      console.error('❌ Error clearing localStorage:', error);
    }
  }, [patient, getStorageKey]);
  
  const value: ClinicalHistoryContextType = {
    formData,
    updateTabData,
    updateField,
    loadFromLocalStorage,
    saveToLocalStorage,
    clearFormData,
    isSaving,
    isAutoSaveEnabled,
    setAutoSaveEnabled,
    autoSaveInterval,
    setAutoSaveInterval,
  };
  
  return (
    <ClinicalHistoryContext.Provider value={value}>
      {children}
    </ClinicalHistoryContext.Provider>
  );
};

