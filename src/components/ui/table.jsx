import React from 'react';
import clsx from 'clsx';

export function Table({ className, ...props }) {
  return (
    <table className={clsx('w-full caption-bottom text-sm text-left', className)} {...props} />
  );
}

export function TableHeader({ className, ...props }) {
  return <thead className={clsx('text-xs uppercase text-slate-500', className)} {...props} />;
}

export function TableBody({ className, ...props }) {
  return <tbody className={clsx('divide-y divide-slate-200 bg-white', className)} {...props} />;
}

export function TableRow({ className, ...props }) {
  return <tr className={clsx('border-b last:border-0', className)} {...props} />;
}

export function TableHead({ className, ...props }) {
  return (
    <th className={clsx('px-4 py-3 text-xs font-medium tracking-wide text-slate-500', className)} {...props} />
  );
}

export function TableCell({ className, ...props }) {
  return <td className={clsx('px-4 py-3 align-middle text-sm text-slate-600', className)} {...props} />;
}

export default Table;
