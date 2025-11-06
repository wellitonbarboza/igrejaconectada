import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

const DropdownContext = createContext(null);

export function DropdownMenu({ children, className }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div ref={menuRef} className={clsx('relative inline-flex', className)}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownMenuTrigger({ asChild = false, children }) {
  const { setOpen, open } = useContext(DropdownContext);
  const handleClick = (event) => {
    event.preventDefault();
    setOpen(!open);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: (event) => {
        children.props.onClick?.(event);
        handleClick(event);
      },
    });
  }

  return (
    <button type="button" onClick={handleClick} className="inline-flex items-center justify-center">
      {children}
    </button>
  );
}

export function DropdownMenuContent({ align = 'start', className, children }) {
  const { open, setOpen } = useContext(DropdownContext);

  if (!open) return null;

  const alignment = {
    start: 'left-0',
    end: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  };

  return (
    <div
      className={clsx(
        'absolute z-50 mt-2 min-w-[180px] rounded-xl border border-slate-200 bg-white p-1 shadow-xl focus:outline-none',
        alignment[align] || alignment.start,
        className
      )}
      role="menu"
      onClick={() => setOpen(false)}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({ className, children, ...props }) {
  return (
    <button
      type="button"
      className={clsx(
        'flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default DropdownMenu;
