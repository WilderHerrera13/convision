import { forwardRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn, formatCurrency, formatIntegerEsCO, parseMoneyDigitsToInt } from '@/lib/utils';

type Props = Omit<React.ComponentPropsWithoutRef<'input'>, 'value' | 'onChange' | 'type'> & {
  value: number;
  onChange: (value: number) => void;
};

export const COPMoneyInput = forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, disabled, className, onBlur, onFocus, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const [editText, setEditText] = useState('');

    const blurredDisplay = formatCurrency(value, 'COP', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        value={focused ? editText : blurredDisplay}
        onChange={(e) => {
          if (!focused) return;
          const raw = e.target.value;
          const n = Math.max(0, parseMoneyDigitsToInt(raw));
          const digits = raw.replace(/\D/g, '');
          setEditText(digits === '' ? '' : formatIntegerEsCO(n));
          onChange(n);
        }}
        onFocus={(e) => {
          setFocused(true);
          setEditText(value > 0 ? formatIntegerEsCO(value) : '');
          onFocus?.(e);
          requestAnimationFrame(() => e.target.select());
        }}
        onBlur={(e) => {
          setFocused(false);
          const n = Math.max(0, parseMoneyDigitsToInt(editText));
          onChange(n);
          onBlur?.(e);
        }}
        className={cn('text-right tabular-nums', className)}
        {...props}
      />
    );
  }
);

COPMoneyInput.displayName = 'COPMoneyInput';
