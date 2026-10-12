"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import DashboardSkeleton from "./DashboardSkeleton";

import {
  claimTicket,
  createTicket,
  getAccessibleTickets,
  getCurrentUser,
  getAdminUsers,
  getCsrfCookie,
  getQueue,
  getQueueSummary,
  getTicketOptions,
  login,
  logout,
  archiveTicket,
  saveAdminUser,
  uploadTicketAttachment,
  type ApiUser,
  type AdminUserInput,
  type ManagedUser,
  type TicketOptions,
  type UserTicket,
  transferTicket,
} from "./lib/api";

type Priority = "P1" | "P2" | "P3";
type Ticket = {
  id: string;
  number: string;
  title: string;
  station: string;
  stationId: string;
  priority: Priority;
  status: string;
  age: string;
  owner: string;
};

const welcomeSlideStorageKey = "service-desk-welcome-slide";
const maxTicketImageSize = 10 * 1024 * 1024;

type TicketImage = {
  id: string;
  file: File;
  preview: string;
};

const welcomeSlides = [
  { eyebrow: "Support that moves with you", title: "A helpful hand, right when you need it.", description: "Tell us what’s slowing you down. Our team is ready to help you get back to your best work.", image: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1000&q=80", imageAlt: "Bright collaborative office workspace" },
  { eyebrow: "Your team is here", title: "Let’s find the fix together.", description: "You’re not on your own. Share the details and we’ll work through the next steps with you.", image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1000&q=80", imageAlt: "Colleagues working together around a table" },
  { eyebrow: "Clear updates, every step", title: "Get back to what matters.", description: "From your first request to the final update, we’ll keep you informed and moving forward.", image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=80", imageAlt: "Welcoming modern office interior" },
] as const;

const priorityStyles: Record<Priority, string> = {
  P1: "border-[#e8c2b8] bg-[#fbefeb] text-[#9a5849]",
  P2: "border-[#e6d6a8] bg-[#faf5e6] text-[#705315]",
  P3: "border-[#b7e4d0] bg-[#d1fae5] text-[#047857]",
};

function formatAge(createdAt: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export default function Home() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [myTickets, setMyTickets] = useState<UserTicket[]>([]);
  const [ticketOptions, setTicketOptions] = useState<TicketOptions | null>(null);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [summary, setSummary] = useState({ p1_count: 0, p2_count: 0, p3_count: 0 });
  const [activeWorkload, setActiveWorkload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferStationId, setTransferStationId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [authenticating, setAuthenticating] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const dashboardRequestId = useRef(0);

  async function loadDashboard(authenticatedUser?: ApiUser) {
    const requestId = ++dashboardRequestId.current;
    try {
      setError(null);
      setLoading(true);
      const currentUser = authenticatedUser ?? await getCurrentUser();
      if (requestId !== dashboardRequestId.current) return;
      setUser(currentUser);
      if (currentUser.role === "USER") {
        const [userTickets, options] = await Promise.all([getAccessibleTickets(), getTicketOptions()]);
        if (requestId !== dashboardRequestId.current) return;
        setMyTickets(userTickets);
        setTicketOptions(options);
        setTickets([]);
        setSummary({ p1_count: 0, p2_count: 0, p3_count: 0 });
        setActiveWorkload(0);
        return;
      }
      if (currentUser.role === "ADMIN") {
        setTickets([]);
        setSummary({ p1_count: 0, p2_count: 0, p3_count: 0 });
        setMyTickets([]);
        setActiveWorkload(0);
        return;
      }
      const [queue, queueSummary, accessibleTickets] = await Promise.all([getQueue(), getQueueSummary(), getAccessibleTickets()]);
      if (requestId !== dashboardRequestId.current) return;
      setActiveWorkload(accessibleTickets.filter((ticket) =>
        ticket.assignee === currentUser.id && ["IN_PROGRESS", "WAITING_USER"].includes(ticket.status),
      ).length);
      const activeStatuses = new Set(["QUEUED", "IN_PROGRESS", "WAITING_USER", "REOPENED"]);
      const urgentTickets = accessibleTickets.filter((ticket) => ticket.priority === "P1" && activeStatuses.has(ticket.status));
      const stationNames = new Map(currentUser.stations.map((station) => [station.id, station.name]));
      const mappedUrgent = urgentTickets.map((ticket) => ({
        id: ticket.id,
        number: ticket.ticket_number,
        title: ticket.description,
        station: ticket.station_name || stationNames.get(ticket.station) || "Station",
        stationId: ticket.station,
        priority: ticket.priority,
        status: ticket.status,
        age: formatAge(ticket.created_at),
        owner: ticket.assignee ? "Assigned" : "Unassigned",
      }));
      const mappedQueue = queue.data.map((ticket) => ({
        id: ticket.id,
        number: ticket.ticket_number,
        title: `${ticket.priority} ticket awaiting review`,
        station: ticket.station.name,
        stationId: ticket.station.id,
        priority: ticket.priority,
        status: ticket.status,
        age: formatAge(ticket.created_at),
        owner: ticket.assignee ? "Assigned" : "Unassigned",
      }));
      const mapped = [...mappedUrgent, ...mappedQueue];
      setTickets(mapped);
      setSelected((current) => mapped.find((ticket) => ticket.id === current?.id) ?? mapped[0] ?? null);
      setSummary(queueSummary.data);
      setMyTickets([]);
    } catch (caught) {
      if (requestId === dashboardRequestId.current) {
        setError(caught instanceof Error ? caught.message : "Unable to load your dashboard.");
      }
    } finally {
      if (requestId === dashboardRequestId.current) setLoading(false);
    }
  }

  useEffect(() => {
    const loadTimer = window.setTimeout(() => { void loadDashboard(); }, 0);
    return () => window.clearTimeout(loadTimer);
  }, []);

  async function handleClaim() {
    if (!selected || claiming) return;
    setClaiming(true);
    try {
      await claimTicket(selected.id);
      await loadDashboard();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to claim this ticket.");
    } finally {
      setClaiming(false);
    }
  }

  async function handleTransfer() {
    if (!selected || !transferStationId || transferring) return;
    setTransferring(true);
    try {
      await transferTicket(selected.id, { station: transferStationId, reason: transferReason });
      setTransferStationId("");
      setTransferReason("");
      await loadDashboard();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to transfer this ticket.");
    } finally {
      setTransferring(false);
    }
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthenticating(true);
    setError(null);
    try {
      await getCsrfCookie();
      const result = await login(username, password);
      await loadDashboard(result.user);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign in.");
    } finally {
      setAuthenticating(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
      setUser(null);
      setError("Authentication credentials were not provided.");
      setTickets([]);
      setMyTickets([]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign out.");
    }
  }

  if (!user) {
    if (loading && !error) {
      return <DashboardSkeleton />;
    }
    return <LoginScreen username={username} password={password} setUsername={setUsername} setPassword={setPassword} error={error ?? ""} loading={authenticating} onSubmit={handleLogin} />;
  }

  if (user.role === "USER") {
    return (
      <UserDashboard
        user={user}
        tickets={myTickets}
        options={ticketOptions}
        loading={loading}
        error={error}
        onRefresh={() => { setLoading(true); void loadDashboard(); }}
        onTicketCreated={() => { setLoading(true); void loadDashboard(); }}
        onError={setError}
        onLogout={() => void handleLogout()}
      />
    );
  }

  if (user.role === "ADMIN") {
    return <AdminDashboard user={user} onLogout={() => void handleLogout()} />;
  }

  return (
    <main className="app-shell min-h-screen text-[#20291f]">
      <div className="flex min-h-screen">
        <Sidebar user={user} />
        <section className="min-w-0 flex-1">
          <header className="app-header flex items-center justify-between border-b px-5 py-5 sm:px-8">
            <div><p className="eyebrow">IT officer workspace</p><h1 className="page-title mt-1">Good morning, {user.first_name || user.username}</h1></div>
            <div className="header-actions"><div className="service-indicator"><span />Service live</div><div className="user-avatar" aria-label={user.username}>{user.first_name.slice(0, 1) || user.username.slice(0, 1)}{user.last_name.slice(0, 1)}</div><button className="sign-out-action" onClick={() => void handleLogout()} type="button">Sign out</button></div>
          </header>
          <div className="app-content mx-auto px-5 py-7 sm:px-8">
            <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-sm font-medium text-[#74817b]">Live station overview</p><h2 className="section-heading mt-1">Ticket queue</h2></div><div className="text-right text-sm font-medium text-[#74817b]">{user?.stations.map((station) => station.name).join(", ") || "All stations"}</div></div>
            {error && <div className="mb-5 rounded-xl border border-[#e8c2b8] bg-[#fbefeb] px-4 py-3 text-sm text-[#9a5849]">{error} <button className="ml-3 font-bold underline" onClick={() => { setLoading(true); void loadDashboard(); }}>Retry</button></div>}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"><Metric label="Waiting now" value={String(summary.p2_count + summary.p3_count)} note="P2 and P3 in queue" tone="open" /><Metric label="P1 critical" value={String(summary.p1_count)} note="Immediate handling" tone="critical" /><Metric label="Active tickets" value={String(activeWorkload)} note="Assigned for handling" tone="active" /><Metric label="Queue status" value={loading ? "…" : "Live"} note="Django API connected" /></div>
            <div className={`mt-7 grid gap-5 ${selected ? "xl:grid-cols-[minmax(0,1fr)_340px]" : "xl:grid-cols-[minmax(0,1fr)_300px]"}`}>
              <section className="content-card">
                <div className="card-heading flex items-center justify-between border-b px-5 py-4">
                  <div><div className="flex items-center gap-2"><h3 className="section-heading text-lg">Station queue</h3><span className="queue-count">{tickets.length}</span></div><p className="mt-1 text-xs text-[#74817b]">Prioritised by urgency, then arrival time</p></div>
                  <button className="secondary-action border px-3 py-2 text-xs font-bold" onClick={() => { setLoading(true); void loadDashboard(); }}>Refresh</button>
                </div>
                <div className="agent-ticket-list divide-y divide-[#edf0e7] md:hidden">
                  {tickets.map((ticket) => (
                    <button key={ticket.id} aria-pressed={selected?.id === ticket.id} className={`w-full px-5 py-4 text-left transition ${selected?.id === ticket.id ? "bg-[#f2f7df]" : "hover:bg-[#f8faf7]"}`} onClick={() => setSelected(ticket)} type="button">
                      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold text-[#788763]">{ticket.number}</p><p className="mt-1 truncate text-sm font-semibold text-[#344a3e]">{ticket.title}</p></div><span className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold ${priorityStyles[ticket.priority]}`}>{ticket.priority}</span></div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2"><StatusBadge status={ticket.status} /><span className="text-xs text-[#65736b]">{ticket.station}</span><span className="ml-auto text-xs text-[#899181]">{ticket.age} ago</span></div>
                    </button>
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="data-table w-full min-w-[680px] text-left">
                    <thead className="bg-[#f7f8f2] text-[10px] uppercase tracking-[0.16em] text-[#7d8678]"><tr><th className="px-5 py-3">Ticket</th><th className="px-3 py-3">Priority</th><th className="px-3 py-3">Station</th><th className="px-3 py-3">Status</th><th className="px-5 py-3">Owner</th></tr></thead>
                    <tbody>{tickets.map((ticket) => <tr key={ticket.id} className={`border-t border-[#edf0e7] transition hover:bg-[#f8faef] ${selected?.id === ticket.id ? "bg-[#f2f7df]" : ""}`}>
                      <td className="px-5 py-4"><button aria-pressed={selected?.id === ticket.id} aria-label={`Select ticket ${ticket.number}`} className="ticket-select text-left" onClick={() => setSelected(ticket)} type="button"><p className="text-xs font-bold text-[#788763]">{ticket.number}</p><p className="mt-1 max-w-[230px] truncate text-sm font-semibold text-[#26342e]">{ticket.title}</p><p className="mt-1 text-xs font-normal text-[#899181]">Opened {ticket.age} ago</p></button></td>
                      <td className="px-3 py-4"><span className={`rounded-md border px-2 py-1 text-[10px] font-bold ${priorityStyles[ticket.priority]}`}>{ticket.priority}</span></td>
                      <td className="px-3 py-4 text-sm text-[#52605a]">{ticket.station}</td><td className="px-3 py-4"><StatusBadge status={ticket.status} /></td><td className="px-5 py-4 text-sm text-[#52605a]">{ticket.owner}</td>
                    </tr>)}</tbody>
                  </table>
                </div>
                <div className="queue-empty-wrap">
                  {!loading && tickets.length === 0 && <div className="empty-state"><span className="empty-state-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 7.5h14v11H5zM8 4.5h8M9 11h6M9 14.5h4" strokeLinecap="round" strokeLinejoin="round" /></svg></span><div><p className="text-sm font-semibold text-[#344a3e]">All clear for now</p><p className="mt-1 text-xs leading-5 text-[#7b8980]">New requests for your stations will appear here as soon as they arrive.</p></div></div>}
                </div>
              </section>
              {selected ? (
                <aside className="ticket-detail-panel rounded-3xl border p-5 text-[#263a31] shadow-[0_14px_32px_rgba(49,91,76,0.06)] sm:p-6">
                  <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#667c31]">Selected ticket</p><h3 className="mt-2 font-sans text-2xl font-bold tracking-tight">{selected.number}</h3></div><span className={`rounded-md border px-2 py-1 text-[10px] font-bold ${priorityStyles[selected.priority]}`}>{selected.priority}</span></div>
                  <p className="mt-5 break-words text-base font-semibold leading-6">{selected.title}</p>
                  <div className="mt-5 space-y-4 border-y border-[#dce8df] py-5"><Detail label="Station" value={selected.station} /><div className="flex items-center justify-between gap-3 text-sm"><span className="text-[#526242]">Status</span><StatusBadge status={selected.status} /></div><Detail label="Current owner" value={selected.owner} /><Detail label="Queue age" value={`${selected.age} ago`} /></div>
                  <p className="mt-5 text-sm leading-6 text-[#526242]">{selected.owner === "Unassigned" ? "Review the request and claim it when you’re ready to take ownership." : "This request has an assigned owner. Review its current status and coordinate with the assigned team member."}</p>
                  <button disabled={claiming || selected.owner !== "Unassigned" || !["QUEUED", "REOPENED"].includes(selected.status)} onClick={() => void handleClaim()} className="primary-action mt-5 w-full px-4 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50">{claiming ? "Claiming…" : selected.owner === "Unassigned" && ["QUEUED", "REOPENED"].includes(selected.status) ? "Claim ticket" : selected.owner === "Unassigned" ? "Not claimable" : "Ticket assigned"}</button>
                  {user.stations.some((station) => station.id !== selected.stationId) && (
                    <div className="mt-5 border-t border-[#dce8df] pt-5">
                      <label className="admin-field">Transfer to station
                        <select className="mt-2" onChange={(event) => setTransferStationId(event.target.value)} value={transferStationId}>
                          <option value="">Choose a station</option>
                          {user.stations.filter((station) => station.id !== selected.stationId).map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}
                        </select>
                      </label>
                      <label className="admin-field mt-3">Transfer reason (optional)
                        <input onChange={(event) => setTransferReason(event.target.value)} value={transferReason} />
                      </label>
                      <button className="secondary-action mt-3 w-full border px-4 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50" disabled={transferring || !transferStationId || ["RESOLVED", "CLOSED"].includes(selected.status)} onClick={() => void handleTransfer()} type="button">{transferring ? "Transferring…" : "Transfer ticket"}</button>
                    </div>
                  )}
                </aside>
              ) : <aside className="empty-guide"><span className="empty-guide-mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3.5 14.6 9l5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8L12 3.5Z" strokeLinejoin="round" /></svg></span><h3>You’re all caught up</h3><p>Your queue is clear. When a request needs attention, you’ll find its details and next steps here.</p><span className="service-indicator"><span />System ready</span></aside>}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function AdminDashboard({ user, onLogout }: {
  user: ApiUser;
  onLogout: () => void;
}) {
  const [section, setSection] = useState<"overview" | "tickets" | "people" | "setup">("overview");
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [tickets, setTickets] = useState<UserTicket[]>([]);
  const [options, setOptions] = useState<TicketOptions | null>(null);
  const [summary, setSummary] = useState({ p1_count: 0, p2_count: 0, p3_count: 0 });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [ticketStatus, setTicketStatus] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [selectedAdminTicketId, setSelectedAdminTicketId] = useState("");
  const [adminTransferStationId, setAdminTransferStationId] = useState("");
  const [adminTransferReason, setAdminTransferReason] = useState("");
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [userForm, setUserForm] = useState<AdminUserInput>({
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    email: "",
    role: "USER",
    priority_level: "P3",
    station_ids: [],
  });

  async function refreshAdminData() {
    setLoading(true);
    setError(null);
    try {
      const [managedUsers, allTickets, ticketOptions, queueSummary] = await Promise.all([
        getAdminUsers(),
        getAccessibleTickets(),
        getTicketOptions(),
        getQueueSummary(),
      ]);
      setUsers(managedUsers);
      setTickets(allTickets);
      setOptions(ticketOptions);
      setSummary(queueSummary.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load administrator data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshAdminData(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const activeUsers = users.filter((item) => item.is_active);
  const serviceOfficers = users.filter((item) =>
    item.role === "AGENT" || (item.role === "ADMIN" && item.stations.length > 0),
  );
  const activeWorkTickets = tickets.filter((item) => ["IN_PROGRESS", "WAITING_USER"].includes(item.status));
  const openTickets = tickets.filter((item) => ["QUEUED", "REOPENED"].includes(item.status));
  const selectedAdminTicket = tickets.find((item) => item.id === selectedAdminTicketId);
  const filteredUsers = users.filter((item) => {
    const matchesRole = roleFilter === "ALL"
      || item.role === roleFilter
      || (roleFilter === "AGENT" && item.role === "ADMIN" && item.stations.length > 0);
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [item.username, item.first_name, item.last_name, item.email]
      .some((value) => value.toLowerCase().includes(query));
    return matchesRole && matchesSearch;
  });
  const filteredTickets = tickets.filter((ticket) => {
    const matchesStatus = ticketStatus === "ALL" || ticket.status === ticketStatus;
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [
      ticket.ticket_number,
      ticket.description,
      ticket.requester_name ?? "",
      ticket.requester_username ?? "",
      ticket.station_name,
      ticket.problem_type_name,
    ].some((value) => value.toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });
  const orderedTickets = [...tickets].sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at));

  function openNewUserForm() {
    setEditingUser(null);
    setUserForm({
      username: "",
      password: "",
      first_name: "",
      last_name: "",
      email: "",
      role: "USER",
      priority_level: "P3",
      station_ids: [],
    });
    setUserFormOpen(true);
  }

  function openEditUserForm(item: ManagedUser) {
    setEditingUser(item);
    setUserForm({
      username: item.username,
      first_name: item.first_name,
      last_name: item.last_name,
      email: item.email,
      role: item.role,
      priority_level: item.priority_level,
      is_active: item.is_active,
      station_ids: item.stations.map((station) => station.id),
    });
    setUserFormOpen(true);
  }

  async function submitUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setError(null);
    try {
      const payload = { ...userForm };
      if (payload.role !== "AGENT" && payload.role !== "ADMIN") delete payload.station_ids;
      if (editingUser && !payload.password) delete payload.password;
      await saveAdminUser(payload, editingUser?.id);
      setUserFormOpen(false);
      setEditingUser(null);
      await refreshAdminData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save this account.");
    } finally {
      setWorking(false);
    }
  }

  async function toggleUserActive(item: ManagedUser) {
    if (item.id === user.id && item.is_active) {
      setError("You can’t deactivate the administrator account you’re currently using.");
      return;
    }
    const action = item.is_active ? "Deactivate" : "Reactivate";
    if (!window.confirm(`${action} ${item.username}? ${item.is_active ? "They will no longer be able to sign in. Their records will be kept." : "They will be able to sign in again."}`)) return;
    setWorking(true);
    setError(null);
    try {
      await saveAdminUser({ is_active: !item.is_active }, item.id);
      await refreshAdminData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `Unable to ${action.toLowerCase()} this account.`);
    } finally {
      setWorking(false);
    }
  }

  async function archiveAdminTicket(ticket: UserTicket) {
    if (!window.confirm(`Close ticket ${ticket.ticket_number}? Its history and attachments will be retained.`)) return;
    setWorking(true);
    setError(null);
    try {
      await archiveTicket(ticket.id);
      await refreshAdminData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to close this ticket.");
    } finally {
      setWorking(false);
    }
  }

  async function claimAdminTicket(ticket: UserTicket) {
    setWorking(true);
    setError(null);
    try {
      await claimTicket(ticket.id);
      await refreshAdminData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to claim this ticket.");
    } finally {
      setWorking(false);
    }
  }

  async function transferAdminTicket(ticket: UserTicket) {
    if (!adminTransferStationId) return;
    setWorking(true);
    setError(null);
    try {
      await transferTicket(ticket.id, { station: adminTransferStationId, reason: adminTransferReason });
      setSelectedAdminTicketId("");
      setAdminTransferStationId("");
      setAdminTransferReason("");
      await refreshAdminData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to transfer this ticket.");
    } finally {
      setWorking(false);
    }
  }

  const navItems = [
    ["overview", "Overview"],
    ["tickets", "Ticket records"],
    ["people", "People & access"],
    ["setup", "Service setup"],
  ] as const;

  return (
    <main className="app-shell min-h-screen text-[#20291f]">
      <div className="flex min-h-screen">
        <aside className="app-sidebar hidden w-[256px] shrink-0 border-r px-5 py-7 text-[#263126] lg:flex lg:flex-col">
          <BrandLockup caption="Admin control" className="mb-10" />
          <p className="eyebrow mb-3 px-3">Administration</p>
          <nav aria-label="Administrator sections" className="space-y-1">
            {navItems.map(([key, label]) => (
              <button key={key} aria-current={section === key ? "page" : undefined} className={`admin-nav-item ${section === key ? "is-active" : ""}`} onClick={() => { setSection(key); setSearch(""); }} type="button">{label}</button>
            ))}
          </nav>
          <div className="mt-auto border-t border-[#e8eadf] pt-5">
            <p className="text-sm font-semibold">{user.first_name || user.username}</p>
            <p className="mt-1 text-xs text-[#899181]">{user.stations.length ? "Administrator · IT officer" : "Administrator · full access"}</p>
          </div>
        </aside>
        <section className="min-w-0 flex-1">
          <header className="app-header flex items-center justify-between border-b px-5 py-4 sm:px-8">
            <div><p className="eyebrow">Service desk administration</p><h1 className="page-title mt-1">Control center</h1></div>
            <div className="header-actions"><div className="service-indicator"><span />Service live</div><div className="user-avatar" aria-label={user.username}>{user.first_name.slice(0, 1) || user.username.slice(0, 1)}</div><button className="sign-out-action" onClick={onLogout} type="button">Sign out</button></div>
          </header>
          <div className="app-content mx-auto px-5 py-7 sm:px-8">
            <div className="admin-mobile-nav mb-5 lg:hidden">
              {navItems.map(([key, label]) => <button key={key} aria-current={section === key ? "page" : undefined} className={section === key ? "is-active" : ""} onClick={() => { setSection(key); setSearch(""); }} type="button">{label}</button>)}
            </div>
            {error && <div className="mb-5 rounded-xl border border-[#e8c2b8] bg-[#fbefeb] px-4 py-3 text-sm text-[#9a5849]" role="alert">{error}<button className="ml-3 font-bold underline" onClick={() => void refreshAdminData()} type="button">Retry</button></div>}
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div><p className="text-sm font-medium text-[#74817b]">System overview</p><h2 className="section-heading mt-1">{navItems.find(([key]) => key === section)?.[1]}</h2></div>
              <button className="secondary-action border px-3 py-2 text-xs font-bold" disabled={loading || working} onClick={() => void refreshAdminData()} type="button">{loading ? "Refreshing…" : "Refresh data"}</button>
            </div>
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-5">
              <Metric label="Active accounts" value={String(activeUsers.length)} note={`${users.length - activeUsers.length} deactivated`} />
              <Metric label="IT officers" value={String(serviceOfficers.filter((officer) => officer.is_active).length)} note={`${serviceOfficers.length} total`} />
              <Metric label="Open tickets" value={String(openTickets.length)} note="Waiting to be claimed" tone="open" />
              <Metric label="Active tickets" value={String(activeWorkTickets.length)} note="In progress or awaiting user" tone="active" />
              <Metric label="Critical queue" value={String(summary.p1_count)} note="Priority P1" tone="critical" />
            </div>

            {section === "overview" && (
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,.8fr)]">
                <section className="content-card">
                  <div className="card-heading flex items-center justify-between border-b px-5 py-4"><div><h3 className="section-heading text-lg">Recently opened tickets</h3><p className="mt-1 text-xs text-[#74817b]">Latest activity across all stations</p></div><button className="text-xs font-bold text-[#047857]" onClick={() => setSection("tickets")} type="button">Manage tickets →</button></div>
                  {orderedTickets.length ? <div className="divide-y divide-[#edf0e7]">{orderedTickets.slice(0, 6).map((ticket) => <div key={ticket.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div className="min-w-0"><p className="text-xs font-bold text-[#788763]">{ticket.ticket_number} <span className="font-medium text-[#899181]">· {ticket.requester_name || ticket.requester_username}</span></p><p className="mt-1 truncate text-sm font-semibold text-[#344a3e]">{ticket.description}</p><p className="mt-1 text-xs text-[#74817b]">{ticket.station_name} · {ticket.problem_type_name}</p></div><StatusBadge status={ticket.status} /></div>)}</div> : <div className="empty-state"><div><p className="font-semibold text-[#344a3e]">{loading ? "Loading system records…" : "No tickets recorded"}</p><p className="mt-2 text-sm text-[#7d8981]">New requester tickets will appear here.</p></div></div>}
                </section>
                <section className="content-card">
                  <div className="card-heading border-b px-5 py-4"><h3 className="section-heading text-lg">Administration shortcuts</h3><p className="mt-1 text-xs text-[#74817b]">Manage system records without leaving the control center.</p></div>
                  <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-1">
                    <button className="admin-shortcut" onClick={() => { setSection("people"); openNewUserForm(); }} type="button"><span className="admin-shortcut-icon">+</span><span><strong>Create an account</strong><small>Add a requester or IT officer</small></span></button>
                    <button className="admin-shortcut" onClick={() => setSection("tickets")} type="button"><span className="admin-shortcut-icon">↗</span><span><strong>Review all tickets</strong><small>Search, inspect, or close records</small></span></button>
                    <button className="admin-shortcut" onClick={() => setSection("setup")} type="button"><span className="admin-shortcut-icon">⌘</span><span><strong>Service configuration</strong><small>View stations and issue types</small></span></button>
                  </div>
                </section>
              </div>
            )}

            {section === "tickets" && (
              <section className="content-card">
                <div className="card-heading flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4">
                  <div><h3 className="section-heading text-lg">All ticket records</h3><p className="mt-1 text-xs text-[#74817b]">Ticket history is retained; closing archives it from the active queue.</p></div>
                  <div className="flex flex-wrap gap-2"><input aria-label="Search tickets" className="admin-search" onChange={(event) => setSearch(event.target.value)} placeholder="Search tickets…" value={search} /><select aria-label="Filter tickets by status" className="admin-filter" onChange={(event) => setTicketStatus(event.target.value)} value={ticketStatus}><option value="ALL">All statuses</option>{["QUEUED", "IN_PROGRESS", "WAITING_USER", "REOPENED", "RESOLVED", "CLOSED"].map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></div>
                </div>
                {filteredTickets.length ? <div className="overflow-x-auto"><table className="data-table w-full min-w-[820px] text-left"><thead><tr><th className="px-5 py-3">Ticket</th><th className="px-3 py-3">Requester</th><th className="px-3 py-3">Location / issue</th><th className="px-3 py-3">Priority</th><th className="px-3 py-3">Status</th><th className="px-5 py-3">Action</th></tr></thead><tbody>{filteredTickets.map((ticket) => <tr key={ticket.id} className="border-t border-[#edf0e7]"><td className="px-5 py-4"><p className="text-xs font-bold text-[#788763]">{ticket.ticket_number}</p><p className="mt-1 max-w-[230px] truncate text-sm font-medium">{ticket.description}</p></td><td className="px-3 py-4 text-sm">{ticket.requester_name || ticket.requester_username || "Requester"}</td><td className="px-3 py-4 text-xs text-[#52605a]">{ticket.station_name}<br />{ticket.problem_type_name}</td><td className="px-3 py-4"><span className={`rounded-md border px-2 py-1 text-[10px] font-bold ${priorityStyles[ticket.priority]}`}>{ticket.priority}</span></td><td className="px-3 py-4"><StatusBadge status={ticket.status} /></td><td className="px-5 py-4"><div className="flex gap-2"><button className="secondary-action border px-3 py-2 text-xs font-bold" onClick={() => { setSelectedAdminTicketId(ticket.id); setAdminTransferStationId(""); }} type="button">Manage</button>{ticket.status !== "CLOSED" && <button className="admin-danger-action" disabled={working} onClick={() => void archiveAdminTicket(ticket)} type="button">Close</button>}</div></td></tr>)}</tbody></table></div> : <div className="empty-state"><p className="text-sm text-[#74817b]">{loading ? "Loading tickets…" : "No tickets match your filters."}</p></div>}
                {selectedAdminTicket && (
                  <div className="admin-user-form m-5">
                    <div className="mb-4 flex items-start justify-between gap-3"><div><h4 className="font-semibold text-[#344a3e]">Manage {selectedAdminTicket.ticket_number}</h4><p className="mt-1 text-xs text-[#74817b]">Claim an eligible ticket or transfer it to another active station.</p></div><button className="secondary-action border px-3 py-2 text-xs font-bold" onClick={() => setSelectedAdminTicketId("")} type="button">Close</button></div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="admin-field">Transfer to station<select onChange={(event) => setAdminTransferStationId(event.target.value)} value={adminTransferStationId}><option value="">Choose a station</option>{options?.stations.filter((station) => station.id !== selectedAdminTicket.station).map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}</select></label>
                      <label className="admin-field">Transfer reason (optional)<input onChange={(event) => setAdminTransferReason(event.target.value)} value={adminTransferReason} /></label>
                    </div>
                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                      {!selectedAdminTicket.assignee && ["QUEUED", "REOPENED"].includes(selectedAdminTicket.status) && <button className="primary-action px-4 py-2.5 text-xs font-bold" disabled={working} onClick={() => void claimAdminTicket(selectedAdminTicket)} type="button">{working ? "Working…" : "Claim ticket"}</button>}
                      <button className="secondary-action border px-4 py-2.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50" disabled={working || !adminTransferStationId || ["RESOLVED", "CLOSED"].includes(selectedAdminTicket.status)} onClick={() => void transferAdminTicket(selectedAdminTicket)} type="button">{working ? "Working…" : "Transfer ticket"}</button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {section === "people" && (
              <section className="content-card">
                <div className="card-heading flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4"><div><h3 className="section-heading text-lg">People & access</h3><p className="mt-1 text-xs text-[#74817b]">Create requesters and IT officers, assign stations, and manage account access.</p></div><button className="primary-action px-4 py-2.5 text-xs font-bold" onClick={openNewUserForm} type="button">+ Add account</button></div>
                <div className="flex flex-wrap gap-2 border-b border-[#edf0e7] px-5 py-3"><input aria-label="Search accounts" className="admin-search" onChange={(event) => setSearch(event.target.value)} placeholder="Search people…" value={search} /><select aria-label="Filter accounts by role" className="admin-filter" onChange={(event) => setRoleFilter(event.target.value)} value={roleFilter}><option value="ALL">All roles</option><option value="USER">Requesters</option><option value="AGENT">IT officers</option><option value="ADMIN">Administrators</option></select></div>
                {userFormOpen && <form className="admin-user-form m-5" onSubmit={(event) => void submitUser(event)}>
                  <div className="mb-4 flex items-start justify-between gap-3"><div><h4 className="font-semibold text-[#344a3e]">{editingUser ? `Edit ${editingUser.username}` : "Create account"}</h4><p className="mt-1 text-xs text-[#74817b]">Passwords are saved securely; existing passwords are never displayed.</p></div><button className="secondary-action border px-3 py-2 text-xs font-bold" onClick={() => setUserFormOpen(false)} type="button">Cancel</button></div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <label className="admin-field">Username<input required disabled={!!editingUser} onChange={(event) => setUserForm({ ...userForm, username: event.target.value })} value={userForm.username ?? ""} /></label>
                    <label className="admin-field">{editingUser ? "New password (optional)" : "Temporary password"}<input autoComplete="new-password" minLength={8} required={!editingUser} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} type="password" value={userForm.password ?? ""} /></label>
                    <label className="admin-field">Role<select onChange={(event) => setUserForm({ ...userForm, role: event.target.value as ApiUser["role"] })} value={userForm.role ?? "USER"}><option value="USER">Requester</option><option value="AGENT">IT officer</option><option value="ADMIN">Administrator</option></select></label>
                    <label className="admin-field">First name<input onChange={(event) => setUserForm({ ...userForm, first_name: event.target.value })} value={userForm.first_name ?? ""} /></label>
                    <label className="admin-field">Last name<input onChange={(event) => setUserForm({ ...userForm, last_name: event.target.value })} value={userForm.last_name ?? ""} /></label>
                    <label className="admin-field">Email<input onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} type="email" value={userForm.email ?? ""} /></label>
                    <label className="admin-field">Default priority<select onChange={(event) => setUserForm({ ...userForm, priority_level: event.target.value as ApiUser["priority_level"] })} value={userForm.priority_level ?? "P3"}><option value="P1">P1 · Critical</option><option value="P2">P2 · High</option><option value="P3">P3 · Standard</option></select></label>
                    {(userForm.role === "AGENT" || userForm.role === "ADMIN") && <label className="admin-field sm:col-span-2">Assigned stations<select multiple onChange={(event) => setUserForm({ ...userForm, station_ids: Array.from(event.target.selectedOptions, (option) => option.value) })} value={userForm.station_ids ?? []}>{options?.stations.map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}</select><small>{userForm.role === "ADMIN" ? "Optional for administrators; they retain system-wide access." : "Use Ctrl or Command to select multiple stations."}</small></label>}
                  </div>
                  <div className="mt-4 flex justify-end"><button className="primary-action px-4 py-2.5 text-xs font-bold" disabled={working} type="submit">{working ? "Saving…" : editingUser ? "Save changes" : "Create account"}</button></div>
                </form>}
                {filteredUsers.length ? <div className="overflow-x-auto"><table className="data-table w-full min-w-[760px] text-left"><thead><tr><th className="px-5 py-3">Account</th><th className="px-3 py-3">Role</th><th className="px-3 py-3">Stations</th><th className="px-3 py-3">Access</th><th className="px-5 py-3">Manage</th></tr></thead><tbody>{filteredUsers.map((item) => <tr key={item.id} className="border-t border-[#edf0e7]"><td className="px-5 py-4"><p className="text-sm font-semibold text-[#344a3e]">{item.first_name || item.last_name ? `${item.first_name} ${item.last_name}`.trim() : item.username}</p><p className="mt-1 text-xs text-[#7d8678]">{item.username}{item.email ? ` · ${item.email}` : ""}</p></td><td className="px-3 py-4 text-sm">{item.role === "USER" ? "Requester" : item.role === "AGENT" ? "IT officer" : item.stations.length ? "Administrator · IT officer" : "Administrator"}</td><td className="px-3 py-4 text-xs text-[#52605a]">{item.stations.map((station) => station.name).join(", ") || "—"}</td><td className="px-3 py-4"><span className={`account-state ${item.is_active ? "is-enabled" : "is-disabled"}`}>{item.is_active ? "Active" : "Deactivated"}</span></td><td className="px-5 py-4"><div className="flex gap-2"><button className="secondary-action border px-3 py-2 text-xs font-bold" onClick={() => openEditUserForm(item)} type="button">Edit</button><button className={item.is_active ? "admin-danger-action" : "admin-enable-action"} disabled={working || item.id === user.id} onClick={() => void toggleUserActive(item)} type="button">{item.is_active ? "Deactivate" : "Reactivate"}</button></div></td></tr>)}</tbody></table></div> : <div className="empty-state"><p className="text-sm text-[#74817b]">{loading ? "Loading accounts…" : "No accounts match your filters."}</p></div>}
              </section>
            )}

            {section === "setup" && (
              <div className="grid gap-5 xl:grid-cols-2">
                <section className="content-card"><div className="card-heading border-b px-5 py-4"><h3 className="section-heading text-lg">Service locations</h3><p className="mt-1 text-xs text-[#74817b]">Active locations available for ticket routing</p></div>{options?.stations.length ? <div className="divide-y divide-[#edf0e7]">{options.stations.map((station) => <div key={station.id} className="flex items-center justify-between gap-4 px-5 py-4"><div><p className="text-sm font-semibold text-[#344a3e]">{station.name}</p><p className="mt-1 text-xs text-[#74817b]">Station code · {station.code}</p></div><span className="account-state is-enabled">Active</span></div>)}</div> : <div className="empty-state"><p className="text-sm text-[#74817b]">No active stations configured.</p></div>}</section>
                <section className="content-card"><div className="card-heading border-b px-5 py-4"><h3 className="section-heading text-lg">Issue catalog</h3><p className="mt-1 text-xs text-[#74817b]">Active issue types currently available to requesters</p></div>{options?.problem_types.length ? <div className="divide-y divide-[#edf0e7]">{options.problem_types.map((type) => <div key={type.id} className="flex items-center justify-between gap-4 px-5 py-4"><div><p className="text-sm font-semibold text-[#344a3e]">{type.name}</p><p className="mt-1 text-xs text-[#74817b]">{type.category}</p></div><span className="account-state is-enabled">Active</span></div>)}</div> : <div className="empty-state"><p className="text-sm text-[#74817b]">No active issue types configured.</p></div>}</section>
                <p className="text-xs leading-5 text-[#74817b] xl:col-span-2">Station and issue catalog editing is available through <a className="font-semibold text-[#047857] underline" href="http://127.0.0.1:8000/admin/" rel="noreferrer" target="_blank">Django administration</a>. Use the control center for ticket records and account lifecycle management.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function UserDashboard({
  user,
  tickets,
  options,
  loading,
  error,
  onRefresh,
  onTicketCreated,
  onError,
  onLogout,
}: {
  user: ApiUser;
  tickets: UserTicket[];
  options: TicketOptions | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onTicketCreated: () => void;
  onError: (message: string | null) => void;
  onLogout: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [station, setStation] = useState("");
  const [problemType, setProblemType] = useState("");
  const [description, setDescription] = useState("");
  const [ticketImages, setTicketImages] = useState<TicketImage[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [welcomeSlideIndex, setWelcomeSlideIndex] = useState(0);
  const [welcomeSlideReady, setWelcomeSlideReady] = useState(false);
  const ticketImageUrls = useRef<string[]>([]);
  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      try {
        const savedIndex = Number(window.sessionStorage.getItem(welcomeSlideStorageKey));
        if (Number.isInteger(savedIndex) && savedIndex >= 0 && savedIndex < welcomeSlides.length) {
          setWelcomeSlideIndex(savedIndex);
        }
      } catch (caught) {
        console.warn("Unable to restore the welcome carousel position.", caught);
      }
      setWelcomeSlideReady(true);
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, []);
  useEffect(() => {
    if (!welcomeSlideReady) return;
    try {
      window.sessionStorage.setItem(welcomeSlideStorageKey, String(welcomeSlideIndex));
    } catch (caught) {
      console.warn("Unable to save the welcome carousel position.", caught);
    }
  }, [welcomeSlideIndex, welcomeSlideReady]);
  useEffect(() => () => {
    ticketImageUrls.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);
  const stationNames = new Map((options?.stations ?? []).map((item) => [item.id, item.name]));
  const problemTypeNames = new Map((options?.problem_types ?? []).map((item) => [item.id, item.name]));
  const activeTickets = tickets.filter((ticket) => !["RESOLVED", "CLOSED"].includes(ticket.status));
  const waitingTickets = tickets.filter((ticket) => ["QUEUED", "WAITING_USER", "REOPENED"].includes(ticket.status));

  function addTicketImages(files: FileList | null) {
    const selectedFiles = Array.from(files ?? []);
    const allowedTypes = ["image/png", "image/jpeg", "image/gif"];
    const invalidType = selectedFiles.find((file) => !allowedTypes.includes(file.type));
    const oversized = selectedFiles.find((file) => file.size > maxTicketImageSize);
    if (invalidType) {
      setImageError("Use PNG, JPEG, or GIF images. Other file types aren’t supported.");
      return;
    }
    if (oversized) {
      setImageError("Each image must be 10 MB or smaller.");
      return;
    }
    setImageError(null);
    for (const file of selectedFiles) {
      const preview = URL.createObjectURL(file);
      ticketImageUrls.current.push(preview);
      setTicketImages((current) => [...current, {
        id: `${file.name}-${crypto.randomUUID()}`,
        file,
        preview,
      }]);
    }
  }

  function removeTicketImage(imageId: string) {
    const removed = ticketImages.find((image) => image.id === imageId);
    if (removed) {
      URL.revokeObjectURL(removed.preview);
      ticketImageUrls.current = ticketImageUrls.current.filter((url) => url !== removed.preview);
    }
    setTicketImages((current) => current.filter((image) => image.id !== imageId));
  }

  async function submitTicket(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    onError(null);
    try {
      const ticket = await createTicket({ station, problem_type: problemType, description });
      setDescription("");
      setStation("");
      setProblemType("");
      setShowForm(false);

      const failedImages: string[] = [];
      for (const image of ticketImages) {
        try {
          await uploadTicketAttachment(ticket.id, image.file);
        } catch (caught) {
          const reason = caught instanceof Error ? caught.message : "upload failed";
          failedImages.push(`${image.file.name}: ${reason}`);
        }
      }
      ticketImageUrls.current.forEach((url) => URL.revokeObjectURL(url));
      ticketImageUrls.current = [];
      setTicketImages([]);
      setImageError(null);
      onTicketCreated();
      if (failedImages.length) {
        onError(`Ticket ${ticket.ticket_number} was created, but ${failedImages.length} image${failedImages.length === 1 ? "" : "s"} could not be attached: ${failedImages.join("; ")}`);
      }
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Unable to submit your ticket.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="app-shell min-h-screen text-[#20291f]">
      <div className="flex min-h-screen">
        <aside className="app-sidebar hidden w-[248px] shrink-0 border-r px-5 py-7 text-[#263126] lg:flex lg:flex-col">
          <BrandLockup caption="Requester portal" className="mb-12" />
          <p className="eyebrow mb-3 px-3">My workspace</p>
          <div className="workspace-active flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold"><span className="h-2 w-2 rounded-full bg-[#10b981]" />My tickets</div>
          <div className="mt-auto border-t border-[#e8eadf] pt-5">
            <div className="flex items-center gap-3">
              <div className="user-avatar">{user.first_name.slice(0, 1) || user.username.slice(0, 1)}{user.last_name.slice(0, 1)}</div>
              <div><p className="text-sm font-semibold">{user.first_name || user.username}</p><p className="text-xs text-[#899181]">Requester</p></div>
            </div>
          </div>
        </aside>
        <section className="min-w-0 flex-1">
          <header className="app-header flex items-center justify-between border-b px-5 py-5 sm:px-8">
            <div><p className="eyebrow">Requester portal</p><h1 className="page-title mt-1">Hello, {user.first_name || user.username}</h1></div>
            <div className="header-actions"><button className="primary-action px-4 py-2.5 text-sm font-bold" onClick={() => setShowForm((visible) => !visible)} type="button">{showForm ? "Close form" : "+ New ticket"}</button><button className="sign-out-action" onClick={onLogout} type="button">Sign out</button></div>
          </header>
          <div className="app-content mx-auto px-5 py-7 sm:px-8">
            <section className="requester-hero mb-7 rounded-[24px] p-5 pb-16 sm:p-7 sm:pb-16">
              <SupportWelcomeCarousel activeIndex={welcomeSlideIndex} setActiveIndex={setWelcomeSlideIndex} />
              <div className="requester-hero-content flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="max-w-xl">
                  <p className="eyebrow">{welcomeSlides[welcomeSlideIndex].eyebrow}</p>
                  <h2 aria-live="polite" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{welcomeSlides[welcomeSlideIndex].title}</h2>
                  <p className="mt-2 max-w-lg text-sm leading-6 text-[#047857]">{welcomeSlides[welcomeSlideIndex].description}</p>
                </div>
                <button className="request-action shrink-0 px-5 py-3 text-sm font-bold" onClick={() => setShowForm(true)} type="button">Start a request <span aria-hidden="true" className="ml-2">→</span></button>
              </div>
            </section>
            {error && <div className="mb-5 rounded-xl border border-[#e8c2b8] bg-[#fbefeb] px-4 py-3 text-sm text-[#9a5849]">{error}<button className="ml-3 font-bold underline" onClick={onRefresh} type="button">Retry</button></div>}
            {showForm && (
              <form onSubmit={submitTicket} className="content-card mb-7 p-5 sm:p-7">
                <div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#7d8678]">Get support</p><h2 className="mt-1 text-xl font-bold">Tell us what you need help with</h2></div><button className="secondary-action border px-3 py-2 text-xs font-bold" onClick={() => setShowForm(false)} type="button">Close</button></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-[#43503e]">Support location
                    <select required value={station} onChange={(event) => setStation(event.target.value)} className="mt-2 w-full rounded-xl border border-[#dfe4d7] bg-white px-3 py-3 outline-none focus:border-[#9cba43] focus:ring-2 focus:ring-[#edf6ca]">
                      <option value="">Choose a location</option>{options?.stations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-[#43503e]">Issue type
                    <select required value={problemType} onChange={(event) => setProblemType(event.target.value)} className="mt-2 w-full rounded-xl border border-[#dfe4d7] bg-white px-3 py-3 outline-none focus:border-[#9cba43] focus:ring-2 focus:ring-[#edf6ca]">
                      <option value="">Choose an issue type</option>{options?.problem_types.map((item) => <option key={item.id} value={item.id}>{item.category} · {item.name}</option>)}
                    </select>
                  </label>
                </div>
                <label className="mt-4 block text-sm font-semibold text-[#43503e]">Describe the issue
                  <textarea required minLength={5} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What happened, and what were you trying to do?" className="mt-2 w-full resize-y rounded-xl border border-[#dfe4d7] bg-white px-3 py-3 font-normal outline-none focus:border-[#9cba43] focus:ring-2 focus:ring-[#edf6ca]" />
                </label>
                <RequesterImageCarousel images={ticketImages} error={imageError} onImagesSelected={addTicketImages} onRemoveImage={removeTicketImage} />
                <p className="mt-3 text-xs text-[#74817b]">{ticketImages.length ? `${ticketImages.length} image${ticketImages.length === 1 ? "" : "s"} will be attached to this request.` : "Images added above will be attached to this request."}</p>
                <div className="mt-5 flex justify-end"><button disabled={submitting || !options?.stations.length || !options.problem_types.length} className="primary-action px-5 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50" type="submit">{submitting ? "Submitting…" : "Submit request"}</button></div>
                {options && (!options.stations.length || !options.problem_types.length) && <p className="mt-3 text-sm text-[#8b6200]">Ticket submission is unavailable because no active locations or issue types are configured.</p>}
              </form>
            )}
            <div className="mb-6 flex items-end justify-between"><div><p className="text-sm font-medium text-[#74817b]">Your support requests</p><h2 className="section-heading mt-1">My tickets</h2></div><button className="secondary-action border px-3 py-2 text-xs font-bold" onClick={onRefresh} type="button">Refresh</button></div>
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4"><Metric label="Total requests" value={String(tickets.length)} note="All time" /><Metric label="Need attention" value={String(waitingTickets.length)} note="Waiting or reopened" tone="open" /><Metric label="Being handled" value={String(tickets.filter((ticket) => ticket.status === "IN_PROGRESS").length)} note="Currently in progress" tone="active" /></div>
            <section className="content-card">
              <div className="card-heading border-b px-5 py-4"><h3 className="section-heading text-lg">Your requests</h3><p className="mt-1 text-xs text-[#74817b]">Track updates on the support issues you have reported.</p></div>
              {tickets.length > 0 ? (
                <>
                <div className="divide-y divide-[#edf0e7] md:hidden">{tickets.map((ticket) => (
                  <article key={ticket.id} className="space-y-3 px-5 py-4">
                    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-[#788763]">{ticket.ticket_number}</p><p className="mt-1 text-sm font-semibold text-[#344a3e]">{ticket.description}</p></div><StatusBadge status={ticket.status} /></div>
                    <div className="grid grid-cols-2 gap-3 text-xs"><div><p className="text-[#899181]">Issue</p><p className="mt-1 font-medium text-[#52605a]">{ticket.problem_type_name || problemTypeNames.get(ticket.problem_type) || "Support request"}</p></div><div><p className="text-[#899181]">Location</p><p className="mt-1 font-medium text-[#52605a]">{ticket.station_name || stationNames.get(ticket.station) || "Location"}</p></div></div>
                    <p className="text-xs text-[#7d8678]">Updated {new Date(ticket.updated_at).toLocaleDateString()}</p>
                  </article>
                ))}</div>
                <div className="hidden overflow-x-auto md:block"><table className="data-table w-full min-w-[680px] text-left">
                  <thead className="bg-[#f7f8f2] text-[10px] uppercase tracking-[0.16em] text-[#7d8678]"><tr><th className="px-5 py-3">Ticket</th><th className="px-3 py-3">Issue</th><th className="px-3 py-3">Location</th><th className="px-3 py-3">Status</th><th className="px-5 py-3">Updated</th></tr></thead>
                  <tbody>{tickets.map((ticket) => <tr key={ticket.id} className="border-t border-[#edf0e7]">
                    <td className="px-5 py-4"><p className="text-xs font-bold text-[#788763]">{ticket.ticket_number}</p><p className="mt-1 max-w-[250px] truncate text-sm">{ticket.description}</p></td>
                    <td className="px-3 py-4 text-sm">{ticket.problem_type_name || problemTypeNames.get(ticket.problem_type) || "Support request"}</td>
                    <td className="px-3 py-4 text-sm text-[#52605a]">{ticket.station_name || stationNames.get(ticket.station) || "Location"}</td>
                    <td className="px-3 py-4"><StatusBadge status={ticket.status} /></td>
                    <td className="px-5 py-4 text-sm text-[#7d8678]">{new Date(ticket.updated_at).toLocaleDateString()}</td>
                  </tr>)}</tbody>
                </table></div>
                </>
              ) : <div className="empty-state text-left"><span className="empty-state-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 7.5h14v11H5zM8 4.5h8M9 11h6M9 14.5h4" strokeLinecap="round" strokeLinejoin="round" /></svg></span><div><p className="font-semibold text-[#344a3e]">{loading ? "Loading your requests…" : "No tickets yet"}</p><p className="mt-2 text-sm text-[#7d8981]">{loading ? "Your support requests will appear here." : "When you need help, create a ticket and track it here."}</p>{!loading && <button className="primary-action mt-4 px-4 py-2.5 text-sm font-bold" onClick={() => setShowForm(true)} type="button">Create your first ticket</button>}</div></div>}
            </section>
            <p className="mt-5 text-xs text-[#7d8678]">{activeTickets.length} active request{activeTickets.length === 1 ? "" : "s"}</p>
          </div>
        </section>
      </div>
    </main>
  );
}

function SupportWelcomeCarousel({ activeIndex, setActiveIndex }: {
  activeIndex: number;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
}) {
  const [paused, setPaused] = useState(false);
  const slide = welcomeSlides[activeIndex];

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let interval: number | undefined;
    const stop = () => {
      if (interval !== undefined) window.clearInterval(interval);
      interval = undefined;
    };
    const start = () => {
      if (document.visibilityState === "visible" && interval === undefined) {
        interval = window.setInterval(() => {
          setActiveIndex((current) => (current + 1) % welcomeSlides.length);
        }, 6000);
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };
    start();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [paused, setActiveIndex]);

  return (
    <div aria-label={`Service desk welcome: ${slide.eyebrow}. ${slide.title}`} aria-roledescription="carousel" className="welcome-carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
      <Image alt={slide.imageAlt} className="welcome-artwork-image" fill priority={activeIndex === 0} sizes="(max-width: 700px) 100vw, 80vw" src={slide.image} unoptimized />
      <div aria-hidden="true" className="welcome-image-scrim" />
      <div className="welcome-carousel-controls">
        <div aria-label={`Slide ${activeIndex + 1} of ${welcomeSlides.length}`} className="welcome-carousel-dots">
          {welcomeSlides.map((item, index) => (
            <button key={item.eyebrow} aria-label={`Show welcome slide ${index + 1}`} aria-current={activeIndex === index ? "true" : undefined} onClick={() => setActiveIndex(index)} type="button" />
          ))}
        </div>
        <button aria-label="Previous welcome slide" onClick={() => setActiveIndex((activeIndex + welcomeSlides.length - 1) % welcomeSlides.length)} type="button">←</button>
        <button aria-label="Next welcome slide" onClick={() => setActiveIndex((activeIndex + 1) % welcomeSlides.length)} type="button">→</button>
      </div>
    </div>
  );
}

function RequesterImageCarousel({ images, error, onImagesSelected, onRemoveImage }: {
  images: TicketImage[];
  error: string | null;
  onImagesSelected: (files: FileList | null) => void;
  onRemoveImage: (imageId: string) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const safeActiveIndex = images.length ? activeIndex % images.length : 0;

  function showImage(index: number) {
    setActiveIndex((index + images.length) % images.length);
  }

  const activeImage = images[safeActiveIndex];

  return (
    <section aria-label="Request image carousel" className="requester-carousel mt-6 overflow-hidden rounded-[20px] border">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div><h3 className="text-sm font-bold text-[#344a3e]">Add images to your request</h3><p className="mt-1 text-xs text-[#74817b]">Attach screenshots or photos to help explain the issue (PNG, JPEG, or GIF; up to 10 MB each).</p></div>
        <div className="flex items-center gap-2">
          {activeImage && <button className="secondary-action border px-3 py-2 text-xs font-bold" onClick={() => onRemoveImage(activeImage.id)} type="button">Remove</button>}
          <button className="primary-action px-3 py-2 text-xs font-bold" onClick={() => fileInput.current?.click()} type="button">{images.length ? "+ Add more" : "+ Add images"}</button>
          <input ref={fileInput} accept="image/png,image/jpeg,image/gif" aria-label="Choose images to attach to request" className="sr-only" multiple onChange={(event) => { onImagesSelected(event.currentTarget.files); event.currentTarget.value = ""; }} type="file" />
        </div>
      </div>
      <div className="requester-carousel-stage">
        {activeImage ? (
          <>
            <Image alt={activeImage.file.name} className="requester-carousel-image" fill sizes="(max-width: 768px) 100vw, 1200px" src={activeImage.preview} unoptimized />
            <div className="requester-carousel-caption"><span className="truncate">{activeImage.file.name}</span><span>{safeActiveIndex + 1} / {images.length}</span></div>
            {images.length > 1 && <div className="requester-carousel-controls"><button aria-label="Previous image" onClick={() => showImage(safeActiveIndex - 1)} type="button">←</button><button aria-label="Next image" onClick={() => showImage(safeActiveIndex + 1)} type="button">→</button></div>}
          </>
        ) : (
          <div className="requester-carousel-empty">
            <span aria-hidden="true" className="requester-carousel-empty-icon">▧</span>
            <p className="text-sm font-semibold text-[#40594a]">No request images added</p>
            <p className="mt-1 text-xs text-[#74817b]">Selected images will be uploaded with your ticket when you submit the request.</p>
          </div>
        )}
      </div>
      {error && <p className="px-5 py-3 text-xs text-[#9a5849]" role="status">{error}</p>}
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    QUEUED: "Queued",
    IN_PROGRESS: "In progress",
    WAITING_USER: "Waiting for you",
    RESOLVED: "Resolved",
    CLOSED: "Closed",
    REOPENED: "Reopened",
  };
  const styles: Record<string, string> = {
    QUEUED: "bg-[#fff0c7] text-[#8b6200]",
    IN_PROGRESS: "bg-[#e5efff] text-[#315b9b]",
    WAITING_USER: "bg-[#fff0c7] text-[#8b6200]",
    RESOLVED: "bg-[#e8f3d2] text-[#4f6c1d]",
    CLOSED: "bg-[#f0f1ed] text-[#65705e]",
    REOPENED: "bg-[#ffe1da] text-[#a33a27]",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] ?? "bg-[#f0f1ed] text-[#65705e]"}`}>{labels[status] ?? status.replaceAll("_", " ")}</span>;
}

function Sidebar({ user }: { user: ApiUser }) {
  return (
    <aside className="app-sidebar hidden w-[248px] shrink-0 border-r px-5 py-7 text-[#263126] lg:flex lg:flex-col">
      <BrandLockup caption="Operations" className="mb-12" />
      <p className="eyebrow mb-3 px-3">Workspace</p>
      <div className="workspace-active flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold">
        <span className="h-2 w-2 rounded-full bg-[#10b981]" />Ticket queue
      </div>
      <div className="mt-auto border-t border-[#e8eadf] pt-5">
        <div className="flex items-center gap-3">
          <div className="user-avatar">{user.first_name.slice(0, 1) || user.username.slice(0, 1)}{user.last_name.slice(0, 1)}</div>
          <div><p className="text-sm font-semibold">{user.first_name || user.username}</p><p className="text-xs text-[#899181]">{user.role === "ADMIN" ? "Administrator" : "IT Officer"}</p></div>
          <span className="ml-auto rounded-full bg-[#d1fae5] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-[#047857]">{user.role === "ADMIN" ? "Admin" : "Agent"}</span>
        </div>
      </div>
    </aside>
  );
}

function Metric({ label, value, note, tone }: { label: string; value: string; note: string; tone?: "critical" | "open" | "active" }) {
  return <div className={`metric-card${tone ? ` metric-card--${tone}` : ""}`}><p className="metric-label">{label}</p><p className="metric-value">{value}</p><p className="metric-note">{note}</p></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 text-sm"><span className="text-[#526242]">{label}</span><span className="text-right font-semibold text-[#26321b]">{value}</span></div>;
}

function BrandLockup({ caption, className = "" }: { caption: string; className?: string }) {
  return (
    <div className={`brand-lockup ${className}`}>
      <span aria-hidden="true" className="brand-mark">SD</span>
      <div><p className="brand-title">Service desk</p><p className="brand-caption">{caption}</p></div>
    </div>
  );
}

function LoginScreen({ username, password, setUsername, setPassword, error, loading, onSubmit }: { username: string; password: string; setUsername: (value: string) => void; setPassword: (value: string) => void; error: string; loading: boolean; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <main className="app-shell grid min-h-screen place-items-center px-5 py-10 text-[#20291f]"><form onSubmit={onSubmit} className="login-card w-full max-w-md border bg-white p-8"><BrandLockup caption="Operations portal" className="mb-8" /><h1 className="page-title text-3xl">Sign in</h1><p className="mt-2 text-sm text-[#74817b]">Use your internal support account to continue.</p>{error && <p className="mt-5 rounded-lg border border-[#e8c2b8] bg-[#fbefeb] px-3 py-2 text-sm text-[#9a5849]">{error}</p>}<label className="mt-6 block text-sm font-semibold text-[#43503e]">Username<input required value={username} onChange={(event) => setUsername(event.target.value)} className="mt-2 w-full rounded-xl border border-[#dfe4d7] bg-white px-3 py-3 outline-none focus:border-[#9cba43] focus:ring-2 focus:ring-[#edf6ca]" autoComplete="username" /></label><label className="mt-4 block text-sm font-semibold text-[#43503e]">Password<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-[#dfe4d7] bg-white px-3 py-3 outline-none focus:border-[#9cba43] focus:ring-2 focus:ring-[#edf6ca]" autoComplete="current-password" /></label><button disabled={loading} className="primary-action mt-7 w-full px-4 py-3 font-bold disabled:opacity-60">{loading ? "Signing in..." : "Sign in"}</button></form></main>;
}
