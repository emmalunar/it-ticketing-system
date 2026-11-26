"use client";

import type { ManagedUser } from "@/lib/api";
import { ActiveBadge, Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState, Skeleton } from "@/components/ui/Feedback";
import { SelectField, TextField } from "@/components/ui/Form";
import {
  ArrowRightIcon,
  BuildingIcon,
  ClipboardListIcon,
  PlusIcon,
  RotateCcwIcon,
  TrashIcon,
} from "@/components/ui/icons";
import type { AdminSetupProps } from "./types";

function officerName(officer: ManagedUser) {
  const fullName = `${officer.first_name} ${officer.last_name}`.trim();
  return fullName || officer.username;
}

function ListSkeleton({ label }: { label: string }) {
  return (
    <div aria-label={label} className="card__body stack" role="status">
      {[0, 1, 2].map((row) => (
        <div className="flex items-center justify-between gap-4" key={row}>
          <div className="grow stack--sm" style={{ gap: 6 }}>
            <Skeleton className="skeleton--text" style={{ width: "46%" }} />
            <Skeleton className="skeleton--text" style={{ width: "30%" }} />
          </div>
          <Skeleton style={{ width: 64, height: 22, borderRadius: 999 }} />
        </div>
      ))}
    </div>
  );
}

export function AdminSetup({
  options,
  users,
  serviceOfficers,
  working,
  newStation,
  onNewStationChange,
  onCreateStation,
  officerTransfer,
  onOfficerTransferChange,
  onTransferOfficer,
  issueTypeForm,
  onIssueTypeFormChange,
  onSubmitIssueType,
  onRemoveIssueType,
  onReactivateIssueType,
}: AdminSetupProps) {
  const activeOfficers = serviceOfficers.filter((officer) => officer.is_active);
  const selectedOfficer = users.find((officer) => officer.id === officerTransfer.officer);
  const currentStations = selectedOfficer?.stations ?? [];
  const availableStations = options?.stations ?? [];

  return (
    <section
      aria-busy={working}
      aria-label="Service setup"
      className="split-grid scroll-destination"
      id="admin-setup"
    >
      <div className="stack stack--lg">
        <Card>
          <CardHeader
            actions={
              options ? (
                <span
                  className="count-pill"
                  title={`${options.stations.length} active station${options.stations.length === 1 ? "" : "s"}`}
                >
                  {options.stations.length}
                </span>
              ) : undefined
            }
            subtitle="Active locations available for ticket routing"
            title="Service locations"
          />

        {options === null ? (
          <ListSkeleton label="Loading service locations…" />
        ) : availableStations.length > 0 ? (
          <ul aria-label="Active service locations" className="record-list">
            {availableStations.map((station) => (
              <li className="record-list__item" key={station.id}>
                <div className="record-list__top">
                  <div className="cell-stack">
                    <p className="cell-primary break-anywhere">{station.name}</p>
                    <p className="cell-meta break-anywhere">Station code · {station.code}</p>
                  </div>
                  <ActiveBadge active />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            body="Add the first station to start routing tickets."
            compact
            icon={<BuildingIcon size={20} />}
            title="No active stations configured"
          />
        )}

        <form
          className="card__body stack"
          onSubmit={onCreateStation}
          style={{ borderTop: "1px solid var(--color-line)" }}
        >
          <div className="stack--sm">
            <h3 className="card-title">Add a station</h3>
            <p className="text-meta">
              New locations become available for ticket routing and officer assignments.
            </p>
          </div>
          <div className="form-grid">
            <TextField
              label="Station name"
              maxLength={200}
              onChange={(event) =>
                onNewStationChange({ ...newStation, name: event.target.value })
              }
              required
              value={newStation.name}
            />
            <TextField
              label="Station code"
              maxLength={50}
              onChange={(event) =>
                onNewStationChange({ ...newStation, code: event.target.value })
              }
              required
              value={newStation.code}
            />
            <TextField
              label="Description"
              onChange={(event) =>
                onNewStationChange({ ...newStation, description: event.target.value })
              }
              optional
              value={newStation.description}
            />
          </div>
          <div className="form-actions">
            <Button leadingIcon={<PlusIcon size={14} />} loading={working} type="submit" variant="primary">
              {working ? "Saving…" : "Add station"}
            </Button>
          </div>
        </form>
      </Card>

        <Card>
          <CardHeader
            subtitle="Move an officer between active stations. Other station assignments are retained."
            title="Transfer an IT officer"
          />
          <form className="card__body stack" onSubmit={onTransferOfficer}>
            <SelectField
              disabled={working}
              hint={
                activeOfficers.length === 0
                  ? "No active IT officers are available to transfer."
                  : undefined
              }
              label="IT officer"
              onChange={(event) =>
                onOfficerTransferChange({
                  officer: event.target.value,
                  from_station: "",
                  to_station: "",
                })
              }
              required
              value={officerTransfer.officer}
            >
              <option value="">Choose an officer</option>
              {activeOfficers.map((officer) => (
                <option key={officer.id} value={officer.id}>
                  {officerName(officer)} · {officer.role === "ADMIN" ? "Administrator" : "IT officer"}
                </option>
              ))}
            </SelectField>

            <SelectField
              disabled={!officerTransfer.officer || working}
              hint={
                selectedOfficer && currentStations.length === 0
                  ? "This officer has no station assignments on record."
                  : undefined
              }
              label="Current station"
              onChange={(event) =>
                onOfficerTransferChange({
                  ...officerTransfer,
                  from_station: event.target.value,
                  to_station: "",
                })
              }
              required
              value={officerTransfer.from_station}
            >
              <option value="">Choose current station</option>
              {currentStations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name}
                </option>
              ))}
            </SelectField>

            <SelectField
              disabled={!officerTransfer.from_station || working}
              label="New station"
              onChange={(event) =>
                onOfficerTransferChange({
                  ...officerTransfer,
                  to_station: event.target.value,
                })
              }
              required
              value={officerTransfer.to_station}
            >
              <option value="">Choose destination</option>
              {availableStations
                .filter((station) => station.id !== officerTransfer.from_station)
                .map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.name}
                  </option>
                ))}
            </SelectField>

            <div className="form-actions">
              <Button
                leadingIcon={<ArrowRightIcon size={14} />}
                loading={working}
                type="submit"
                variant="primary"
              >
                {working ? "Transferring…" : "Transfer officer"}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <Card>
        <CardHeader
          actions={
            options ? (
              <span
                className="count-pill"
                title={`${options.problem_types.length} issue type${options.problem_types.length === 1 ? "" : "s"}`}
              >
                {options.problem_types.length}
              </span>
            ) : undefined
          }
          subtitle="Manage issue types available to requesters. Deleting a type preserves existing ticket records."
          title="Issue catalog"
        />

          <form
            className="card__body stack"
            onSubmit={onSubmitIssueType}
            style={{ borderBottom: "1px solid var(--color-line)" }}
          >
            <div className="stack--sm">
              <h3 className="card-title">Add an issue type</h3>
              <p className="text-meta">
                New categories appear in the requester ticket form.
              </p>
            </div>
            <div className="form-grid">
              <TextField
                label="Issue name"
                maxLength={200}
                onChange={(event) =>
                  onIssueTypeFormChange({ ...issueTypeForm, name: event.target.value })
                }
                required
                value={issueTypeForm.name}
              />
              <TextField
                label="Category"
                maxLength={200}
                onChange={(event) =>
                  onIssueTypeFormChange({
                    ...issueTypeForm,
                    category_name: event.target.value,
                  })
                }
                required
                value={issueTypeForm.category_name}
              />
              <TextField
                label="Description"
                onChange={(event) =>
                  onIssueTypeFormChange({
                    ...issueTypeForm,
                    description: event.target.value,
                  })
                }
                optional
                value={issueTypeForm.description}
              />
            </div>
            <div className="form-actions">
              <Button leadingIcon={<PlusIcon size={14} />} loading={working} type="submit" variant="primary">
                {working ? "Saving…" : "Add issue type"}
              </Button>
            </div>
          </form>

          {options === null ? (
            <ListSkeleton label="Loading issue types…" />
          ) : options.problem_types.length > 0 ? (
            <ul aria-label="Issue types" className="record-list">
              {options.problem_types.map((type) => (
                <li className="record-list__item" key={type.id}>
                  <div className="record-list__top">
                    <div className="cell-stack">
                      <p className="cell-primary break-anywhere">
                        {type.name}
                        <span className="cell-meta"> · {type.category}</span>
                      </p>
                    </div>
                    <Badge dot tone={type.is_active ? "success" : "neutral"}>
                      {type.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="record-list__bottom">
                    <p className="cell-meta break-anywhere grow">
                      {type.description || "No description provided."}
                    </p>
                    {type.is_active ? (
                      <Button
                        aria-label={`Delete ${type.name}`}
                        disabled={working}
                        leadingIcon={<TrashIcon size={13} />}
                        onClick={() => onRemoveIssueType(type.id)}
                        size="sm"
                        type="button"
                        variant="danger"
                      >
                        Delete
                      </Button>
                    ) : (
                      <Button
                        aria-label={`Reactivate ${type.name}`}
                        disabled={working}
                        leadingIcon={<RotateCcwIcon size={13} />}
                        onClick={() => onReactivateIssueType(type.id)}
                        size="sm"
                        type="button"
                        variant="soft"
                      >
                        Reactivate
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              body="Add an issue type so requesters can choose the right category."
              compact
              icon={<ClipboardListIcon size={20} />}
              title="No issue types configured yet"
            />
          )}
      </Card>
    </section>
  );
}
