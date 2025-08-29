import React from 'react';
import ClinicalHistoryTabs from './tabs';

// Define the props interface for the main component
interface ClinicalHistoryFormProps {
  patient: {
    id: number;
    first_name?: string;
    last_name?: string;
    [key: string]: unknown;
  };
  initialData: Record<string, unknown> | null;
  onCancel: () => void;
  onSave: (history: Record<string, unknown>) => void;
}

const ClinicalHistoryForm: React.FC<ClinicalHistoryFormProps> = (props) => {
  return <ClinicalHistoryTabs {...props} />;
};

export default ClinicalHistoryForm; 