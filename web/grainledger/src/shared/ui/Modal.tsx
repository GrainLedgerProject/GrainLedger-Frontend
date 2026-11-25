import React, { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";

export interface ModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  className?: string;
  closeOnBackdrop?: boolean;
  closedBy?: "any" | "closerequest" | "none";
}

/** Browser-managed focus containment, background inertness, and focus return. */
export const Modal: React.FC<ModalProps> = ({
  children,
  isOpen,
  onClose,
  ariaLabel = "Hộp thoại",
  ariaLabelledBy,
  className = "",
  closeOnBackdrop = true,
  closedBy = "closerequest",
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  const pressedOutsideRef = useRef(false);
  const justClosedRef = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return;
    const doc = dialog.ownerDocument;
    const previousFocus = doc.activeElement;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      // Closing via React can remove the dialog before the browser restores focus.
      if (doc.activeElement === doc.body && previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;
  return createPortal(
    <dialog
      ref={dialogRef}
      closedby={closedBy}
      aria-label={ariaLabelledBy ? undefined : ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={`grain-modal app-workspace ${className}`}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
      }}
      onPointerDown={(event) => {
        if (!closeOnBackdrop) return;
        const rect = event.currentTarget.getBoundingClientRect();
        pressedOutsideRef.current =
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom;
      }}
      onPointerUp={(event) => {
        if (!closeOnBackdrop || !pressedOutsideRef.current) return;
        pressedOutsideRef.current = false;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        ) {
          justClosedRef.current = true;
          setTimeout(() => {
            justClosedRef.current = false;
          }, 100);
          onCloseRef.current();
        }
      }}
      onClick={(event) => {
        if (!closeOnBackdrop || justClosedRef.current) return;
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          ) {
            onCloseRef.current();
          }
        }
      }}
    >
      {children}
    </dialog>,
    document.body,
  );
};
