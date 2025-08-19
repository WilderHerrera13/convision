import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Input } from './input';
import { Clock } from 'lucide-react';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, label, placeholder = 'hh:mm', disabled }) => {
  const [open, setOpen] = React.useState(false);
  const [hour, setHour] = React.useState('');
  const [minute, setMinute] = React.useState('');
  const [ampm, setAmpm] = React.useState<'AM' | 'PM'>('AM');

  React.useEffect(() => {
    if (value) {
      const [h, m] = value.split(':');
      let hourNum = Number(h);
      let ampmVal: 'AM' | 'PM' = 'AM';
      if (hourNum > 12) {
        hourNum = hourNum - 12;
        ampmVal = 'PM';
      } else if (hourNum === 12) {
        ampmVal = 'PM';
      }
      setHour(hourNum.toString().padStart(2, '0'));
      setMinute(m || '00');
      setAmpm(ampmVal);
    }
  }, [value]);

  const handleSelect = (h: string, m: string, a: 'AM' | 'PM') => {
    let hourNum = Number(h);
    if (a === 'PM' && hourNum < 12) hourNum += 12;
    if (a === 'AM' && hourNum === 12) hourNum = 0;
    const formatted = `${hourNum.toString().padStart(2, '0')}:${m}`;
    onChange(formatted);
    setOpen(false);
  };

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  return (
    <div className="w-full">
      {label && <label className="block mb-1 text-sm font-medium text-slate-700">{label}</label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative w-full">
            <Input
              value={value ? value : ''}
              onChange={() => {}}
              placeholder={placeholder}
              readOnly
              disabled={disabled}
              className="pr-10 cursor-pointer bg-white"
            />
            <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-4" align="start">
          <div className="flex gap-2 mb-4">
            <select
              className="w-16 p-2 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary"
              value={hour}
              onChange={e => setHour(e.target.value)}
            >
              {hours.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <span className="text-xl font-bold">:</span>
            <select
              className="w-16 p-2 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary"
              value={minute}
              onChange={e => setMinute(e.target.value)}
            >
              {minutes.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select
              className="w-16 p-2 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary"
              value={ampm}
              onChange={e => setAmpm(e.target.value as 'AM' | 'PM')}
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
          <button
            className="w-full py-2 bg-primary text-white rounded hover:bg-primary/90 transition"
            onClick={() => handleSelect(hour, minute, ampm)}
            type="button"
          >
            Seleccionar
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
}; 