import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type StatCardTone = "default" | "brand" | "danger" | "warning" | "info";

type StatCardProps = {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  icon?: ReactNode;
  tone?: StatCardTone;
  href?: string;
  onClick?: () => void;
  className?: string;
};

export function StatCard({
  label,
  value,
  meta,
  icon,
  tone = "default",
  href,
  onClick,
  className,
}: StatCardProps) {
  const classes = cn(
    "stat-card",
    tone !== "default" && `stat-card--${tone}`,
    (href || onClick) && "stat-card--interactive",
    className,
  );

  const content = (
    <>
      <div className="stat-card__top">
        <p className="stat-card__label">{label}</p>
        {icon ? <span className="stat-card__icon">{icon}</span> : null}
      </div>
      <div>
        <p className="stat-card__value">{value}</p>
        {meta ? <p className="stat-card__meta">{meta}</p> : null}
      </div>
    </>
  );

  if (href) {
    return (
      <Link className={classes} href={href} scroll={false} onClick={onClick}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button className={classes} type="button" onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className={classes}>{content}</div>;
}
