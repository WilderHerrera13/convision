import * as React from "react";
import { format, startOfDay } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Input } from "./input";
import { Label } from "./label";

export interface DatePickerProps {
  value?: Date | string;
  onChange: (date: Date | undefined) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  /** Fechas posteriores a este día (00:00 local) quedan deshabilitadas. */
  maxDate?: Date;
  error?: string;
  useInputTrigger?: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = "Seleccionar fecha",
  disabled,
  minDate,
  maxDate,
  error,
  useInputTrigger = false,
}) => {
  // Convert string date to Date object if needed
  const dateValue = value ? (typeof value === 'string' ? new Date(value) : value) : undefined;

  const triggerContent = useInputTrigger ? (
    <Input
      value={dateValue ? format(dateValue, 'dd/MM/yyyy') : ''}
      placeholder={placeholder}
      readOnly
      className={disabled ? 'cursor-not-allowed bg-muted' : 'cursor-pointer bg-white'}
      disabled={disabled}
    />
  ) : (
    <Button
      type="button"
      variant="outline"
      className={`w-full justify-start text-left font-normal ${!dateValue ? 'text-muted-foreground' : ''} ${disabled ? 'cursor-not-allowed opacity-90' : ''}`}
      disabled={disabled}
    >
      <CalendarIcon className="mr-2 h-4 w-4" />
      {dateValue ? format(dateValue, 'dd/MM/yyyy') : placeholder}
    </Button>
  );

  return (
    <div className="w-full space-y-2">
      {label && <Label className="text-base font-medium">{label}</Label>}
      {disabled ? (
        triggerContent
      ) : (
        <Popover>
          <PopoverTrigger asChild>{triggerContent}</PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateValue}
              onSelect={onChange}
              initialFocus
              disabled={
                minDate || maxDate
                  ? (date) => {
                      const d = startOfDay(date);
                      if (minDate && d < startOfDay(minDate)) return true;
                      if (maxDate && d > startOfDay(maxDate)) return true;
                      return false;
                    }
                  : undefined
              }
            />
          </PopoverContent>
        </Popover>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}; 