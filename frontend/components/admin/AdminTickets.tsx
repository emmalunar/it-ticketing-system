"use client";

import type { TicketOptions, UserTicket } from "@/lib/api";
import { formatDateTime, statusLabel, ticketSummary } from "@/lib/ticket-meta";
import { Button, IconButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Feedback";
import { SearchInput, Select, SelectField, TextField } from "@/components/ui/Form";
import { PriorityBadge, StatusBadge } from "@/components/ui/Badge";
import { TicketIcon, XIcon } from "@/components/ui/icons";
import { TicketAttachments } from "@/components/tickets/TicketAttachments";

const exactStatuses = ["QUEUED", "IN_PROGRESS", "WAITING_USER", "REOPENED", "RESOLVED", "CLOSED"] as const;

export type AdminTicketsProps = {
  tickets: UserTicket[];
  allTicketCount: number;
  selectedTicket: UserTicket | null;
  options: TicketOptions | null;
  loading: boolean;
  working: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (value: string) => void;
  onManageTicket: (ticketId: string) => void;
  onClearSelection: () => void;
  onCloseTicket: (ticket: UserTicket) => void;
  transferStationId: string;
  transferReason: string;
  transferAgentId: string;
  onTransferStationChange: (value: string) => void;
  onTransferReasonChange: (value: string) => void;
  onTransferAgentChange: (value: string) => void;
  onClaimTicket: (ticket: UserTicket) => void;
  onTransferTicket: (ticket: UserTicket) => void;
};

function requesterName(ticket: UserTicket) {
  return ticket.requester_name || ticket.requester_username || "Requester";
}

export function AdminTickets({
  tickets,
  allTicketCount,
  selectedTicket,
  options,
  loading,
  working,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  onManageTicket,
  onClearSelection,
  onCloseTicket,
  transferStationId,
  transferReason,
  transferAgentId,
  onTransferStationChange,
  onTransferReasonChange,
  onTransferAgentChange,
  onClaimTicket,
  onTransferTicket,
}: AdminTicketsProps) {
  const transferable = selectedTicket
    ? Boolean(transferStationId) && !["RESOLVED", "CLOSED"].includes(selectedTicket.status)
    : false;
  const claimable = selectedTicket
    ? !selectedTicket.assignee && ["QUEUED", "REOPENED"].includes(selectedTicket.status)
    : false;
  const stationOfficers = options?.officers.filter(
    (officer) => officer.station === transferStationId,
  ) ?? [];

  function ticketActions(ticket: UserTicket) {
    return (
      <>
        <Button
          aria-label={`Manage ${ticket.ticket_number}`}
          onClick={() => onManageTicket(ticket.id)}
          size="sm"
          type="button"
          variant="secondary"
        >
          Manage
        </Button>
        {ticket.status !== "CLOSED" ? (
          <Button
            aria-label={`Close ${ticket.ticket_number}`}
            disabled={working}
            onClick={() => onCloseTicket(ticket)}
            size="sm"
            type="button"
            variant="danger"
          >
            Close
          </Button>
        ) : null}
      </>
    );
  }

  return (
    <Card className="scroll-destination" id="admin-tickets">
      <CardHeader
        actions={
          <span
            className="count-pill"
            title={`${tickets.length} of ${allTicketCount} records shown`}
          >
            {tickets.length}
          </span>
        }
        subtitle="Ticket history is retained; closing archives it from the active queue."
        title="All ticket records"
      />

      <div className="table-toolbar">
        <div className="table-toolbar__group">
          <div className="w-full sm:w-[300px]">
            <SearchInput
              autoComplete="off"
              label="Search tickets"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search tickets…"
              value={search}
            />
          </div>
        </div>
        <div className="table-toolbar__group table-toolbar__group--end">
          <div className="w-full sm:w-[182px]">
            <Select
              aria-label="Filter tickets by status"
              onChange={(event) => onStatusFilterChange(event.target.value)}
              value={statusFilter}
            >
              <option value="ALL">All statuses</option>
              <option value="OPEN">Open · waiting to be claimed</option>
              <option value="ACTIVE">Active · in progress or awaiting user</option>
              <option value="ACTIVE_QUEUE">All active queue statuses</option>
              {exactStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-full sm:w-[150px]">
            <Select
              aria-label="Filter tickets by priority"
              onChange={(event) => onPriorityFilterChange(event.target.value)}
              value={priorityFilter}
            >
              <option value="ALL">All priorities</option>
              {(["P1", "P2", "P3"] as const).map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                  {priority === "P1" ? " · Critical" : ""}
                </option>
              ))}
            </Select>
          </div>
          <p className="w-full text-meta sm:w-auto sm:whitespace-nowrap" role="status">
            {loading ? "Loading records…" : `${tickets.length} of ${allTicketCount} shown`}
          </p>
        </div>
      </div>

      {tickets.length ? (
        <>
          <div className="table-wrap hidden lg:block">
            <table aria-label="All ticket records" className="data-table min-w-[700px]">
              <caption className="visually-hidden">
                Ticket records with requester, location, priority, status, and management
                actions.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Ticket</th>
                  <th scope="col">Requester</th>
                  <th scope="col">Location / issue</th>
                  <th scope="col">Priority</th>
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <div className="cell-stack">
                        <span className="ticket-id">{ticket.ticket_number}</span>
                        <span
                          className="cell-primary max-w-[240px] truncate"
                          title={ticket.description}
                        >
                          {ticketSummary(ticket, 72)}
                        </span>
                      </div>
                    </td>
                    <td className="cell-meta">{requesterName(ticket)}</td>
                    <td>
                      <div className="cell-stack">
                        <span className="cell-primary max-w-[200px] truncate">
                          {ticket.station_name}
                        </span>
                        <span className="cell-meta max-w-[200px] truncate">
                          {ticket.problem_type_name}
                        </span>
                      </div>
                    </td>
                    <td>
                      <PriorityBadge priority={ticket.priority} />
                    </td>
                    <td>
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td>
                      <div className="cell-actions">{ticketActions(ticket)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul aria-label="Ticket records" className="record-list lg:hidden">
            {tickets.map((ticket) => (
              <li className="record-list__item" key={ticket.id}>
                <div className="record-list__top">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="ticket-id">{ticket.ticket_number}</span>
                      <StatusBadge status={ticket.status} />
                    </p>
                    <p className="mt-1 text-sm font-semibold text-ink">
                      {ticketSummary(ticket, 110)}
                    </p>
                  </div>
                  <PriorityBadge priority={ticket.priority} />
                </div>
                <div className="cluster text-meta">
                  <span>{requesterName(ticket)}</span>
                  <span className="dot-separator" aria-hidden="true" />
                  <span>{ticket.station_name}</span>
                  <span className="dot-separator" aria-hidden="true" />
                  <span>{ticket.problem_type_name}</span>
                </div>
                <div className="cell-actions">{ticketActions(ticket)}</div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyState
          body={
            loading
              ? undefined
              : "Adjust the search term, status, or priority filter to review other records."
          }
          icon={<TicketIcon size={20} />}
          title={loading ? "Loading tickets…" : "No tickets match your filters."}
        />
      )}

      {selectedTicket ? (
        <section
          aria-labelledby="admin-selected-ticket-title"
          className="scroll-destination border-t border-line bg-surface-muted p-4 sm:p-5"
          id="admin-selected-ticket"
        >
          <div className="band">
            <div className="min-w-0">
              <p className="eyebrow">Selected record</p>
              <h3 className="section-heading mt-0.5" id="admin-selected-ticket-title">
                Manage {selectedTicket.ticket_number}
              </h3>
              <p className="mt-1 text-meta">
                Claim an eligible ticket or transfer it to another active station.
              </p>
            </div>
            <IconButton label="Close ticket details" onClick={onClearSelection} type="button">
              <XIcon size={16} />
            </IconButton>
          </div>

          <div className="cluster mt-3">
            <StatusBadge status={selectedTicket.status} />
            <PriorityBadge priority={selectedTicket.priority} showLabel />
            <span className="inline-meta">Opened {formatDateTime(selectedTicket.created_at)}</span>
          </div>

          <div className="split-grid mt-4">
            <div className="stack">
              <p className="break-anywhere whitespace-pre-wrap text-sm leading-6 text-ink-soft">
                {selectedTicket.description}
              </p>
              <dl className="detail-list">
                <div className="detail-row">
                  <dt className="detail-term">Requester</dt>
                  <dd className="detail-desc">{requesterName(selectedTicket)}</dd>
                </div>
                <div className="detail-row">
                  <dt className="detail-term">Owner</dt>
                  <dd className="detail-desc">{selectedTicket.assignee_name || "Unassigned"}</dd>
                </div>
                <div className="detail-row">
                  <dt className="detail-term">Location</dt>
                  <dd className="detail-desc">{selectedTicket.station_name}</dd>
                </div>
                <div className="detail-row">
                  <dt className="detail-term">Issue type</dt>
                  <dd className="detail-desc">{selectedTicket.problem_type_name}</dd>
                </div>
                <div className="detail-row">
                  <dt className="detail-term">Last update</dt>
                  <dd className="detail-desc">{formatDateTime(selectedTicket.updated_at)}</dd>
                </div>
              </dl>
              <TicketAttachments key={selectedTicket.id} ticketId={selectedTicket.id} />
            </div>

            <div className="detail-panel stack bg-surface">
              <div>
                <h4 className="text-sm font-semibold text-ink">Route this ticket</h4>
                <p className="mt-1 text-xs leading-5 text-ink-muted">
                  Choose a station to transfer the record. An officer assignment is optional.
                </p>
              </div>
              <SelectField
                label="Transfer to station"
                onChange={(event) => onTransferStationChange(event.target.value)}
                value={transferStationId}
              >
                <option value="">Choose a station</option>
                {options?.stations.map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.name}
                  </option>
                ))}
              </SelectField>
              <TextField
                label="Transfer reason"
                onChange={(event) => onTransferReasonChange(event.target.value)}
                optional
                value={transferReason}
              />
              {transferStationId ? (
                <SelectField
                  hint="Leave blank to route the ticket to the station queue."
                  label="Assign to officer"
                  onChange={(event) => onTransferAgentChange(event.target.value)}
                  optional
                  value={transferAgentId}
                >
                  <option value="">Leave in station queue</option>
                  {stationOfficers.map((officer) => (
                    <option key={officer.id} value={officer.id}>
                      {officer.name}
                    </option>
                  ))}
                </SelectField>
              ) : null}
              <div className="form-actions">
                {claimable ? (
                  <Button
                    disabled={working}
                    onClick={() => onClaimTicket(selectedTicket)}
                    type="button"
                    variant="primary"
                  >
                    {working ? "Working…" : "Claim ticket"}
                  </Button>
                ) : null}
                <Button
                  disabled={working || !transferable}
                  onClick={() => onTransferTicket(selectedTicket)}
                  type="button"
                  variant="secondary"
                >
                  {working ? "Working…" : "Transfer ticket"}
                </Button>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </Card>
  );
}
