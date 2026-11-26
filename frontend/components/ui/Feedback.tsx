import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { AlertCircleIcon, AlertTriangleIcon, CheckCircleIcon, InfoIcon } from "./icons";

export function Spinner({
  size = 16,
  className,
  label,
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn("spinner", className)}
      style={{ width: size, height: size }}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

export type EmptyStateProps = {
  icon?: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  inline?: boolean;
  className?: string;
};

export function EmptyState({ icon, title, body, action, compact, inline, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "empty-state",
        compact && "empty-state--compact",
        inline && "empty-state--inline",
        className,
      )}
    >
      {icon ? <span className="empty-state__icon">{icon}</span> : null}
      <div className={inline ? "grow" : undefined}>
        <p className="empty-state__title">{title}</p>
        {body ? <p className="empty-state__body">{body}</p> : null}
      </div>
      {action ? <div className="empty-state__actions">{action}</div> : null}
    </div>
  );
}

const alertIcons = {
  info: InfoIcon,
  success: CheckCircleIcon,
  warning: AlertTriangleIcon,
  error: AlertCircleIcon,
} as const;

export type AlertTone = keyof typeof alertIcons;

export function Alert({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const Icon = alertIcons[tone];
  return (
    <div className={cn("alert", `alert--${tone}`, className)} role={tone === "error" ? "alert" : "status"}>
      <span className="alert__icon">
        <Icon size={17} />
      </span>
      <div className="alert__content">
        {title ? <p className="alert__title">{title}</p> : null}
        {children ? <div className="alert__body">{children}</div> : null}
        {action ? <div className="alert__action">{action}</div> : null}
      </div>
    </div>
  );
}

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cn("skeleton", className)} style={style} aria-hidden="true" />;
}

export function LoadingPanel({
  label = "Loading",
  compact = false,
  className,
}: {
  label?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("empty-state", compact && "empty-state--compact", className)} role="status">
      <Spinner size={22} label={label} />
      <p className="empty-state__body" style={{ marginTop: 10 }}>
        {label}
      </p>
    </div>
  );
}

export function ErrorAlert({
  message,
  title = "Something went wrong",
  onRetry,
  retryLabel = "Try again",
  className,
}: {
  message: string;
  title?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <Alert
      tone="error"
      title={title}
      action={
        onRetry ? (
          <button className="link-action" type="button" onClick={onRetry}>
            {retryLabel}
          </button>
        ) : undefined
      }
      className={className}
    >
      {message}
    </Alert>
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("stack", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className="skeleton--text"
          style={{ width: index === lines - 1 ? "62%" : "100%" }}
        />
      ))}
    </div>
  );
}

export function PageStatus({ children, ...props }: HTMLAttributes<HTMLParagraphElement> & { children: ReactNode }) {
  return (
    <p {...props} className={cn("text-meta", props.className)} role="status">
      {children}
    </p>
  );
}
