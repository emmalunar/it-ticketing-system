"use client";

import Link from "next/link";
import { useId } from "react";
import {
  ActivityIcon,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  ClockIcon,
  EmptyState,
  FilterIcon,
  InboxIcon,
  RefreshIcon,
  Spinner,
  StatusBadge,
} from "@/components/ui";
import type { UserTicket } from "@/lib/api";
import { formatDate } from "@/lib/ticket-meta";
import type { RequesterFilter } from "./types";

type RequesterTicketListProps = {
  filter: RequesterFilter;
  tickets: UserTicket[];
  visibleTickets: UserTicket[];
  loading: boolean;
  stationNames: Map<string, string>;
  problemTypeNames: Map<string, string>;
  onRefresh: () => void;
  onViewAll: () => void;
  onCreateTicket: () => void;
};

const listTitles: Record<RequesterFilter, string> = {
  all: "Your requests",
  attention: "Requests needing attention",
  handling: "Requests being handled",
};

const listSubtitles: Record<RequesterFilter, string> = {
  all: "Track updates on the support issues you have reported.",
  attention: "Requests that are queued, reopened, or waiting for your reply.",
  handling: "Requests an IT officer is working on right now.",
};

export function RequesterTicketList({
  filter,
  tickets,
  visibleTickets,
  loading,
  stationNames,
  problemTypeNames,
  onRefresh,
  onViewAll,
  onCreateTicket,
}: RequesterTicketListProps) {
  const titleId = useId();
  const activeCount = tickets.filter((ticket) => !["RESOLVED", "CLOSED"].includes(ticket.status)).length;
  const emptyTitle = loading ? "Loading your requests…" : tickets.length ? "No requests match this view" : "No tickets yet";
  const emptyBody = loading
    ? "Your support requests will appear here."
    : tickets.length
      ? "Try another summary card to view your requests."
      : "When you need help, create a ticket and track it here.";

  return (
    <section aria-labelledby={titleId} className="scroll-destination" id="requester-tickets">
      <p aria-live="polite" className="sr-only" role="status">
        {loading
          ? "Loading your requests."
          : `${visibleTickets.length} request${visibleTickets.length === 1 ? "" : "s"} shown.`}
      </p>
      <Card>
        <CardHeader
          actions={
            <Button
              disabled={loading}
              leadingIcon={<RefreshIcon size={14} />}
              loading={loading}
              onClick={onRefresh}
              size="sm"
              type="button"
              variant="secondary"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
          }
          subtitle={listSubtitles[filter]}
          title={
            <span className="inline-flex items-center gap-2">
              {listTitles[filter]}
              <span className="count-pill">{visibleTickets.length}</span>
            </span>
          }
          titleId={titleId}
        />
        <CardBody flush>
          {visibleTickets.length > 0 ? (
            <>
              <ul className="divide-y divide-line md:hidden">
                {visibleTickets.map((ticket) => (
                  <li className="px-4 py-4" key={ticket.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="ticket-id">{ticket.ticket_number}</p>
                        <p
                          className="mt-1 line-clamp-2 break-words text-sm font-semibold text-ink"
                          title={ticket.description}
                        >
                          {ticket.description}
                        </p>
                      </div>
                      <StatusBadge status={ticket.status} />
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div className="min-w-0">
                        <dt className="text-caption">Issue</dt>
                        <dd className="mt-1 break-words font-medium text-ink-soft">
                          {ticket.problem_type_name || problemTypeNames.get(ticket.problem_type) || "Support request"}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-caption">Location</dt>
                        <dd className="mt-1 break-words font-medium text-ink-soft">
                          {ticket.station_name || stationNames.get(ticket.station) || "Location"}
                        </dd>
                      </div>
                    </dl>
                    <p className="inline-meta mt-3">
                      <ClockIcon size={12} />
                      Updated {formatDate(ticket.updated_at)}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="table-wrap hidden md:block">
                <table className="data-table min-w-[680px]">
                  <caption className="sr-only">{listTitles[filter]}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Ticket</th>
                      <th scope="col">Issue</th>
                      <th scope="col">Location</th>
                      <th scope="col">Status</th>
                      <th scope="col">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTickets.map((ticket) => (
                      <tr key={ticket.id}>
                        <td>
                          <div className="cell-stack">
                            <span className="ticket-id">{ticket.ticket_number}</span>
                            <span className="cell-primary line-clamp-2 max-w-sm">{ticket.description}</span>
                          </div>
                        </td>
                        <td>{ticket.problem_type_name || problemTypeNames.get(ticket.problem_type) || "Support request"}</td>
                        <td className="text-ink-muted">
                          {ticket.station_name || stationNames.get(ticket.station) || "Location"}
                        </td>
                        <td>
                          <StatusBadge status={ticket.status} />
                        </td>
                        <td className="whitespace-nowrap text-ink-muted">{formatDate(ticket.updated_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <EmptyState
              action={
                loading ? undefined : tickets.length ? (
                  <Link
                    className="btn btn--secondary btn--sm"
                    href="/?view=requester&destination=all"
                    onClick={onViewAll}
                    scroll={false}
                  >
                    View all requests
                  </Link>
                ) : (
                  <Button onClick={onCreateTicket} size="sm" type="button" variant="primary">
                    Create your first ticket
                  </Button>
                )
              }
              body={emptyBody}
              icon={
                loading ? <Spinner size={20} /> : tickets.length ? <FilterIcon size={20} /> : <InboxIcon size={20} />
              }
              title={emptyTitle}
            />
          )}
        </CardBody>
        <CardFooter>
          <p className="inline-meta">
            <ActivityIcon size={13} />
            {activeCount} active request{activeCount === 1 ? "" : "s"}
          </p>
          <p className="text-caption">
            Showing {visibleTickets.length} of {tickets.length}
          </p>
        </CardFooter>
      </Card>
    </section>
  );
}
