"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIcon, AlertCircleIcon, Button, ErrorAlert, PlusIcon, StatCard, TicketIcon, XIcon } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { AppShell, type AppNavSection } from "@/components/layout/AppShell";
import {
  getAccessibleTickets,
  getTicketOptions,
  type ApiUser,
  type TicketOptions,
  type UserTicket,
} from "@/lib/api";
import { RequesterTicketForm } from "./RequesterTicketForm";
import { RequesterTicketList } from "./RequesterTicketList";
import { WelcomeCarousel } from "./WelcomeCarousel";
import {
  isRequesterFilter,
  requesterFilterFromUrl,
  scrollToRequesterDestination,
  type RequesterFilter,
} from "./types";

const attentionStatuses = ["QUEUED", "WAITING_USER", "REOPENED"];
const handlingStatuses = ["IN_PROGRESS"];

export function RequesterDashboard({ user, onLogout }: { user: ApiUser; onLogout: () => void }) {
  const toast = useToast();
  const [tickets, setTickets] = useState<UserTicket[]>([]);
  const [options, setOptions] = useState<TicketOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [requestFilter, setRequestFilter] = useState<RequesterFilter>(() => {
    if (typeof window === "undefined") return "all";
    return requesterFilterFromUrl(window.location.search);
  });
  const requestId = useRef(0);
  const formScrollRequested = useRef(false);
  const previousFilter = useRef<RequesterFilter | null>(null);

  const loadDashboard = useCallback(async () => {
    const currentRequest = ++requestId.current;
    try {
      setError(null);
      setLoading(true);
      const [nextTickets, nextOptions] = await Promise.all([getAccessibleTickets(), getTicketOptions()]);
      if (currentRequest !== requestId.current) return;
      setTickets(nextTickets);
      setOptions(nextOptions);
    } catch (caught) {
      if (currentRequest === requestId.current) {
        setError(caught instanceof Error ? caught.message : "Unable to load your dashboard.");
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);
    return () => {
      window.clearTimeout(loadTimer);
      requestId.current += 1;
    };
  }, [loadDashboard]);

  useEffect(() => {
    const syncRequestFilter = () => {
      setRequestFilter(requesterFilterFromUrl(window.location.search));
    };
    window.addEventListener("popstate", syncRequestFilter);
    return () => window.removeEventListener("popstate", syncRequestFilter);
  }, []);

  useEffect(() => {
    const lastFilter = previousFilter.current;
    if (lastFilter === requestFilter) return;
    previousFilter.current = requestFilter;
    if (lastFilter === null && requestFilter === "all") return;
    scrollToRequesterDestination("requester-tickets");
  }, [requestFilter]);

  useEffect(() => {
    if (!showForm || !formScrollRequested.current) return;
    formScrollRequested.current = false;
    scrollToRequesterDestination("requester-ticket-form");
  }, [showForm]);

  const stationNames = new Map((options?.stations ?? []).map((item) => [item.id, item.name] as const));
  const problemTypeNames = new Map((options?.problem_types ?? []).map((item) => [item.id, item.name] as const));
  const waitingTickets = tickets.filter((ticket) => attentionStatuses.includes(ticket.status));
  const handlingTickets = tickets.filter((ticket) => handlingStatuses.includes(ticket.status));
  const visibleTickets =
    requestFilter === "attention" ? waitingTickets : requestFilter === "handling" ? handlingTickets : tickets;

  function openTicketForm() {
    if (showForm) {
      scrollToRequesterDestination("requester-ticket-form");
      return;
    }
    formScrollRequested.current = true;
    setShowForm(true);
  }

  function closeTicketForm() {
    setShowForm(false);
  }

  function selectFilter(nextFilter: RequesterFilter) {
    setRequestFilter(nextFilter);
    if (requestFilter === nextFilter) scrollToRequesterDestination("requester-tickets");
  }

  function handleNavigate(id: string) {
    if (!isRequesterFilter(id)) return;
    selectFilter(id);
  }

  const navSections: AppNavSection[] = [
    {
      label: "My workspace",
      items: [
        { id: "all", label: "My tickets", icon: <TicketIcon size={16} />, count: tickets.length },
        {
          id: "attention",
          label: "Needs attention",
          icon: <AlertCircleIcon size={16} />,
          count: waitingTickets.length,
        },
        {
          id: "handling",
          label: "In progress",
          icon: <ActivityIcon size={16} />,
          count: handlingTickets.length,
        },
      ],
    },
  ];

  return (
    <AppShell
      activeItem={requestFilter}
      contextLabel="Requester portal"
      navSections={navSections}
      onNavigate={handleNavigate}
      onSignOut={onLogout}
      pageTitle="My tickets"
      topbarActions={
        <Button
          aria-controls="requester-ticket-form"
          aria-expanded={showForm}
          leadingIcon={showForm ? <XIcon size={14} /> : <PlusIcon size={14} />}
          onClick={showForm ? closeTicketForm : openTicketForm}
          size="sm"
          type="button"
          variant={showForm ? "secondary" : "primary"}
        >
          {showForm ? "Close form" : "New ticket"}
        </Button>
      }
      user={user}
    >
      <div className="page-stack">
        <div className="page-heading">
          <div className="page-heading__text">
            <p className="eyebrow">Your workspace</p>
            <h1 className="page-title break-words">Welcome back, {user.first_name || user.username}</h1>
            <p className="page-subtitle">
              Track your IT requests, start a new one, and see what needs your attention.
            </p>
          </div>
        </div>

        <WelcomeCarousel onStartRequest={openTicketForm} />

        {error ? (
          <ErrorAlert message={error} onRetry={() => void loadDashboard()} retryLabel="Retry" />
        ) : null}

        <RequesterTicketForm
          onClose={closeTicketForm}
          onError={setError}
          onSubmitted={(ticket) => {
            toast.success(
              `Ticket ${ticket.ticket_number} submitted`,
              "The IT team has it. Track progress in My tickets.",
            );
            void loadDashboard();
          }}
          open={showForm}
          options={options}
        />

        <section aria-labelledby="requester-overview-heading">
          <div className="stack stack--sm">
            <div>
              <p className="eyebrow">At a glance</p>
              <h2 className="section-heading mt-1" id="requester-overview-heading">
                Your support requests
              </h2>
            </div>
            <div className="stat-grid sm:grid-cols-3">
              <StatCard
                href="/?view=requester&destination=all"
                icon={<TicketIcon size={15} />}
                label="Total requests"
                meta="All time"
                onClick={() => selectFilter("all")}
                tone="brand"
                value={String(tickets.length)}
              />
              <StatCard
                href="/?view=requester&destination=attention"
                icon={<AlertCircleIcon size={15} />}
                label="Need attention"
                meta="Waiting or reopened"
                onClick={() => selectFilter("attention")}
                tone="warning"
                value={String(waitingTickets.length)}
              />
              <StatCard
                className="col-span-2 sm:col-span-1"
                href="/?view=requester&destination=handling"
                icon={<ActivityIcon size={15} />}
                label="Being handled"
                meta="Currently in progress"
                onClick={() => selectFilter("handling")}
                tone="info"
                value={String(handlingTickets.length)}
              />
            </div>
          </div>
        </section>

        <RequesterTicketList
          filter={requestFilter}
          loading={loading}
          onCreateTicket={openTicketForm}
          onRefresh={() => void loadDashboard()}
          onViewAll={() => selectFilter("all")}
          problemTypeNames={problemTypeNames}
          stationNames={stationNames}
          tickets={tickets}
          visibleTickets={visibleTickets}
        />
      </div>
    </AppShell>
  );
}
