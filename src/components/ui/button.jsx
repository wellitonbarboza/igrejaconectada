import React from 'react';
import clsx from 'clsx';

const baseStyles =
  'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-white';

const variants = {
  default: 'bg-slate-900 text-white hover:bg-slate-800',
  outline:
    'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 hover:text-slate-900',
  ghost: 'hover:bg-slate-100 text-slate-700',
};

const sizes = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 px-3',
  lg: 'h-11 px-6',
  icon: 'h-10 w-10',
};

export const Button = React.forwardRef(
  ({ className, variant = 'default', size = 'default', asChild = false, children, ...props }, ref) => {
    const Component = asChild ? 'span' : 'button';
    return (
      <Component
        ref={ref}
        className={clsx(baseStyles, variants[variant] || variants.default, sizes[size] || sizes.default, className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Button.displayName = 'Button';

export default Button;
