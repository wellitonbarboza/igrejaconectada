import React from 'react';
import clsx from 'clsx';

export function Card({ className, ...props }) {
  return (
    <div
      className={clsx(
        'rounded-2xl border-0 bg-white shadow-lg transition-shadow duration-200 hover:shadow-xl',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={clsx('p-6 border-b border-slate-100', className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return (
    <h3
      className={clsx('flex items-center gap-2 text-base font-semibold text-slate-900 leading-none', className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }) {
  return <div className={clsx('p-6', className)} {...props} />;
}

export default Card;
