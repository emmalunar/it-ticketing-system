import type { ApiUser, TicketAttachment, UserTicket } from "./api";

export type TicketStatus =
  | "QUEUED"
  | "IN_PROGRESS"
  | "WAITING_USER"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED";

export type TicketPriority = "P1" | "P2" | "P3";

export type StatusTone =
  | "queued"
  | "progress"
  | "waiting"
  | "resolved"
  | "closed"
  | "reopened";

export type PriorityTone = "p1" | "p2" | "p3";

type StatusMeta = {
  label: string;
  shortLabel: string;
  tone: StatusTone;
  description: string;
};

export const STATUS_META: Record<TicketStatus, StatusMeta> = {
  QUEUED: {
    label: "Queued",
    shortLabel: "Queued",
    tone: "queued",
    description: "Waiting in the service queue for an officer.",
  },
  IN_PROGRESS: {
    label: "In progress",
    shortLabel: "In progress",
    tone: "progress",
    description: "An IT officer is actively working on this request.",
  },
  WAITING_USER: {
    label: "Waiting for user",
    shortLabel: "Waiting",
    tone: "waiting",
    description: "The IT team needs information from the requester.",
  },
  RESOLVED: {
    label: "Resolved",
    shortLabel: "Resolved",
    tone: "resolved",
    description: "The request has been resolved.",
  },
  CLOSED: {
    label: "Closed",
    shortLabel: "Closed",
    tone: "closed",
    description: "The request is closed and retained for records.",
  },
  REOPENED: {
    label: "Reopened",
    shortLabel: "Reopened",
    tone: "reopened",
    description: "The requester reopened this request.",
  },
};

export const PRIORITY_META: Record<TicketPriority, { label: string; shortLabel: string; tone: PriorityTone; description: string }> = {
  P1: {
    label: "Critical",
    shortLabel: "P1",
    tone: "p1",
    description: "Critical — service-impacting and handled immediately.",
  },
  P2: {
    label: "High",
    shortLabel: "P2",
    tone: "p2",
    description: "High — handled before normal-priority requests.",
  },
  P3: {
    label: "Normal",
    shortLabel: "P3",
    tone: "p3",
    description: "Normal — handled in arrival order.",
  },
};

export const ACTIVE_STATUSES = new Set<string>([
  "QUEUED",
  "IN_PROGRESS",
  "WAITING_USER",
  "REOPENED",
]);

export const OPEN_STATUSES = new Set<string>(["QUEUED", "REOPENED"]);

export function statusLabel(status: string): string {
  return STATUS_META[status as TicketStatus]?.label ?? status.replaceAll("_", " ").toLowerCase();
}

export function statusTone(status: string): StatusTone {
  return STATUS_META[status as TicketStatus]?.tone ?? "queued";
}

export function priorityLabel(priority: string): string {
  return PRIORITY_META[priority as TicketPriority]?.label ?? priority;
}

export function isActiveStatus(status: string): boolean {
  return ACTIVE_STATUSES.has(status);
}

export function isClosedStatus(status: string): boolean {
  return status === "RESOLVED" || status === "CLOSED";
}

export function formatAge(createdAt: string, now = Date.now()): string {
  const elapsed = new Date(createdAt).getTime();
  if (Number.isNaN(elapsed)) return "—";
  const minutes = Math.max(0, Math.floor((now - elapsed) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 ? `${hours}h ${minutes % 60}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return hours % 24 ? `${days}d ${hours % 24}h` : `${days}d`;
  return `${days}d`;
}

export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${unit}`;
}

export function displayName(
  user: Pick<ApiUser, "first_name" | "last_name" | "username"> | null | undefined,
): string {
  if (!user) return "Unknown user";
  const full = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  return full || user.username;
}

export function initials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!words.length) return "?";
  return words.map((word) => word[0]?.toUpperCase() ?? "").join("");
}

export function roleLabel(role: ApiUser["role"] | string): string {
  if (role === "ADMIN") return "Administrator";
  if (role === "AGENT") return "IT officer";
  if (role === "USER") return "Requester";
  return role;
}

export function isImageAttachment(attachment: Pick<TicketAttachment, "content_type" | "file_name">): boolean {
  if (attachment.content_type.startsWith("image/")) return true;
  return /\.(png|jpe?g|svg)$/i.test(attachment.file_name);
}

export function isSvgAttachment(attachment: Pick<TicketAttachment, "content_type" | "file_name">): boolean {
  return attachment.content_type === "image/svg+xml" || /\.svg$/i.test(attachment.file_name);
}

export function ticketSummary(ticket: Pick<UserTicket, "description">, maxLength = 72): string {
  const firstLine = ticket.description.trim().split(/\r?\n/, 1)[0] ?? "";
  const compact = firstLine.replace(/\s+/g, " ").trim();
  if (!compact) return "No description provided";
  return compact.length > maxLength ? `${compact.slice(0, maxLength - 1).trimEnd()}…` : compact;
}

export function searchableTicketText(ticket: UserTicket): string {
  return [
    ticket.ticket_number,
    ticket.description,
    ticket.station_name,
    ticket.problem_type_name,
    ticket.requester_name,
    ticket.requester_username,
    ticket.assignee_name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function relativeStationNames(stations: Pick<ApiUser["stations"][number], "name">[] | null | undefined): string {
  if (!stations?.length) return "No stations assigned";
  return stations.map((station) => station.name).join(", ");
}
