import React from 'react';
import clsx from 'clsx';

export const Checkbox = React.forwardRef(({ className, checked, onCheckedChange, ...props }, ref) => {
  const handleChange = (event) => {
    onCheckedChange?.(event.target.checked);
  };

  return (
    <input
      ref={ref}
      type="checkbox"
      className={clsx(
        'h-5 w-5 rounded border border-slate-300 bg-white text-blue-600 focus:ring-blue-500 focus:ring-offset-1',
        className
      )}
      checked={checked}
      onChange={handleChange}
      {...props}
    />
  );
});

Checkbox.displayName = 'Checkbox';

export default Checkbox;
