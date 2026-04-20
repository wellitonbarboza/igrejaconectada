import React from 'react';
import clsx from 'clsx';

const base = 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold lowercase transition-colors';

const variants = {
  default: 'border-transparent bg-slate-900 text-white',
  secondary: 'border-slate-200 bg-slate-100 text-slate-700',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  pink: 'bg-pink-100 text-pink-700 border-pink-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

export function Badge({ className, variant = 'default', ...props }) {
  return <span className={clsx(base, variants[variant] || variants.default, className)} {...props} />;
}

export default Badge;
