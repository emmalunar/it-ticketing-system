"use client";

import type { ReactNode } from "react";
import type { ManagedUser, UserTicket } from "@/lib/api";
import { formatDate, ticketSummary } from "@/lib/ticket-meta";
import {
  ArrowRightIcon,
  ChevronRightIcon,
  ClockIcon,
  PlusIcon,
  SettingsIcon,
  TicketIcon,
  UserCheckIcon,
  UsersIcon,
} from "@/components/ui/icons";
import {
  PriorityBadge,
  StatusBadge,
  StatCard,
  type StatCardTone,
} from "@/components/ui";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";

type OverviewMetric = {
  destination: string;
  href: string;
  icon: ReactNode;
  label: string;
  meta: string;
  tone: StatCardTone;
  value: number | string;
};

type Shortcut = {
  description: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
};

export type AdminOverviewProps = {
  users: ManagedUser[];
  activeUsers: ManagedUser[];
  serviceOfficers: ManagedUser[];
  openTickets: UserTicket[];
  activeWorkTickets: UserTicket[];
  criticalCount: number;
  assignedTickets: UserTicket[];
  recentTickets: UserTicket[];
  loading: boolean;
  onOpenDestination: (destination: string) => void;
  onManageTicket: (ticketId: string) => void;
  onCreateAccount: () => void;
  onReviewTickets: () => void;
  onOpenSetup: () => void;
};

function requesterName(ticket: UserTicket) {
  return ticket.requester_name || ticket.requester_username || "Requester";
}

function ticketCountLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function AdminOverview({
  users,
  activeUsers,
  serviceOfficers,
  openTickets,
  activeWorkTickets,
  criticalCount,
  assignedTickets,
  recentTickets,
  loading,
  onOpenDestination,
  onManageTicket,
  onCreateAccount,
  onReviewTickets,
  onOpenSetup,
}: AdminOverviewProps) {
  const metrics: OverviewMetric[] = [
    {
      destination: "active-accounts",
      href: "/?view=admin&destination=active-accounts",
      icon: <UsersIcon size={15} />,
      label: "Active accounts",
      meta: loading ? "Loading accounts…" : `${users.length - activeUsers.length} deactivated`,
      tone: "brand",
      value: loading ? "—" : activeUsers.length,
    },
    {
      destination: "officers",
      href: "/?view=admin&destination=officers",
      icon: <UserCheckIcon size={15} />,
      label: "IT officers",
      meta: loading ? "Loading officers…" : `${serviceOfficers.length} total`,
      tone: "default",
      value: loading ? "—" : serviceOfficers.filter((officer) => officer.is_active).length,
    },
    {
      destination: "open-tickets",
      href: "/?view=admin&destination=open-tickets",
      icon: <TicketIcon size={15} />,
      label: "Open tickets",
      meta: "Waiting to be claimed",
      tone: "warning",
      value: loading ? "—" : openTickets.length,
    },
    {
      destination: "active-tickets",
      href: "/?view=admin&destination=active-tickets",
      icon: <ClockIcon size={15} />,
      label: "Active tickets",
      meta: "In progress or awaiting user",
      tone: "info",
      value: loading ? "—" : activeWorkTickets.length,
    },
    {
      destination: "critical-queue",
      href: "/?view=admin&destination=critical-queue",
      icon: <TicketIcon size={15} />,
      label: "Critical queue",
      meta: "Priority P1",
      tone: "danger",
      value: loading ? "—" : criticalCount,
    },
  ];

  const shortcuts: Shortcut[] = [
    {
      description: "Add a requester or IT officer",
      icon: <PlusIcon size={16} />,
      label: "Create an account",
      onClick: onCreateAccount,
    },
    {
      description: "Search, inspect, or close records",
      icon: <TicketIcon size={16} />,
      label: "Review all tickets",
      onClick: onReviewTickets,
    },
    {
      description: "View stations and issue types",
      icon: <SettingsIcon size={16} />,
      label: "Service configuration",
      onClick: onOpenSetup,
    },
  ];

  return (
    <div className="page-stack">
      <section aria-label="Administration metrics" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {metrics.map((metric, index) => (
          <StatCard
            className={index === metrics.length - 1 ? "col-span-2 sm:col-span-2 xl:col-span-1" : undefined}
            href={metric.href}
            icon={metric.icon}
            key={metric.destination}
            label={metric.label}
            meta={metric.meta}
            onClick={() => onOpenDestination(metric.destination)}
            tone={metric.tone}
            value={metric.value}
          />
        ))}
      </section>

      {assignedTickets.length > 0 ? (
        <Card>
          <CardHeader
            actions={
              <Button
                onClick={onReviewTickets}
                size="sm"
                trailingIcon={<ArrowRightIcon size={13} />}
                type="button"
                variant="ghost"
              >
                View ticket records
              </Button>
            }
            subtitle={`Your ticket history · ${ticketCountLabel(assignedTickets.length, "record")}`}
            title="Tickets assigned to you"
          />
          <div aria-label="Tickets assigned to you" className="record-list" role="group">
            {assignedTickets.slice(0, 3).map((ticket) => (
              <button
                aria-label={`Manage ${ticket.ticket_number}`}
                className="record-list__item w-full text-left"
                key={ticket.id}
                onClick={() => onManageTicket(ticket.id)}
                type="button"
              >
                <span className="record-list__top">
                  <span className="min-w-0">
                    <span className="ticket-id">{ticket.ticket_number}</span>
                    <span className="mt-1 block truncate text-sm font-semibold text-ink">
                      {ticketSummary(ticket, 96)}
                    </span>
                  </span>
                  <StatusBadge status={ticket.status} />
                </span>
                <span className="record-list__bottom">
                  <span className="inline-meta">
                    {requesterName(ticket)}
                    <span className="dot-separator" aria-hidden="true" />
                    {ticket.station_name}
                    <span className="dot-separator" aria-hidden="true" />
                    Updated {formatDate(ticket.updated_at)}
                  </span>
                  <PriorityBadge priority={ticket.priority} />
                </span>
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="layout-main-aside">
        <Card>
          <CardHeader
            actions={
              <Button
                onClick={onReviewTickets}
                size="sm"
                trailingIcon={<ArrowRightIcon size={13} />}
                type="button"
                variant="ghost"
              >
                Manage tickets
              </Button>
            }
            subtitle="Latest activity across all stations"
            title="Recently opened tickets"
          />
          {recentTickets.length ? (
            <ul aria-label="Recently opened tickets" className="record-list">
              {recentTickets.slice(0, 6).map((ticket) => (
                <li className="record-list__item" key={ticket.id}>
                  <div className="record-list__top">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="ticket-id">{ticket.ticket_number}</span>
                        <span className="text-meta">{requesterName(ticket)}</span>
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-ink" title={ticket.description}>
                        {ticketSummary(ticket, 96)}
                      </p>
                    </div>
                    <StatusBadge status={ticket.status} />
                  </div>
                  <div className="record-list__bottom">
                    <span className="inline-meta">
                      {ticket.station_name}
                      <span className="dot-separator" aria-hidden="true" />
                      {ticket.problem_type_name}
                    </span>
                    <span className="inline-meta">
                      <ClockIcon size={12} />
                      Opened {formatDate(ticket.created_at)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              body="New requester tickets will appear here."
              compact
              icon={<TicketIcon size={20} />}
              title={loading ? "Loading system records…" : "No tickets recorded"}
            />
          )}
        </Card>

        <aside aria-label="Administration shortcuts" className="rail">
          <Card>
            <CardHeader
              subtitle="Manage system records without leaving the control center."
              title="Administration shortcuts"
            />
            <CardBody>
              <div className="stack stack--sm">
                {shortcuts.map((shortcut) => (
                  <button
                    className="group flex w-full items-start gap-3 rounded-lg border border-line bg-surface p-3 text-left transition hover:border-brand-line hover:bg-brand-soft"
                    key={shortcut.label}
                    onClick={shortcut.onClick}
                    type="button"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-brand-line bg-brand-soft text-brand-strong transition group-hover:bg-surface">
                      {shortcut.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">{shortcut.label}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-ink-muted">
                        {shortcut.description}
                      </span>
                    </span>
                    <ChevronRightIcon className="mt-1 ml-auto shrink-0 text-ink-muted" size={15} />
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
