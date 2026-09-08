import type { ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose?: () => void;
  title?: string;
  children: ReactNode;
  dismissable?: boolean;
}

export function Modal({ open, onClose, title, children, dismissable = true }: Props) {
  if (!open) return null;
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-5 animate-fade-in"
      onClick={() => dismissable && onClose?.()}
      role="presentation"
    >
      <div
        className="w-full max-w-sm animate-pop-in rounded-3xl border border-line bg-surface p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {title && <h2 className="mb-3 text-center text-2xl font-800">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
