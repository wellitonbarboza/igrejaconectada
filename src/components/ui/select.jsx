import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

const SelectContext = createContext(null);

function getTextFromChildren(children) {
  if (children === null || children === undefined) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(getTextFromChildren).join('');
  if (React.isValidElement(children)) return getTextFromChildren(children.props.children);
  return '';
}

function findLabelForValue(children, targetValue) {
  let label = '';

  React.Children.forEach(children, (child) => {
    if (label || !React.isValidElement(child)) return;

    if (child.type === SelectItem && child.props.value === targetValue) {
      label = getTextFromChildren(child.props.children).trim();
      return;
    }

    if (child.props?.children) {
      const nestedLabel = findLabelForValue(child.props.children, targetValue);
      if (nestedLabel) {
        label = nestedLabel;
      }
    }
  });

  return label;
}

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

  useEffect(() => {
    if (!currentValue) {
      if (selectedLabel) {
        setSelectedLabel('');
      }
      return;
    }

    const label = findLabelForValue(children, currentValue);
    if (label && label !== selectedLabel) {
      setSelectedLabel(label);
    }
  }, [children, currentValue, selectedLabel]);

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

  return (
    <SelectContext.Provider value={contextValue}>
      <div className="relative w-full">{children}</div>
    </SelectContext.Provider>
  );
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
    return <span className="text-sm text-slate-700">{selectedLabel}</span>;
  }
  if (value) {
    return <span className="text-sm text-slate-700">{value}</span>;
  }
  return <span className="text-slate-400">{placeholder}</span>;
}

export function SelectContent({ className, children, searchable = false, searchPlaceholder = 'Buscar...' }) {
  const { open, disabled } = useContext(SelectContext);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  if (!open || disabled) return null;

  const normalizedQuery = query.trim().toLowerCase();
  const allChildren = React.Children.toArray(children);
  const filteredChildren =
    !searchable || !normalizedQuery
      ? allChildren
      : allChildren.filter((child) => {
          // Mantém wrappers/itens que não sejam SelectItem; filtra SelectItem pelo texto
          if (!React.isValidElement(child) || child.type !== SelectItem) return true;
          const text = getTextFromChildren(child.props.children).toLowerCase();
          return text.includes(normalizedQuery);
        });

  const hasResults = filteredChildren.some(
    (child) => React.isValidElement(child) && child.type === SelectItem
  );

  return (
    <div
      className={clsx(
        'absolute left-0 top-full z-50 mt-2 w-full rounded-xl border border-slate-200 bg-white p-1 shadow-xl',
        className
      )}
    >
      {searchable && (
        <div className="p-1">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
      <div className="max-h-72 overflow-y-auto">
        {filteredChildren}
        {searchable && !hasResults && (
          <p className="px-3 py-2 text-sm text-slate-400 text-center">Nenhum resultado encontrado</p>
        )}
      </div>
    </div>
  );
}

export function SelectItem({ value, children, className }) {
  const { onChange, value: selectedValue, setSelectedLabel } = useContext(SelectContext);
  const isSelected = selectedValue === value;
  const labelText = getTextFromChildren(children).trim();

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
