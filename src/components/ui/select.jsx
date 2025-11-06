import React, { createContext, useContext, useState, useMemo } from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

const SelectContext = createContext(null);

export function Select({ children, value, defaultValue, onValueChange, disabled }) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');

  const handleChange = (nextValue, label) => {
    if (disabled) return;
    if (value === undefined) {
      setInternalValue(nextValue);
    }
    setSelectedLabel(label);
    onValueChange?.(nextValue);
    setOpen(false);
  };

  const currentValue = value !== undefined ? value : internalValue;

  const contextValue = useMemo(
    () => ({
      value: currentValue,
      onChange: handleChange,
      open,
      setOpen,
      selectedLabel,
      setSelectedLabel,
      disabled,
    }),
    [currentValue, open, selectedLabel, disabled]
  );

  return <SelectContext.Provider value={contextValue}>{children}</SelectContext.Provider>;
}

export function SelectTrigger({ children, className, ...props }) {
  const { open, setOpen, disabled } = useContext(SelectContext);
  return (
    <button
      type="button"
      className={clsx(
        'flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      aria-expanded={open}
      onClick={() => !disabled && setOpen(!open)}
      disabled={disabled}
      {...props}
    >
      <span className="flex-1 text-left">{children}</span>
      <ChevronDown className={clsx('h-4 w-4 transition-transform', open && 'rotate-180')} />
    </button>
  );
}

export function SelectValue({ placeholder = 'Selecione...' }) {
  const { selectedLabel, value } = useContext(SelectContext);
  if (selectedLabel) {
    return <span>{selectedLabel}</span>;
  }
  if (value) {
    return <span>{value}</span>;
  }
  return <span className="text-slate-400">{placeholder}</span>;
}

export function SelectContent({ className, children }) {
  const { open, disabled } = useContext(SelectContext);
  if (!open || disabled) return null;
  return (
    <div className={clsx('relative z-40 mt-2 rounded-xl border border-slate-200 bg-white p-1 shadow-xl', className)}>
      <div className="max-h-60 overflow-y-auto">{children}</div>
    </div>
  );
}

export function SelectItem({ value, children, className }) {
  const { onChange, value: selectedValue, setSelectedLabel } = useContext(SelectContext);
  const isSelected = selectedValue === value;
  const labelText = React.Children.toArray(children)
    .filter((child) => typeof child === 'string')
    .join(' ');

  React.useEffect(() => {
    if (isSelected && labelText) {
      setSelectedLabel(labelText);
    }
  }, [isSelected, labelText, setSelectedLabel]);

  return (
    <button
      type="button"
      className={clsx(
        'flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100',
        isSelected && 'bg-blue-50 text-blue-700',
        className
      )}
      onClick={() => {
        if (labelText) {
          setSelectedLabel(labelText);
          onChange(value, labelText);
        } else {
          onChange(value);
        }
      }}
    >
      {children}
    </button>
  );
}

export default Select;
