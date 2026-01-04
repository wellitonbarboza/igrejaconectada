import React, { createContext, useContext, useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

const DropdownContext = createContext(null);

const mergeRefs = (...refs) => (node) => {
  refs.forEach((ref) => {
    if (!ref) return;
    if (typeof ref === 'function') {
      ref(node);
    } else {
      ref.current = node;
    }
  });
};

export function DropdownMenu({ children, className }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event) => {
      const target = event.target;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        !contentRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <DropdownContext.Provider value={{ open, setOpen, triggerRef, contentRef }}>
      <div ref={menuRef} className={clsx('relative inline-flex', className)}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownMenuTrigger({ asChild = false, children }) {
  const { setOpen, open, triggerRef } = useContext(DropdownContext);
  const handleClick = (event) => {
    event.preventDefault();
    setOpen(!open);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ref: mergeRefs(triggerRef, children.ref),
      onClick: (event) => {
        children.props.onClick?.(event);
        handleClick(event);
      },
    });
  }

  return (
    <button
      type="button"
      ref={triggerRef}
      onClick={handleClick}
      className="inline-flex items-center justify-center"
    >
      {children}
    </button>
  );
}

export function DropdownMenuContent({ align = 'start', className, children }) {
  const { open, setOpen, triggerRef, contentRef } = useContext(DropdownContext);
  const [position, setPosition] = useState({ top: 0, left: 0, right: 0, width: 0 });

  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({
      top: rect.bottom + 8,
      left: rect.left,
      right: window.innerWidth - rect.right,
      width: rect.width,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  if (!open) return null;

  const alignment = {
    start: { left: position.left },
    end: { right: position.right },
    center: { left: position.left + position.width / 2 },
  };

  const content = (
    <div
      ref={contentRef}
      className={clsx(
        'fixed z-50 min-w-[180px] rounded-xl border border-slate-200 bg-white p-1 shadow-xl focus:outline-none',
        align === 'center' && '-translate-x-1/2',
        className
      )}
      style={{ top: position.top, ...(alignment[align] || alignment.start) }}
      role="menu"
      onClick={() => setOpen(false)}
    >
      {children}
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
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
