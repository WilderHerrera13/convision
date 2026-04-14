import React from 'react';
import { Input } from '@/components/ui/input';

interface NumericFieldConfig {
  key: string;
  label: string;
  columns?: string[];
}

interface Props {
  title: string;
  headerColor: string;
  fields: NumericFieldConfig[];
  values: Record<string, number>;
  onChange: (key: string, value: number) => void;
  readOnly?: boolean;
  gridCols?: number;
}

const DailyReportSection: React.FC<Props> = ({
  title,
  headerColor,
  fields,
  values,
  onChange,
  readOnly,
  gridCols = 4,
}) => {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className={`px-4 py-3 ${headerColor}`}>
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className={`grid grid-cols-2 md:grid-cols-${gridCols} gap-4 p-4`}>
        {fields.map((field) => (
          <div key={field.key} className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
            {readOnly ? (
              <p className="text-sm font-medium">{values[field.key] ?? 0}</p>
            ) : (
              <Input
                type="number"
                min={0}
                value={values[field.key] || ''}
                onChange={(e) => onChange(field.key, parseInt(e.target.value) || 0)}
                placeholder="0"
                className="h-8 text-sm"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DailyReportSection;
