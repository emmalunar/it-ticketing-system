"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  claimTicket,
  getAccessibleTickets,
  getTicketOptions,
  transferTicket,
  type ApiUser,
  type TicketOptions,
  type UserTicket,
} from "@/lib/api";
import { cn } from "@/lib/cn";
import { AppShell, type AppNavSection } from "@/components/layout/AppShell";
import { TicketAttachments } from "@/components/tickets/TicketAttachments";
import { Badge, PriorityBadge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Alert, EmptyState, ErrorAlert, Skeleton, Spinner } from "@/components/ui/Feedback";
import { SelectField, TextField } from "@/components/ui/Form";
import { Segmented } from "@/components/ui/Segmented";
import { StatCard } from "@/components/ui/StatCard";
import {
  ActivityIcon,
  AlertTriangleIcon,
  BuildingIcon,
  ClockIcon,
  InboxIcon,
  MapPinIcon,
  QueueIcon,
  RefreshIcon,
  SparklesIcon,
  UserIcon,
} from "@/components/ui/icons";

type OfficerFilter = "all" | "waiting" | "critical" | "active";

type OfficerTicket = {
  id: string;
  number: string;
  title: string;
  station: string;
  stationId: string;
  priority: "P1" | "P2" | "P3";
  status: string;
  age: string;
  owner: string;
};

type Summary = { p1_count: number; p2_count: number; p3_count: number };

const OFFICER_FILTERS: readonly OfficerFilter[] = ["all", "waiting", "critical", "active"];

const FILTER_OPTIONS: { value: OfficerFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "waiting", label: "Waiting" },
  { value: "critical", label: "P1 critical" },
  { value: "active", label: "Active" },
];

const PAGE_TITLES: Record<OfficerFilter, string> = {
  all: "Ticket queue",
  waiting: "Waiting now",
  critical: "P1 critical",
  active: "Active tickets",
};

const PAGE_SUBTITLES: Record<OfficerFilter, string> = {
  all: "Triage requests across your stations, prioritised by urgency and arrival time.",
  waiting: "Unclaimed P2 and P3 requests that are ready for an officer to pick up.",
  critical: "Active P1 requests that need immediate handling from your team.",
  active: "Tickets you are currently handling or waiting on the requester for.",
};

const QUEUE_TITLES: Record<OfficerFilter, string> = {
  all: "Station queue",
  waiting: "Unclaimed P2 and P3 queue",
  critical: "P1 tickets requiring handling",
  active: "Tickets assigned to you",
};

const EMPTY_TITLES: Record<OfficerFilter, string> = {
  all: "All clear for now",
  waiting: "No unclaimed P2 or P3 tickets",
  critical: "No active P1 tickets",
  active: "No active tickets assigned to you",
};

const ACTIVE_STATUSES = new Set(["QUEUED", "IN_PROGRESS", "WAITING_USER", "REOPENED"]);
const CLAIMABLE_STATUSES = new Set(["QUEUED", "REOPENED"]);
const CLOSED_STATUSES = new Set(["RESOLVED", "CLOSED"]);

function isOfficerFilter(value: string): value is OfficerFilter {
  return (OFFICER_FILTERS as readonly string[]).includes(value);
}

function formatAge(createdAt: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function summarizeTickets(tickets: UserTicket[]): Summary {
  return {
    p1_count: tickets.filter((ticket) => ticket.priority === "P1" && ACTIVE_STATUSES.has(ticket.status)).length,
    p2_count: tickets.filter((ticket) => ticket.priority === "P2" && ticket.status === "QUEUED").length,
    p3_count: tickets.filter((ticket) => ticket.priority === "P3" && ticket.status === "QUEUED").length,
  };
}

function mapOfficerTicket(
  ticket: UserTicket,
  stationNames: Map<string, string>,
  currentUserId: string,
): OfficerTicket {
  return {
    id: ticket.id,
    number: ticket.ticket_number,
    title: ticket.description,
    station: ticket.station_name || stationNames.get(ticket.station) || "Station",
    stationId: ticket.station,
    priority: ticket.priority,
    status: ticket.status,
    age: formatAge(ticket.created_at),
    owner: ticket.assignee === currentUserId
      ? "You"
      : ticket.assignee_name || (ticket.assignee ? "Assigned" : "Unassigned"),
  };
}

function initialOfficerFilter(): OfficerFilter {
  if (typeof window === "undefined") return "all";
  const params = new URLSearchParams(window.location.search);
  const destination = params.get("view") === "officer" ? params.get("destination") : null;
  return destination === "waiting" || destination === "critical" || destination === "active"
    ? destination
    : "all";
}

function scrollToOfficerQueue() {
  requestAnimationFrame(() => {
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    document.getElementById("officer-queue")?.scrollIntoView({ behavior, block: "start" });
  });
}

export function OfficerDashboard({ user, onLogout }: { user: ApiUser; onLogout: () => void }) {
  const [tickets, setTickets] = useState<OfficerTicket[]>([]);
  const [activeTickets, setActiveTickets] = useState<OfficerTicket[]>([]);
  const [records, setRecords] = useState<UserTicket[]>([]);
  const [options, setOptions] = useState<TicketOptions | null>(null);
  const [officerFilter, setOfficerFilter] = useState<OfficerFilter>(initialOfficerFilter);
  const [showRecords, setShowRecords] = useState(true);
  const [claimedNotice, setClaimedNotice] = useState<OfficerTicket | null>(null);
  const [selected, setSelected] = useState<OfficerTicket | null>(null);
  const [summary, setSummary] = useState<Summary>({ p1_count: 0, p2_count: 0, p3_count: 0 });
  const [activeWorkload, setActiveWorkload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferStationId, setTransferStationId] = useState("");
  const [transferAgentId, setTransferAgentId] = useState("");
  const [transferReason, setTransferReason] = useState("");

  const dashboardRequestId = useRef(0);
  const officerFilterRef = useRef(officerFilter);
  const previousOfficerFilter = useRef(officerFilter);

  useEffect(() => {
    officerFilterRef.current = officerFilter;
  }, [officerFilter]);

  const loadDashboard = useCallback(async () => {
    const requestId = ++dashboardRequestId.current;
    try {
      setError(null);
      setLoading(true);
      const [accessibleTickets, ticketOptions] = await Promise.all([
        getAccessibleTickets(),
        getTicketOptions(),
      ]);
      if (requestId !== dashboardRequestId.current) return;

      setOptions(ticketOptions);
      setRecords(accessibleTickets.filter((ticket) => ticket.assigned_by_me));
      const queueSummary = summarizeTickets(accessibleTickets);
      setActiveWorkload(
        accessibleTickets.filter(
          (ticket) =>
            ticket.assignee === user.id && ["IN_PROGRESS", "WAITING_USER"].includes(ticket.status),
        ).length,
      );

      const stationNames = new Map<string, string>(
        user.stations.map((station) => [station.id, station.name]),
      );
      const mappedUrgent = accessibleTickets
        .filter((ticket) => ticket.priority === "P1" && ACTIVE_STATUSES.has(ticket.status))
        .map((ticket) => mapOfficerTicket(ticket, stationNames, user.id));
      const mappedQueue = accessibleTickets
        .filter((ticket) => ticket.status === "QUEUED" && ["P2", "P3"].includes(ticket.priority))
        .map((ticket) => ({
          item: mapOfficerTicket(ticket, stationNames, user.id),
          createdAt: ticket.created_at,
        }))
        .sort((left, right) => {
          const priorityOrder = left.item.priority.localeCompare(right.item.priority);
          return priorityOrder || Date.parse(left.createdAt) - Date.parse(right.createdAt);
        })
        .map(({ item }) => item);
      const mappedActive = accessibleTickets
        .filter(
          (ticket) =>
            ticket.assignee === user.id && ["IN_PROGRESS", "WAITING_USER"].includes(ticket.status),
        )
        .map((ticket) => mapOfficerTicket(ticket, stationNames, user.id));
      const mapped = [...mappedUrgent, ...mappedQueue];

      setTickets(mapped);
      setActiveTickets(mappedActive);

      const currentFilter = officerFilterRef.current;
      const initiallyVisible = currentFilter === "active"
        ? mappedActive
        : currentFilter === "waiting"
          ? mapped.filter(
              (ticket) =>
                ["P2", "P3"].includes(ticket.priority) &&
                ticket.status === "QUEUED" &&
                ticket.owner === "Unassigned",
            )
          : currentFilter === "critical"
            ? mapped.filter(
                (ticket) =>
                  ticket.priority === "P1" && ACTIVE_STATUSES.has(ticket.status),
              )
            : mapped;
      setSelected(
        (current) =>
          initiallyVisible.find((ticket) => ticket.id === current?.id) ??
          initiallyVisible[0] ??
          null,
      );
      setSummary(queueSummary);
    } catch (caught) {
      if (requestId === dashboardRequestId.current) {
        setError(caught instanceof Error ? caught.message : "Unable to load your dashboard.");
      }
    } finally {
      if (requestId === dashboardRequestId.current) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);
    return () => {
      window.clearTimeout(loadTimer);
      dashboardRequestId.current += 1;
    };
  }, [loadDashboard]);

  useEffect(() => {
    const syncOfficerFilter = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("view") === "officer") {
        const destination = params.get("destination");
        if (destination === "waiting" || destination === "critical" || destination === "active") {
          setOfficerFilter(destination);
          return;
        }
      }
      setOfficerFilter("all");
    };
    window.addEventListener("popstate", syncOfficerFilter);
    return () => window.removeEventListener("popstate", syncOfficerFilter);
  }, []);

  useEffect(() => {
    const previousFilter = previousOfficerFilter.current;
    previousOfficerFilter.current = officerFilter;
    if (previousFilter !== officerFilter) scrollToOfficerQueue();
  }, [officerFilter]);

  const officerTickets = officerFilter === "waiting"
    ? tickets.filter(
        (ticket) =>
          ["P2", "P3"].includes(ticket.priority) &&
          ticket.status === "QUEUED" &&
          ticket.owner === "Unassigned",
      )
    : officerFilter === "critical"
      ? tickets.filter(
          (ticket) => ticket.priority === "P1" && ACTIVE_STATUSES.has(ticket.status),
        )
      : officerFilter === "active"
        ? activeTickets
        : tickets;

  const displayedSelected =
    officerTickets.find((ticket) => ticket.id === selected?.id) ?? officerTickets[0] ?? null;

  function navigateToOfficerFilter(filter: OfficerFilter) {
    setOfficerFilter(filter);
    if (officerFilter === filter) scrollToOfficerQueue();
  }

  function refreshDashboard() {
    void loadDashboard();
  }

  async function handleClaim(ticket: OfficerTicket | null = selected) {
    if (!ticket || claiming) return;
    setClaiming(true);
    try {
      const claimedTicket = await claimTicket(ticket.id);
      const mappedTicket = mapOfficerTicket(
        claimedTicket,
        new Map(user.stations.map((station) => [station.id, station.name])),
        user.id,
      );
      setTickets((current) =>
        claimedTicket.priority === "P1"
          ? current.map((item) => (item.id === mappedTicket.id ? mappedTicket : item))
          : current.filter((item) => item.id !== mappedTicket.id),
      );
      setActiveTickets((current) => [
        mappedTicket,
        ...current.filter((item) => item.id !== mappedTicket.id),
      ]);
      setRecords((current) => [
        claimedTicket,
        ...current.filter((item) => item.id !== claimedTicket.id),
      ]);
      setClaimedNotice(mappedTicket);
      setSummary((current) => ({
        ...current,
        p2_count: Math.max(0, current.p2_count - (claimedTicket.priority === "P2" ? 1 : 0)),
        p3_count: Math.max(0, current.p3_count - (claimedTicket.priority === "P3" ? 1 : 0)),
      }));
      setActiveWorkload((current) => current + 1);
      setSelected(mappedTicket);
      setOfficerFilter("active");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to claim this ticket.");
    } finally {
      setClaiming(false);
    }
  }

  async function handleTransfer(ticket: OfficerTicket | null = selected) {
    if (!ticket || !transferStationId || transferring) return;
    setTransferring(true);
    try {
      await transferTicket(ticket.id, {
        station: transferStationId,
        agent: transferAgentId || undefined,
        reason: transferReason,
      });
      setTransferStationId("");
      setTransferAgentId("");
      setTransferReason("");
      await loadDashboard();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to transfer this ticket.");
    } finally {
      setTransferring(false);
    }
  }

  const initialLoading = loading && options === null;
  const pageTitle = PAGE_TITLES[officerFilter];
  const pageSubtitle = PAGE_SUBTITLES[officerFilter];
  const queueTitle = QUEUE_TITLES[officerFilter];
  const queueSubtitle =
    officerFilter === "active"
      ? "In progress or awaiting the user"
      : "Prioritised by urgency, then arrival time";
  const emptyTitle = EMPTY_TITLES[officerFilter];
  const emptyBody = officerFilter === "all"
    ? "New requests for your stations will appear here as soon as they arrive."
    : "There are no tickets in this view right now.";
  const stationLabel = user.stations.map((station) => station.name).join(", ") || "All stations";

  const filterCounts: Record<OfficerFilter, number> = {
    all: tickets.length,
    waiting: summary.p2_count + summary.p3_count,
    critical: summary.p1_count,
    active: activeWorkload,
  };
  const filterOptions = FILTER_OPTIONS.map((option) => ({
    ...option,
    count: filterCounts[option.value],
  }));

  const navSections: AppNavSection[] = [
    {
      label: "Workspace",
      items: [
        {
          id: "all",
          label: "All queue",
          icon: <QueueIcon size={16} />,
          count: tickets.length,
        },
        {
          id: "waiting",
          label: "Waiting",
          icon: <ClockIcon size={16} />,
          count: summary.p2_count + summary.p3_count,
        },
        {
          id: "critical",
          label: "P1 critical",
          icon: <AlertTriangleIcon size={16} />,
          count: summary.p1_count,
        },
        {
          id: "active",
          label: "Active",
          icon: <ActivityIcon size={16} />,
          count: activeWorkload,
        },
      ],
    },
  ];

  const claimableStatus = displayedSelected
    ? CLAIMABLE_STATUSES.has(displayedSelected.status)
    : false;
  const canClaim = displayedSelected?.owner === "Unassigned" && claimableStatus;
  const claimLabel = claiming
    ? "Claiming…"
    : canClaim
      ? "Claim ticket"
      : displayedSelected?.owner === "Unassigned"
        ? "Not claimable"
        : "Ticket assigned";

  return (
    <AppShell
      user={user}
      navSections={navSections}
      activeItem={officerFilter}
      onNavigate={(id) => {
        if (isOfficerFilter(id)) navigateToOfficerFilter(id);
      }}
      onSignOut={onLogout}
      contextLabel="IT officer workspace"
      pageTitle={pageTitle}
      serviceLabel="Django API connected"
      topbarActions={
        <Button
          type="button"
          size="sm"
          variant="secondary"
          leadingIcon={<RefreshIcon size={14} />}
          loading={loading}
          onClick={refreshDashboard}
          aria-label="Refresh ticket queue"
        >
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      }
    >
      <div className="page-stack">
        <header className="page-heading">
          <div className="page-heading__text">
            <p className="eyebrow">Live station overview</p>
            <h1 className="page-title">{pageTitle}</h1>
            <p className="page-subtitle">{pageSubtitle}</p>
            <span className="inline-meta">
              <BuildingIcon size={13} />
              <span className="break-anywhere">{stationLabel}</span>
            </span>
          </div>
          <div className="page-heading__actions">
            <Segmented
              options={filterOptions}
              value={officerFilter}
              onChange={navigateToOfficerFilter}
              ariaLabel="Filter ticket queue"
            />
          </div>
        </header>

        {error ? <ErrorAlert message={error} onRetry={refreshDashboard} retryLabel="Retry" /> : null}

        <div aria-live="polite" aria-atomic="true">
          {claimedNotice ? (
            <Alert tone="success" title="Ticket assigned to you">
              <div className="cluster cluster--between">
                <div className="grow min-w-0">
                  <p className="break-anywhere font-semibold">
                    {claimedNotice.number} · {claimedNotice.title}
                  </p>
                  <div className="cluster mt-2">
                    <span className="inline-meta">
                      <MapPinIcon size={12} />
                      {claimedNotice.station}
                    </span>
                    <PriorityBadge priority={claimedNotice.priority} />
                    <StatusBadge status={claimedNotice.status} />
                  </div>
                </div>
                <Badge tone="success" dot>Owner: You</Badge>
              </div>
            </Alert>
          ) : null}
        </div>

        <div className="stat-grid">
          <StatCard
            label="Waiting now"
            value={initialLoading ? "…" : String(summary.p2_count + summary.p3_count)}
            meta="P2 and P3 in queue"
            tone="warning"
            icon={<ClockIcon size={16} />}
            href="/?view=officer&destination=waiting"
            onClick={() => navigateToOfficerFilter("waiting")}
          />
          <StatCard
            label="P1 critical"
            value={initialLoading ? "…" : String(summary.p1_count)}
            meta="Immediate handling"
            tone="danger"
            icon={<AlertTriangleIcon size={16} />}
            href="/?view=officer&destination=critical"
            onClick={() => navigateToOfficerFilter("critical")}
          />
          <StatCard
            label="Active tickets"
            value={initialLoading ? "…" : String(activeWorkload)}
            meta="Assigned for handling"
            tone="brand"
            icon={<ActivityIcon size={16} />}
            href="/?view=officer&destination=active"
            onClick={() => navigateToOfficerFilter("active")}
          />
          <StatCard
            label="Queue status"
            value={loading ? "…" : "Live"}
            meta="Django API connected"
            icon={loading ? <Spinner size={14} /> : <ActivityIcon size={16} />}
          />
        </div>

        <section aria-labelledby="officer-records-title" aria-busy={loading || undefined}>
          <Card>
            <CardHeader
              title="Your ticket records"
              titleId="officer-records-title"
              subtitle={
                initialLoading
                  ? "Loading your claimed tickets…"
                  : `${records.length} ticket${records.length === 1 ? "" : "s"} claimed by you`
              }
              actions={
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  aria-expanded={showRecords}
                  aria-controls="officer-records-list"
                  onClick={() => setShowRecords((current) => !current)}
                >
                  {showRecords ? "Hide records" : "View records"}
                </Button>
              }
            />
            {showRecords ? (
              <div id="officer-records-list">
                {initialLoading ? (
                  <div className="stack p-4" aria-hidden="true">
                    {[0, 1, 2].map((index) => (
                      <Skeleton key={index} style={{ height: 34, borderRadius: 8 }} />
                    ))}
                  </div>
                ) : records.length ? (
                  <ul className="record-list">
                    {records.slice(0, 5).map((record) => (
                      <li className="record-list__item" key={record.id}>
                        <div className="record-list__top">
                          <div className="min-w-0">
                            <p className="text-caption">
                              <span className="mono">{record.ticket_number}</span>
                              <span> · {record.station_name}</span>
                            </p>
                            <p className="mt-1 line-clamp-2 text-sm font-medium text-ink">
                              {record.description}
                            </p>
                          </div>
                          <StatusBadge status={record.status} />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    compact
                    inline
                    icon={<InboxIcon size={18} />}
                    title="No ticket records yet"
                    body="Tickets you claim will appear here."
                  />
                )}
              </div>
            ) : null}
          </Card>
        </section>

        <div className="layout-main-aside">
          <section
            id="officer-queue"
            className="scroll-destination min-w-0"
            aria-labelledby="officer-queue-title"
            aria-busy={loading || undefined}
          >
            <Card>
              <CardHeader
                title={
                  <span className="cluster">
                    {queueTitle}
                    <span className="count-pill">{officerTickets.length}</span>
                  </span>
                }
                titleId="officer-queue-title"
                subtitle={queueSubtitle}
                actions={
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    leadingIcon={<RefreshIcon size={14} />}
                    loading={loading}
                    onClick={refreshDashboard}
                  >
                    Refresh
                  </Button>
                }
              />

              {initialLoading ? (
                <div role="status" aria-label="Loading ticket queue">
                  <div className="stack p-4" aria-hidden="true">
                    {[0, 1, 2, 3].map((index) => (
                      <div className="cluster cluster--between" key={index}>
                        <div className="grow stack stack--sm">
                          <Skeleton className="skeleton--text" style={{ width: "28%" }} />
                          <Skeleton style={{ height: 14, width: "72%" }} />
                          <Skeleton className="skeleton--text" style={{ width: "44%" }} />
                        </div>
                        <Skeleton style={{ height: 22, width: 62, borderRadius: 999 }} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <ul className="md:hidden" aria-label={queueTitle}>
                    {officerTickets.map((ticket) => {
                      const isSelected = displayedSelected?.id === ticket.id;
                      return (
                        <li className="border-b border-line last:border-b-0" key={ticket.id}>
                          <button
                            type="button"
                            aria-pressed={isSelected}
                            aria-label={`Select ticket ${ticket.number}`}
                            className={cn(
                              "w-full px-4 py-3 text-left transition-colors",
                              isSelected ? "bg-brand-soft" : "hover:bg-surface-muted",
                            )}
                            onClick={() => setSelected(ticket)}
                          >
                            <span className="flex items-start justify-between gap-3">
                              <span className="min-w-0">
                                <span className="mono block text-ink-muted">{ticket.number}</span>
                                <span className="mt-1 block truncate text-sm font-semibold text-ink">
                                  {ticket.title}
                                </span>
                              </span>
                              <PriorityBadge priority={ticket.priority} />
                            </span>
                            <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                              <StatusBadge status={ticket.status} />
                              <span className="inline-meta">
                                <MapPinIcon size={12} />
                                {ticket.station}
                              </span>
                              <span className="inline-meta">
                                <UserIcon size={12} />
                                {ticket.owner}
                              </span>
                              <span className="inline-meta ml-auto">
                                <ClockIcon size={12} />
                                {ticket.age} ago
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="hidden md:block">
                    <div className="table-wrap">
                      <table className="data-table min-w-[680px]">
                        <thead>
                          <tr>
                            <th scope="col">Ticket</th>
                            <th scope="col">Priority</th>
                            <th scope="col">Station</th>
                            <th scope="col">Status</th>
                            <th scope="col">Owner</th>
                          </tr>
                        </thead>
                        <tbody>
                          {officerTickets.map((ticket) => {
                            const isSelected = displayedSelected?.id === ticket.id;
                            return (
                              <tr
                                className={cn(isSelected && "bg-brand-soft hover:bg-brand-soft")}
                                key={ticket.id}
                              >
                                <td>
                                  <button
                                    type="button"
                                    aria-pressed={isSelected}
                                    aria-label={`Select ticket ${ticket.number}`}
                                    className="w-full text-left"
                                    onClick={() => setSelected(ticket)}
                                  >
                                    <span className="mono block text-ink-muted">{ticket.number}</span>
                                    <span className="mt-1 block max-w-[260px] truncate text-sm font-semibold text-ink">
                                      {ticket.title}
                                    </span>
                                    <span className="mt-1 block text-meta">
                                      Opened {ticket.age} ago
                                    </span>
                                  </button>
                                </td>
                                <td><PriorityBadge priority={ticket.priority} /></td>
                                <td className="text-ink-soft">{ticket.station}</td>
                                <td><StatusBadge status={ticket.status} /></td>
                                <td className="text-ink-soft">{ticket.owner}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {!loading && officerTickets.length === 0 ? (
                    <EmptyState
                      icon={<InboxIcon size={20} />}
                      title={emptyTitle}
                      body={emptyBody}
                    />
                  ) : null}
                </>
              )}
            </Card>
          </section>

          <aside
            className="rail"
            aria-label="Selected ticket details"
            aria-labelledby={
              !initialLoading && displayedSelected ? "officer-detail-title" : undefined
            }
          >
            {initialLoading ? (
              <Card>
                <CardBody>
                  <div className="stack" role="status" aria-label="Loading selected ticket">
                    <div className="stack" aria-hidden="true">
                      <Skeleton className="skeleton--text" style={{ width: "40%" }} />
                      <Skeleton style={{ height: 22, width: "64%" }} />
                      <Skeleton style={{ height: 14, width: "100%" }} />
                      <Skeleton style={{ height: 14, width: "82%" }} />
                      <Skeleton style={{ height: 150, borderRadius: 10 }} />
                      <Skeleton style={{ height: 38, borderRadius: 8 }} />
                    </div>
                  </div>
                </CardBody>
              </Card>
            ) : displayedSelected ? (
              <Card>
                <CardBody>
                  <div className="stack stack--lg">
                    <div>
                      <div className="cluster cluster--between">
                        <p className="text-caption uppercase tracking-[0.12em]">Selected ticket</p>
                        <PriorityBadge priority={displayedSelected.priority} showLabel />
                      </div>
                      <h2 className="ticket-heading mt-2" id="officer-detail-title">
                        {displayedSelected.number}
                      </h2>
                      <p className="mt-2 whitespace-pre-line break-anywhere text-sm leading-6 text-ink-soft">
                        {displayedSelected.title}
                      </p>
                    </div>

                    <dl className="detail-list">
                      <div className="detail-row">
                        <dt className="detail-term">Station</dt>
                        <dd className="detail-desc">{displayedSelected.station}</dd>
                      </div>
                      <div className="detail-row">
                        <dt className="detail-term">Status</dt>
                        <dd className="detail-desc">
                          <StatusBadge status={displayedSelected.status} />
                        </dd>
                      </div>
                      <div className="detail-row">
                        <dt className="detail-term">Current owner</dt>
                        <dd className="detail-desc">
                          <Badge
                            tone={displayedSelected.owner === "You" ? "success" : "neutral"}
                            dot={displayedSelected.owner === "You"}
                            className="max-w-full whitespace-normal break-anywhere"
                          >
                            {displayedSelected.owner}
                          </Badge>
                        </dd>
                      </div>
                      <div className="detail-row">
                        <dt className="detail-term">Queue age</dt>
                        <dd className="detail-desc">{displayedSelected.age} ago</dd>
                      </div>
                    </dl>

                    <TicketAttachments
                      key={displayedSelected.id}
                      ticketId={displayedSelected.id}
                    />

                    <p className="text-meta leading-6">
                      {displayedSelected.owner === "Unassigned"
                        ? "Review the request and claim it when you’re ready to take ownership."
                        : "This request has an assigned owner. Review its current status and coordinate with the assigned team member."}
                    </p>

                    <Button
                      type="button"
                      variant="primary"
                      block
                      loading={claiming}
                      disabled={!canClaim}
                      onClick={() => void handleClaim(displayedSelected)}
                    >
                      {claimLabel}
                    </Button>

                    <div className="border-t border-line pt-4">
                      <form
                        className="stack"
                        onSubmit={(event) => {
                          event.preventDefault();
                          if (
                            !transferStationId ||
                            transferring ||
                            CLOSED_STATUSES.has(displayedSelected.status)
                          ) {
                            return;
                          }
                          void handleTransfer(displayedSelected);
                        }}
                      >
                        <div>
                          <h3 className="section-heading">Transfer ticket</h3>
                          <p className="mt-1 text-meta">
                            Move this request to another station or officer.
                          </p>
                        </div>
                        <SelectField
                          label="Transfer to station"
                          value={transferStationId}
                          onChange={(event) => {
                            setTransferStationId(event.target.value);
                            setTransferAgentId("");
                          }}
                        >
                          <option value="">Choose a station</option>
                          {options?.stations.map((station) => (
                            <option key={station.id} value={station.id}>
                              {station.name}
                            </option>
                          ))}
                        </SelectField>
                        {transferStationId ? (
                          <SelectField
                            label="Assign to officer"
                            optional
                            value={transferAgentId}
                            onChange={(event) => setTransferAgentId(event.target.value)}
                          >
                            <option value="">Leave in station queue</option>
                            {options?.officers
                              .filter(
                                (officer) =>
                                  officer.station === transferStationId &&
                                  officer.id !== user.id,
                              )
                              .map((officer) => (
                                <option key={officer.id} value={officer.id}>
                                  {officer.name}
                                </option>
                              ))}
                          </SelectField>
                        ) : null}
                        <TextField
                          label="Transfer reason"
                          optional
                          value={transferReason}
                          onChange={(event) => setTransferReason(event.target.value)}
                        />
                        <Button
                          type="submit"
                          variant="secondary"
                          block
                          loading={transferring}
                          disabled={
                            !transferStationId ||
                            CLOSED_STATUSES.has(displayedSelected.status)
                          }
                        >
                          {transferring ? "Transferring…" : "Transfer ticket"}
                        </Button>
                      </form>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ) : (
              <Card>
                <EmptyState
                  icon={<SparklesIcon size={20} />}
                  title="You’re all caught up"
                  body="Your queue is clear. When a request needs attention, you’ll find its details and next steps here."
                  action={<span className="service-indicator">System ready</span>}
                />
              </Card>
            )}
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
