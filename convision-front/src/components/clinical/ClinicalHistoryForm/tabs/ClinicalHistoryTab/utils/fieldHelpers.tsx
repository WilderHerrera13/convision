import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Box, Select, MenuItem, FormControl as MuiFormControl } from '@mui/material';
import { 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldDefinition } from '../types';
import { ClinicalHistoryFormValues } from '../schema';

export const getMaxLength = (fieldName: string): number | undefined => {
  switch (fieldName) {
    case 'document': return 10;
    case 'edad': return 3;
    case 'name': return 100;
    case 'afiliacion': return 40;
    case 'salud': return 40;
    case 'ocupacion': return 40;
    case 'ultimo_control_visual': return 30;
    case 'acompañante_nombre': return 100;
    case 'acompañante_documento': return 10;
    case 'acompañante_telefono': return 10;
    case 'responsable_nombre': return 100;
    case 'responsable_documento': return 10;
    case 'responsable_telefono': return 10;
    case 'motivo_consulta': return 500;
    case 'antecedentes_familiares': return 500;
    case 'antecedentes_personales': return 500;
    case 'antecedentes_laborales': return 500;
    default: return undefined;
  }
};

export const isNumericField = (fieldName: string): boolean => {
  return ['document', 'edad', 'acompañante_documento', 'responsable_documento'].includes(fieldName);
};

export const isPhoneField = (fieldName: string): boolean => {
  return ['acompañante_telefono', 'responsable_telefono'].includes(fieldName);
};

export const createFieldRenderer = (
  form: UseFormReturn<ClinicalHistoryFormValues>,
  formErrors: any,
  serverErrors: Record<string, string[]>
) => {
  return (field: FieldDefinition): React.ReactNode => {
    const fieldName = field.name as keyof ClinicalHistoryFormValues;
    
    // Hide patient_id field (it's handled automatically)
    if (field.name === 'patient_id') {
      return (
        <FormField
          key={fieldName}
          control={form.control}
          name={fieldName}
          render={({ field: formField }) => (
            <input type="hidden" {...formField} value={formField.value as number} />
          )}
        />
      );
    }
    
    // Check if field should be shown based on condition
    if (field.showIf) {
      const conditionValue = form.watch(field.showIf as keyof ClinicalHistoryFormValues);
      if (!conditionValue) return null;
    }

    const hasError = formErrors[fieldName] || serverErrors[field.name];

    switch (field.type) {
      case 'checkbox':
        return renderCheckboxField(field, form, hasError, serverErrors);
      case 'textarea':
        return renderTextareaField(field, form, hasError, serverErrors);
      case 'select':
        return renderSelectField(field, form, hasError, serverErrors);
      default:
        return renderTextInputField(field, form, hasError, serverErrors, formErrors);
    }
  };
};

const renderCheckboxField = (
  field: FieldDefinition,
  form: UseFormReturn<ClinicalHistoryFormValues>,
  hasError: any,
  serverErrors: Record<string, string[]>
) => {
  const fieldName = field.name as keyof ClinicalHistoryFormValues;
  
  return (
    <FormField
      key={fieldName}
      control={form.control}
      name={fieldName}
      render={({ field: formField }) => (
        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-2" style={{ marginTop: '24px' }}>
          <FormControl>
            <Checkbox
              checked={formField.value as unknown as boolean}
              onCheckedChange={formField.onChange}
            />
          </FormControl>
          <div className="space-y-1 leading-none">
            <FormLabel className={hasError ? 'text-red-600' : ''}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </FormLabel>
            <Box sx={{ minHeight: '20px' }}>
              <FormMessage />
              {serverErrors[field.name] && (
                <p className="text-sm text-red-600">{serverErrors[field.name][0]}</p>
              )}
            </Box>
          </div>
        </FormItem>
      )}
    />
  );
};

const renderTextareaField = (
  field: FieldDefinition,
  form: UseFormReturn<ClinicalHistoryFormValues>,
  hasError: any,
  serverErrors: Record<string, string[]>
) => {
  const fieldName = field.name as keyof ClinicalHistoryFormValues;
  
  return (
    <FormField
      key={fieldName}
      control={form.control}
      name={fieldName}
      render={({ field: formField }) => (
        <FormItem>
          <FormLabel className={hasError ? 'text-red-600' : ''}>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <Textarea
              {...formField}
              placeholder={field.placeholder || field.label}
              value={(formField.value as string) || ''}
              className={hasError ? 'border-red-500' : ''}
              rows={undefined}
              style={{ minHeight: '120px', height: '100%', flex: 1 }}
            />
          </FormControl>
          <FormMessage />
          {serverErrors[field.name] && (
            <Box sx={{ 
              minHeight: '20px',
              width: '100%',
              maxWidth: '100%',
              overflow: 'hidden'
            }}>
              <FormMessage style={{ 
                wordWrap: 'break-word', 
                whiteSpace: 'normal',
                maxWidth: '100%'
              }} />
              {serverErrors[field.name] && (
                <p 
                  className="text-sm text-red-600"
                  style={{ 
                    wordWrap: 'break-word', 
                    whiteSpace: 'normal',
                    maxWidth: '100%',
                    margin: 0
                  }}
                >
                  {serverErrors[field.name][0]}
                </p>
              )}
            </Box>
          )}
        </FormItem>
      )}
    />
  );
};

const renderSelectField = (
  field: FieldDefinition,
  form: UseFormReturn<ClinicalHistoryFormValues>,
  hasError: any,
  serverErrors: Record<string, string[]>
) => {
  const fieldName = field.name as keyof ClinicalHistoryFormValues;
  
  return (
    <FormField
      key={fieldName}
      control={form.control}
      name={fieldName}
      render={({ field: formField }) => (
        <FormItem>
          <FormLabel className={hasError ? 'text-red-600' : ''}>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <MuiFormControl fullWidth size="small">
              <Select
                value={formField.value as string}
                onChange={(e) => formField.onChange(e.target.value)}
                displayEmpty
                className={hasError ? 'border-red-500' : ''}
              >
                {field.options?.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </MuiFormControl>
          </FormControl>
          <FormMessage />
          {serverErrors[field.name] && (
            <Box sx={{ 
              minHeight: '20px',
              width: '100%',
              maxWidth: '100%',
              overflow: 'hidden'
            }}>
              <FormMessage style={{ 
                wordWrap: 'break-word', 
                whiteSpace: 'normal',
                maxWidth: '100%'
              }} />
              {serverErrors[field.name] && (
                <p 
                  className="text-sm text-red-600"
                  style={{ 
                    wordWrap: 'break-word', 
                    whiteSpace: 'normal',
                    maxWidth: '100%',
                    margin: 0
                  }}
                >
                  {serverErrors[field.name][0]}
                </p>
              )}
            </Box>
          )}
        </FormItem>
      )}
    />
  );
};

const renderTextInputField = (
  field: FieldDefinition,
  form: UseFormReturn<ClinicalHistoryFormValues>,
  hasError: any,
  serverErrors: Record<string, string[]>,
  formErrors: any
) => {
  const fieldName = field.name as keyof ClinicalHistoryFormValues;
  const maxLength = getMaxLength(field.name);
  
  return (
    <FormField
      key={fieldName}
      control={form.control}
      name={fieldName}
      render={({ field: formField }) => {
        const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
          if ((isNumericField(field.name) || isPhoneField(field.name)) && 
              !/\d/.test(e.key) && 
              !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
          }
        };
        
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          let value = e.target.value;
          
          if (isNumericField(field.name) || isPhoneField(field.name)) {
            value = value.replace(/\D/g, '');
          }
          
          if (maxLength && value.length > maxLength) {
            value = value.slice(0, maxLength);
          }
          
          formField.onChange(value);
        };
        
        // Check if this field should be disabled based on "NO APLICA" checkbox
        const getDisabledState = () => {
          if (field.name.startsWith('acompañante_') && field.name !== 'acompañante_no_aplica') {
            return form.watch('acompañante_no_aplica');
          }
          if (field.name.startsWith('responsable_') && field.name !== 'responsable_no_aplica') {
            return form.watch('responsable_no_aplica');
          }
          return false;
        };
        
        const isDisabled = getDisabledState();
        
        // Check if this field is conditionally required
        const isConditionallyRequired = () => {
          if (field.name.startsWith('acompañante_') && field.name !== 'acompañante_no_aplica') {
            return !form.watch('acompañante_no_aplica');
          }
          if (field.name.startsWith('responsable_') && field.name !== 'responsable_no_aplica') {
            return !form.watch('responsable_no_aplica');
          }
          return false;
        };
        
        const isFieldRequired = field.required && (field.name.includes('acompañante_') || field.name.includes('responsable_')) 
          ? isConditionallyRequired() 
          : field.required;
        
        // Check if field should have soft red border (empty required field)
        const shouldShowSoftRedBorder = () => {
          if (isDisabled || !isFieldRequired) return false;
          const fieldValue = formField.value as string;
          return !fieldValue || fieldValue.trim() === '';
        };
        
        const hasSoftRedBorder = shouldShowSoftRedBorder();
        
        return (
          <FormItem style={{ margin: "4px 0" }}>
            <FormLabel className={hasError ? 'text-red-600' : ''}>
              {field.label}
              {isFieldRequired && <span className="text-red-500 ml-1">*</span>}
            </FormLabel>
            <FormControl>
              <Input
                {...formField}
                placeholder={field.placeholder || field.label}
                value={(formField.value as string) || ''}
                className={
                  hasError 
                    ? 'border-red-500' 
                    : hasSoftRedBorder 
                      ? 'border-red-200 focus:border-red-300' 
                      : ''
                }
                onKeyPress={handleKeyPress}
                onChange={handleChange}
                maxLength={maxLength}
                disabled={isDisabled}
              />
            </FormControl>
            <Box sx={{ minHeight: '20px' }}>
              <FormMessage />
              {serverErrors[field.name] && (
                <Box sx={{ 
                  minHeight: '20px',
                  width: '100%',
                  maxWidth: '100%',
                  overflow: 'hidden'
                }}>
                  <FormMessage style={{ 
                    wordWrap: 'break-word', 
                    whiteSpace: 'normal',
                    maxWidth: '100%'
                  }} />
                  {serverErrors[field.name] && (
                    <p 
                      className="text-sm text-red-600"
                      style={{ 
                        wordWrap: 'break-word', 
                        whiteSpace: 'normal',
                        maxWidth: '100%',
                        margin: 0
                      }}
                    >
                      {serverErrors[field.name][0]}
                    </p>
                  )}
                </Box>
              )}
            </Box>
          </FormItem>
        );
      }}
    />
  );
}; 