import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  PRIORITY_META,
  STATUS_META,
  roleLabel,
  statusLabel,
  statusTone,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/ticket-meta";

export type BadgeTone =
  | "neutral"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "violet"
  | "queued"
  | "progress"
  | "waiting"
  | "resolved"
  | "closed"
  | "reopened"
  | "p1"
  | "p2"
  | "p3";

export type BadgeProps = {
  tone?: BadgeTone;
  dot?: boolean;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
  title?: string;
};

export function Badge({ tone = "neutral", dot = false, icon, className, children, title }: BadgeProps) {
  return (
    <span className={cn("badge", `badge--${tone}`, className)} title={title}>
      {icon ? <span className="badge__icon">{icon}</span> : null}
      {dot ? <span className="badge__dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export function StatusBadge({ status, dot = true }: { status: string; dot?: boolean }) {
  const meta = STATUS_META[status as TicketStatus];
  return (
    <Badge tone={statusTone(status)} dot={dot} title={meta?.description}>
      {statusLabel(status)}
    </Badge>
  );
}

export function PriorityBadge({
  priority,
  showLabel = false,
  dot = false,
}: {
  priority: TicketPriority | string;
  showLabel?: boolean;
  dot?: boolean;
}) {
  const meta = PRIORITY_META[priority as TicketPriority];
  return (
    <Badge tone={(meta?.tone ?? "p3") as BadgeTone} dot={dot} title={meta?.description}>
      {showLabel ? `${priority} · ${meta?.label ?? ""}`.trim() : priority}
    </Badge>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const tone: BadgeTone = role === "ADMIN" ? "violet" : role === "AGENT" ? "brand" : "neutral";
  return <Badge tone={tone}>{roleLabel(role)}</Badge>;
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge tone={active ? "success" : "neutral"} dot>
      {active ? "Active" : "Deactivated"}
    </Badge>
  );
}
