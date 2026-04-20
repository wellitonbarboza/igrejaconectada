import React from 'react';
import clsx from 'clsx';

const baseStyles =
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-white whitespace-nowrap';

const variants = {
  default:
    'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:from-blue-600 hover:to-purple-700 hover:shadow-xl',
  primary:
    'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:from-blue-600 hover:to-purple-700 hover:shadow-xl',
  secondary: 'bg-slate-900 text-white hover:bg-slate-800',
  outline:
    'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 hover:border-slate-300',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-md',
};

const sizes = {
  default: 'h-10 px-4',
  sm: 'h-9 px-3 text-[13px]',
  lg: 'h-11 px-6',
  icon: 'h-10 w-10 p-0',
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
