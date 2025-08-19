import { UseFormReturn } from 'react-hook-form';
import { ClinicalHistoryFormValues } from './schema';

export interface ClinicalHistoryFormProps {
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

export interface FieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'checkbox' | 'select';
  required?: boolean;
  showIf?: string;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  disabled?: boolean;
}

export interface SectionDefinition {
  title: string;
  fields: FieldDefinition[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
  priority?: 'high' | 'medium' | 'low';
}

export interface ApiError {
  response?: {
    data?: {
      error?: string;
      errors?: Record<string, string[]>;
    };
  };
  message: string;
}

export interface SectionProps {
  form: UseFormReturn<ClinicalHistoryFormValues>;
  serverErrors: Record<string, string[]>;
  renderField: (field: FieldDefinition) => React.ReactNode;
}

export type SectionStatus = 'error' | 'completed' | 'empty'; 