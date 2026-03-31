import React, { createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

const DialogContext = createContext(null);

export function Dialog({ open, onOpenChange, children }) {
  return <DialogContext.Provider value={{ open, onOpenChange }}>{children}</DialogContext.Provider>;
}

function useDialogContext() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('Dialog components must be used within a Dialog');
  }
  return context;
}

export function DialogContent({ className, overlayClassName, children, ...props }) {
  const { open, onOpenChange } = useDialogContext();

  if (!open) return null;

  const content = (
    <div className={clsx('fixed inset-0 z-50 flex items-center justify-center', overlayClassName)}>
      <div className="absolute inset-0 bg-slate-900/50" onClick={() => onOpenChange?.(false)} />
      <div
        className={clsx(
          'relative z-10 max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl',
          className
        )}
        role="dialog"
        {...props}
      >
        {children}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}

export function DialogHeader({ className, ...props }) {
  return <div className={clsx('border-b px-6 py-4', className)} {...props} />;
}

export function DialogTitle({ className, ...props }) {
  return <h2 className={clsx('text-xl font-semibold', className)} {...props} />;
}

export default Dialog;
