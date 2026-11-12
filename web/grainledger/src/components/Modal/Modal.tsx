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
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const activeElement = document.activeElement as HTMLElement | null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]):not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    // Only focus the first input/element if focus is not already inside the modal panel
    requestAnimationFrame(() => {
      if (panelRef.current && !panelRef.current.contains(document.activeElement)) {
        const focusTarget =
          panelRef.current.querySelector<HTMLElement>('[autofocus]') ||
          panelRef.current.querySelector<HTMLElement>(
            'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]):not([tabindex="-1"])',
          );
        focusTarget?.focus();
      }
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      if (activeElement && typeof activeElement.focus === 'function') {
        activeElement.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;
  return createPortal(
    <div className={`app-workspace fixed inset-0 z-[100] flex items-center justify-center p-4 ${className}`} role="presentation">
      <button
        aria-label="Đóng hộp thoại"
        className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-xs"
        onClick={closeOnBackdrop ? () => onCloseRef.current() : undefined}
        tabIndex={-1}
      />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label={ariaLabel} aria-describedby={titleId} className="relative z-10 max-h-[calc(100dvh-2rem)] overflow-auto outline-none">
        <span id={titleId} className="sr-only">{ariaLabel}</span>
        {children}
      </div>
    </div>,
    document.body,
  );
};
