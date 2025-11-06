import React from 'react';
import clsx from 'clsx';

export function Badge({ className, variant = 'default', ...props }) {
  const base = 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors';
  const styles = {
    default: 'border-transparent bg-slate-900 text-white',
    secondary: 'border-transparent bg-slate-100 text-slate-700',
  };

  return <span className={clsx(base, styles[variant] || styles.default, className)} {...props} />;
}

export default Badge;
