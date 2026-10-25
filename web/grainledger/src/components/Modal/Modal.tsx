import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface ModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  ariaLabel?: string;
  className?: string;
  closeOnBackdrop?: boolean;
}

/**
 * Shared, portal-based dialog foundation. It avoids clipping/stacking-context bugs
 * from app layouts while keeping keyboard and screen-reader behaviour consistent.
 */
export const Modal: React.FC<ModalProps> = ({
  children,
  isOpen,
  onClose,
  ariaLabel = 'Hộp thoại',
  className = '',
  closeOnBackdrop = true,
}) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const activeElement = document.activeElement as HTMLElement | null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>('[autofocus], button, input, select, textarea')?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      activeElement?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;
  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${className}`} role="presentation">
      <button aria-label="Đóng hộp thoại" className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-xs" onClick={closeOnBackdrop ? onClose : undefined} tabIndex={-1} />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label={ariaLabel} aria-describedby={titleId} className="relative z-10 max-h-[calc(100dvh-2rem)] overflow-auto outline-none">
        <span id={titleId} className="sr-only">{ariaLabel}</span>
        {children}
      </div>
    </div>,
    document.body,
  );
};
