import { UseFormReturn } from 'react-hook-form';
import { ClinicalHistoryFormValues } from './schema';

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
  onModalOpen?: (modalName: string, buttonId: string) => void;
  onModalClose?: () => void;
  isModalActive?: boolean;
} 