"use client";

import {
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type FormEventHandler,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scroll-lock";
import { AlertTriangleIcon, XIcon } from "./icons";
import { Button } from "./Button";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function useDialogFocus(
  open: boolean,
  onClose: () => void,
  dismissible: boolean,
): RefObject<HTMLDivElement | null> {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);

  useEffect(() => {
    closeRef.current = onClose;
    dismissibleRef.current = dismissible;
  }, [onClose, dismissible]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const returnTarget =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockBodyScroll();

    const focusTimer = window.setTimeout(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const preferred =
        dialog.querySelector<HTMLElement>("[data-autofocus]") ??
        dialog.querySelector<HTMLElement>(
          "input:not([disabled]):not([type='hidden']), select:not([disabled]), textarea:not([disabled])",
        ) ??
        dialog.querySelector<HTMLElement>(focusableSelector) ??
        dialog;
      preferred.focus({ preventScroll: true });
    }, 30);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (!dismissibleRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => element.offsetParent !== null || element === document.activeElement,
      );
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown, true);
      unlockBodyScroll();
      returnTarget?.focus({ preventScroll: true });
    };
  }, [open]);

  return dialogRef;
}

const subscribeMounted = () => () => {};
const getMountedSnapshot = () => true;
const getServerMountedSnapshot = () => false;

function useMounted() {
  return useSyncExternalStore(subscribeMounted, getMountedSnapshot, getServerMountedSnapshot);
}

type DialogContentProps = {
  title: ReactNode;
  description?: ReactNode;
  titleId: string;
  descriptionId: string;
  onClose: () => void;
  dismissible: boolean;
  children: ReactNode;
  footer?: ReactNode;
  closeLabel: string;
};

function DialogContent({
  title,
  description,
  titleId,
  descriptionId,
  onClose,
  dismissible,
  children,
  footer,
  closeLabel,
}: DialogContentProps) {
  return (
    <>
      <div className="modal__header">
        <div className="modal__heading">
          <h2 className="modal__title" id={titleId}>
            {title}
          </h2>
          {description ? (
            <p className="modal__description" id={descriptionId}>
              {description}
            </p>
          ) : null}
        </div>
        {dismissible ? (
          <button className="modal__close" type="button" onClick={onClose} aria-label={closeLabel}>
            <XIcon size={17} />
          </button>
        ) : null}
      </div>
      <div className="modal__body">{children}</div>
      {footer ? <div className="modal__footer">{footer}</div> : null}
    </>
  );
}

type CommonDialogProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  dismissible?: boolean;
  className?: string;
  asForm?: boolean;
  onSubmit?: FormEventHandler<HTMLFormElement>;
};

export type ModalProps = CommonDialogProps & {
  size?: "sm" | "md" | "lg" | "wide";
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  dismissible = true,
  className,
  size = "md",
  asForm = false,
  onSubmit,
}: ModalProps) {
  const mounted = useMounted();
  const dialogRef = useDialogFocus(open, onClose, dismissible);
  const titleId = useId();
  const descriptionId = useId();

  if (!mounted || !open) return null;

  const content = (
    <DialogContent
      title={title}
      description={description}
      titleId={titleId}
      descriptionId={descriptionId}
      onClose={onClose}
      dismissible={dismissible}
      footer={footer}
      closeLabel="Close dialog"
    >
      {children}
    </DialogContent>
  );

  function handleBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && dismissible) onClose();
  }

  return createPortal(
    <div className="overlay-backdrop" onMouseDown={handleBackdrop}>
      <div
        className={cn(
          "modal",
          size === "sm" && "modal--sm",
          size === "lg" && "modal--lg",
          size === "wide" && "modal--wide",
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        ref={dialogRef}
      >
        {asForm ? (
          <form className="modal__form" onSubmit={onSubmit}>
            {content}
          </form>
        ) : (
          content
        )}
      </div>
    </div>,
    document.body,
  );
}

export type DrawerProps = CommonDialogProps & {
  wide?: boolean;
  subtitle?: ReactNode;
};

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  description,
  children,
  footer,
  dismissible = true,
  className,
  wide = false,
  asForm = false,
  onSubmit,
}: DrawerProps) {
  const mounted = useMounted();
  const dialogRef = useDialogFocus(open, onClose, dismissible);
  const titleId = useId();
  const descriptionId = useId();

  if (!mounted || !open) return null;

  const header = (
    <div className="drawer__header">
      <div className="drawer__heading">
        <h2 className="drawer__title" id={titleId}>
          {title}
        </h2>
        {subtitle ? <p className="drawer__subtitle">{subtitle}</p> : null}
        {description ? (
          <p className="drawer__subtitle" id={descriptionId}>
            {description}
          </p>
        ) : null}
      </div>
      {dismissible ? (
        <button className="modal__close" type="button" onClick={onClose} aria-label="Close panel">
          <XIcon size={17} />
        </button>
      ) : null}
    </div>
  );

  const content = (
    <>
      {header}
      <div className="drawer__body">{children}</div>
      {footer ? <div className="drawer__footer">{footer}</div> : null}
    </>
  );

  function handleBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && dismissible) onClose();
  }

  return createPortal(
    <div className="drawer-backdrop" onMouseDown={handleBackdrop}>
      <div
        className={cn("drawer", wide && "drawer--wide", className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        ref={dialogRef}
      >
        {asForm ? (
          <form className="modal__form" onSubmit={onSubmit}>
            {content}
          </form>
        ) : (
          content
        )}
      </div>
    </div>,
    document.body,
  );
}

export type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  tone?: "danger" | "primary";
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  busy = false,
  tone = "danger",
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      dismissible={!busy}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger-solid" : "primary"}
            type="button"
            onClick={onConfirm}
            loading={busy}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className={cn("modal__icon", tone === "danger" && "modal__icon--danger")}>
        <AlertTriangleIcon size={20} />
      </div>
      <div style={{ color: "var(--color-ink-soft)" }}>{description}</div>
    </Modal>
  );
}
