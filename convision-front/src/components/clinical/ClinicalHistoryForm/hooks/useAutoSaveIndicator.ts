import { useState, useEffect } from 'react';
import { useClinicalHistoryContext } from '../context/ClinicalHistoryContext';

/**
 * Hook to show auto-save indicator/status
 * Returns the save status and time since last save
 */
export const useAutoSaveIndicator = () => {
  const { formData, isAutoSaveEnabled, isSaving } = useClinicalHistoryContext();
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [timeSinceLastSave, setTimeSinceLastSave] = useState<string>('');

  useEffect(() => {
    if (!formData.lastSaved) {
      setSaveStatus('unsaved');
      return;
    }

    // Update time since last save
    const updateTimeSince = () => {
      const lastSaved = new Date(formData.lastSaved!);
      const now = new Date();
      const diffMs = now.getTime() - lastSaved.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);

      if (diffMin === 0) {
        setTimeSinceLastSave('Hace unos segundos');
      } else if (diffMin === 1) {
        setTimeSinceLastSave('Hace 1 minuto');
      } else if (diffMin < 60) {
        setTimeSinceLastSave(`Hace ${diffMin} minutos`);
      } else {
        const diffHours = Math.floor(diffMin / 60);
        setTimeSinceLastSave(`Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`);
      }
    };

    updateTimeSince();
    const interval = setInterval(updateTimeSince, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [formData.lastSaved]);

  useEffect(() => {
    if (isSaving) {
      setSaveStatus('saving');
      return;
    }

    if (!formData.lastModified || !formData.lastSaved) {
      setSaveStatus('unsaved');
      return;
    }

    const lastModified = new Date(formData.lastModified);
    const lastSaved = new Date(formData.lastSaved);

    if (lastModified > lastSaved) {
      setSaveStatus('unsaved');
    } else {
      setSaveStatus('saved');
    }
  }, [formData.lastModified, formData.lastSaved, isSaving]);

  return {
    saveStatus,
    timeSinceLastSave,
    isAutoSaveEnabled,
    lastSaved: formData.lastSaved ? new Date(formData.lastSaved).toLocaleString() : null,
  };
};

