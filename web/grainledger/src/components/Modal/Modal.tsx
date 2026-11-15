import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface ModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  ariaLabel?: string;
  className?: string;
  closeOnBackdrop?: boolean;
}

/** Browser-managed focus containment, background inertness, and focus return. */
export const Modal: React.FC<ModalProps> = ({
  children,
  isOpen,
  onClose,
  ariaLabel = 'Hộp thoại',
  className = '',
  closeOnBackdrop = true,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  const pressedOutsideRef = useRef(false);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;
  return createPortal(
    <dialog
      ref={dialogRef}
      aria-label={ariaLabel}
      className={`grain-modal app-workspace ${className}`}
      onCancel={(event) => { event.preventDefault(); onCloseRef.current(); }}
      onPointerDown={(event) => {
        if (!closeOnBackdrop) return;
        const rect = event.currentTarget.getBoundingClientRect();
        pressedOutsideRef.current = event.clientX < rect.left || event.clientX > rect.right ||
          event.clientY < rect.top || event.clientY > rect.bottom;
      }}
      onPointerUp={(event) => {
        if (!closeOnBackdrop || !pressedOutsideRef.current) return;
        pressedOutsideRef.current = false;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right ||
          event.clientY < rect.top || event.clientY > rect.bottom) onCloseRef.current();
      }}
    >
      {children}
    </dialog>,
    document.body,
  );
};
