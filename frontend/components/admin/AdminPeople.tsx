"use client";

import { useId } from "react";
import type { ManagedUser } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { ActiveBadge, RoleBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Dialog";
import { EmptyState, Skeleton } from "@/components/ui/Feedback";
import { SearchInput, Select, SelectField, TextField } from "@/components/ui/Form";
import { PencilIcon, PlusIcon, UsersIcon } from "@/components/ui/icons";
import type { AdminPeopleProps } from "./types";

const roleOptions = [
  { value: "ALL", label: "All roles" },
  { value: "ACTIVE", label: "Active accounts" },
  { value: "USER", label: "Requesters" },
  { value: "AGENT", label: "IT officers" },
  { value: "ADMIN", label: "Administrators" },
] as const;

function displayName(user: ManagedUser) {
  const fullName = `${user.first_name} ${user.last_name}`.trim();
  return fullName || user.username;
}

function AccountIdentity({ user }: { user: ManagedUser }) {
  const name = displayName(user);
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar name={name} size="sm" />
      <div className="cell-stack min-w-0">
        <p className="cell-primary break-anywhere">{name}</p>
        <p className="cell-meta break-anywhere">
          @{user.username}
          {user.email ? ` · ${user.email}` : ""}
        </p>
      </div>
    </div>
  );
}

function RoleCell({ user }: { user: ManagedUser }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <RoleBadge role={user.role} />
      {user.role === "ADMIN" && user.stations.length > 0 ? (
        <span className="text-meta">· IT officer</span>
      ) : null}
    </span>
  );
}

function StationList({ user }: { user: ManagedUser }) {
  if (!user.stations.length) {
    return (
      <span className="text-meta" aria-label="No stations assigned">
        —
      </span>
    );
  }
  return (
    <span className="break-anywhere">
      {user.stations.map((station) => station.name).join(", ")}
    </span>
  );
}

function AccountActions({
  user,
  isSelf,
  working,
  onEdit,
  onToggleActive,
}: {
  user: ManagedUser;
  isSelf: boolean;
  working: boolean;
  onEdit: (user: ManagedUser) => void;
  onToggleActive: (user: ManagedUser) => void;
}) {
  const actionLabel = user.is_active ? "Deactivate" : "Reactivate";
  return (
    <div className="cluster" style={{ justifyContent: "flex-end" }}>
      <Button
        aria-label={`Edit ${user.username}`}
        leadingIcon={<PencilIcon size={13} />}
        onClick={() => onEdit(user)}
        size="sm"
        type="button"
        variant="secondary"
      >
        Edit
      </Button>
      <Button
        aria-label={`${actionLabel} ${user.username}${isSelf ? " — current account" : ""}`}
        disabled={working || isSelf}
        onClick={() => onToggleActive(user)}
        size="sm"
        title={
          isSelf
            ? "You can’t change access for the account you’re currently using."
            : undefined
        }
        type="button"
        variant={user.is_active ? "danger" : "soft"}
      >
        {actionLabel}
      </Button>
    </div>
  );
}

function AccountsSkeleton() {
  return (
    <div className="card__body stack" role="status" aria-label="Loading accounts">
      {[0, 1, 2, 3].map((row) => (
        <div className="flex items-center gap-3" key={row}>
          <Skeleton className="skeleton--circle" style={{ width: 30, height: 30 }} />
          <div className="grow stack--sm" style={{ gap: 6 }}>
            <Skeleton className="skeleton--text" style={{ width: "38%" }} />
            <Skeleton className="skeleton--text" style={{ width: "62%" }} />
          </div>
          <Skeleton style={{ width: 72, height: 22, borderRadius: 999 }} />
          <Skeleton style={{ width: 84, height: 30 }} />
        </div>
      ))}
    </div>
  );
}

export function AdminPeople({
  users,
  filteredUsers,
  stations,
  loading,
  working,
  currentUserId,
  search,
  onSearchChange,
  onSearchSubmit,
  roleFilter,
  onRoleFilterChange,
  formOpen,
  editingUser,
  userForm,
  onUserFormChange,
  onOpenCreate,
  onOpenEdit,
  onCloseForm,
  onSubmit,
  onToggleActive,
}: AdminPeopleProps) {
  const headingId = useId();
  const stationsHintId = useId();

  const role = userForm.role ?? "USER";
  const priority = userForm.priority_level ?? "P3";
  const stationIds = userForm.station_ids ?? [];
  const showsStations = role === "AGENT" || role === "ADMIN";
  const hasAccounts = users.length > 0;

  function updateUserForm(patch: Partial<typeof userForm>) {
    onUserFormChange({ ...userForm, ...patch });
  }

  function toggleStation(stationId: string, checked: boolean) {
    updateUserForm({
      station_ids: checked
        ? [...stationIds, stationId]
        : stationIds.filter((id) => id !== stationId),
    });
  }

  const resultsMessage = loading
    ? "Loading accounts…"
    : `${filteredUsers.length} account${filteredUsers.length === 1 ? "" : "s"} shown.`;

  return (
    <section
      aria-busy={loading || working}
      aria-labelledby={headingId}
      className="scroll-destination"
      id="admin-people"
    >
      <Card>
        <CardHeader
          actions={
            <Button
              leadingIcon={<PlusIcon size={15} />}
              onClick={onOpenCreate}
              type="button"
              variant="primary"
            >
              Add account
            </Button>
          }
          subtitle="Create requesters and IT officers, assign stations, and manage account access."
          title="People & access"
          titleId={headingId}
        />

        <form
          aria-label="Find accounts"
          className="table-toolbar"
          onSubmit={(event) => {
            event.preventDefault();
            onSearchSubmit();
          }}
          role="search"
        >
          <div className="table-toolbar__group">
            <div className="grow" style={{ minWidth: 220 }}>
              <SearchInput
                label="Search people and access records"
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search name, username, or email…"
                value={search}
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </div>
          <div className="table-toolbar__group table-toolbar__group--end">
            <span className="visually-hidden" role="status">
              {resultsMessage}
            </span>
            <div className="w-full sm:w-[190px]">
              <Select
                aria-label="Filter accounts by role"
                onChange={(event) => onRoleFilterChange(event.target.value)}
                value={roleFilter}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </form>

        {loading && filteredUsers.length === 0 ? (
          <AccountsSkeleton />
        ) : filteredUsers.length > 0 ? (
          <>
            <div className="table-wrap hidden xl:block">
              <table className="data-table" aria-label="Accounts">
                <thead>
                  <tr>
                    <th scope="col">Account</th>
                    <th scope="col">Role</th>
                    <th scope="col">Stations</th>
                    <th scope="col">Access</th>
                    <th className="text-right" scope="col">
                      Manage
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <AccountIdentity user={item} />
                      </td>
                      <td>
                        <RoleCell user={item} />
                      </td>
                      <td className="cell-meta">
                        <StationList user={item} />
                      </td>
                      <td>
                        <ActiveBadge active={item.is_active} />
                      </td>
                      <td>
                        <AccountActions
                          isSelf={item.id === currentUserId}
                          onEdit={onOpenEdit}
                          onToggleActive={onToggleActive}
                          user={item}
                          working={working}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul aria-label="Accounts" className="record-list xl:hidden">
              {filteredUsers.map((item) => (
                <li className="record-list__item" key={item.id}>
                  <div className="record-list__top">
                    <AccountIdentity user={item} />
                    <ActiveBadge active={item.is_active} />
                  </div>
                  <div className="cluster">
                    <RoleCell user={item} />
                    <span className="text-meta break-anywhere">
                      Stations: {item.stations.length ? item.stations.map((station) => station.name).join(", ") : "—"}
                    </span>
                  </div>
                  <AccountActions
                    isSelf={item.id === currentUserId}
                    onEdit={onOpenEdit}
                    onToggleActive={onToggleActive}
                    user={item}
                    working={working}
                  />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <EmptyState
            action={
              !loading && !hasAccounts ? (
                <Button
                  leadingIcon={<PlusIcon size={15} />}
                  onClick={onOpenCreate}
                  type="button"
                  variant="primary"
                >
                  Add account
                </Button>
              ) : undefined
            }
            body={
              !loading && !hasAccounts
                ? "Add a requester or IT officer to give someone access to the service desk."
                : "Adjust the search term or role filter to see more accounts."
            }
            icon={<UsersIcon size={20} />}
            title={
              !loading && !hasAccounts
                ? "No accounts yet"
                : "No accounts match your filters"
            }
          />
        )}
      </Card>

      <Drawer
        asForm
        dismissible={!working}
        footer={
          <>
            <Button
              disabled={working}
              onClick={onCloseForm}
              type="button"
              variant="secondary"
            >
              Cancel
            </Button>
            <Button loading={working} type="submit" variant="primary">
              {working ? "Saving…" : editingUser ? "Save changes" : "Create account"}
            </Button>
          </>
        }
        onClose={onCloseForm}
        onSubmit={onSubmit}
        description="Passwords are saved securely; existing passwords are never displayed."
        open={formOpen}
        title={editingUser ? `Edit ${editingUser.username}` : "Create account"}
        wide
      >
        <div className="form-grid form-grid--2">
          <TextField
            autoComplete="username"
            disabled={Boolean(editingUser)}
            hint={editingUser ? "Usernames can’t be changed." : undefined}
            label="Username"
            onChange={(event) => updateUserForm({ username: event.target.value })}
            required
            value={userForm.username ?? ""}
          />
          <TextField
            autoComplete="new-password"
            hint={
              editingUser
                ? "Leave blank to keep the current password."
                : "At least 8 characters."
            }
            label={editingUser ? "New password" : "Temporary password"}
            minLength={8}
            onChange={(event) => updateUserForm({ password: event.target.value })}
            optional={Boolean(editingUser)}
            required={!editingUser}
            type="password"
            value={userForm.password ?? ""}
          />
          <SelectField
            label="Role"
            onChange={(event) =>
              updateUserForm({ role: event.target.value as AdminUserFormRole })
            }
            value={role}
          >
            <option value="USER">Requester</option>
            <option value="AGENT">IT officer</option>
            <option value="ADMIN">Administrator</option>
          </SelectField>
          <TextField
            autoComplete="given-name"
            label="First name"
            onChange={(event) => updateUserForm({ first_name: event.target.value })}
            value={userForm.first_name ?? ""}
          />
          <TextField
            autoComplete="family-name"
            label="Last name"
            onChange={(event) => updateUserForm({ last_name: event.target.value })}
            value={userForm.last_name ?? ""}
          />
          <TextField
            autoComplete="email"
            label="Email"
            onChange={(event) => updateUserForm({ email: event.target.value })}
            type="email"
            value={userForm.email ?? ""}
          />
          <SelectField
            label="Default priority"
            onChange={(event) =>
              updateUserForm({
                priority_level: event.target.value as AdminUserFormPriority,
              })
            }
            value={priority}
          >
            <option value="P1">P1 · Critical</option>
            <option value="P2">P2 · High</option>
            <option value="P3">P3 · Standard</option>
          </SelectField>

          {showsStations ? (
            <fieldset
              aria-describedby={stationsHintId}
              className="form-grid__full min-w-0"
            >
              <legend className="field__label">Assigned stations</legend>
              {stations.length ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {stations.map((station) => (
                    <label
                      className="checkbox"
                      key={station.id}
                      style={{
                        background: "var(--color-surface-muted)",
                        border: "1px solid var(--color-line)",
                        borderRadius: 8,
                        padding: "8px 10px",
                      }}
                    >
                      <input
                        checked={stationIds.includes(station.id)}
                        onChange={(event) =>
                          toggleStation(station.id, event.target.checked)
                        }
                        type="checkbox"
                      />
                      <span>{station.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="field__hint mt-2">
                  No active stations are configured yet.
                </p>
              )}
              <p className="field__hint mt-2" id={stationsHintId}>
                {role === "ADMIN"
                  ? "Optional for administrators; they retain system-wide access."
                  : "Select every station this IT officer can serve."}
              </p>
            </fieldset>
          ) : null}
        </div>
      </Drawer>
    </section>
  );
}

type AdminUserFormRole = NonNullable<AdminPeopleProps["userForm"]["role"]>;
type AdminUserFormPriority = NonNullable<AdminPeopleProps["userForm"]["priority_level"]>;
