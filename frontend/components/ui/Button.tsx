import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "soft"
  | "ghost"
  | "danger"
  | "danger-solid";

export type ButtonSize = "sm" | "md" | "lg";

const variantClass: Record<ButtonVariant, string> = {
  primary: "btn--primary",
  secondary: "btn--secondary",
  soft: "btn--soft",
  ghost: "btn--ghost",
  danger: "btn--danger",
  "danger-solid": "btn--danger-solid",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "btn--sm",
  md: "",
  lg: "btn--lg",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  block?: boolean;
};

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  leadingIcon,
  trailingIcon,
  block = false,
  className,
  children,
  disabled,
  type,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={cn("btn", variantClass[variant], sizeClass[size], block && "btn--block", className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <span className="btn__spinner" aria-hidden="true" /> : leadingIcon}
      {children}
      {!loading && trailingIcon}
    </button>
  );
}

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  tone?: "default" | "danger";
  children: ReactNode;
};

export function IconButton({ label, tone = "default", className, children, type, ...props }: IconButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={cn("icon-button", tone === "danger" && "icon-button--danger", className)}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
