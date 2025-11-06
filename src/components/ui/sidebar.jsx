import React, { createContext, useContext, useState } from 'react';
import clsx from 'clsx';

const SidebarContext = createContext(null);

export function SidebarProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const value = { isOpen, setIsOpen };

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

function useSidebarContext() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('Sidebar components must be used within a SidebarProvider');
  }
  return context;
}

export function Sidebar({ className, children }) {
  const { isOpen, setIsOpen } = useSidebarContext();

  return (
    <>
      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex h-full w-72 flex-col transform bg-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 lg:shadow-none shadow-xl',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
      >
        {children}
      </div>
      {isOpen && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setIsOpen(false)} />}
    </>
  );
}

export function SidebarContent({ className, ...props }) {
  return <div className={clsx('flex-1 overflow-y-auto', className)} {...props} />;
}

export function SidebarHeader({ className, ...props }) {
  return <div className={clsx('px-4 py-4', className)} {...props} />;
}

export function SidebarFooter({ className, ...props }) {
  return <div className={clsx('mt-auto px-4 py-4', className)} {...props} />;
}

export function SidebarGroup({ className, ...props }) {
  return <div className={clsx('space-y-2', className)} {...props} />;
}

export function SidebarGroupLabel({ className, ...props }) {
  return <div className={clsx('text-xs font-semibold uppercase text-slate-500', className)} {...props} />;
}

export function SidebarGroupContent({ className, ...props }) {
  return <div className={clsx('space-y-1', className)} {...props} />;
}

export function SidebarMenu({ className, ...props }) {
  return <nav className={clsx('space-y-1', className)} {...props} />;
}

export function SidebarMenuItem({ className, ...props }) {
  return <div className={clsx('w-full', className)} {...props} />;
}

export function SidebarMenuButton({ className, asChild = false, children, ...props }) {
  const { setIsOpen } = useSidebarContext();
  const classes = clsx(
    'flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900',
    className
  );

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      className: clsx(children.props.className, classes),
      onClick: (event) => {
        children.props.onClick?.(event);
        setIsOpen(false);
      },
    });
  }

  return (
    <button
      type="button"
      className={classes}
      onClick={(event) => {
        props.onClick?.(event);
        setIsOpen(false);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function SidebarTrigger({ className, ...props }) {
  const { isOpen, setIsOpen } = useSidebarContext();
  return (
    <button
      type="button"
      className={clsx('inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2', className)}
      aria-expanded={isOpen}
      onClick={() => setIsOpen(!isOpen)}
      {...props}
    />
  );
}

export default Sidebar;
