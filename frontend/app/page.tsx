"use client";

import { useEffect, useState } from "react";

import { claimTicket, getCurrentUser, getQueue, getQueueSummary, login, type ApiUser } from "./lib/api";

type Priority = "P1" | "P2" | "P3";
type Ticket = {
  id: string;
  number: string;
  title: string;
  station: string;
  priority: Priority;
  status: string;
  age: string;
  owner: string;
};

const priorityStyles: Record<Priority, string> = {
  P1: "border-[#f2b1a4] bg-[#ffe1da] text-[#a33a27]",
  P2: "border-[#edd48a] bg-[#fff0c7] text-[#8b6200]",
  P3: "border-[#acd0c0] bg-[#dcece5] text-[#17624e]",
};

function formatAge(createdAt: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export default function Home() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [summary, setSummary] = useState({ p1_count: 0, p2_count: 0, p3_count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [section, setSection] = useState("Queue");

  async function loadQueue() {
    try {
      setError(null);
      const [currentUser, queue, queueSummary] = await Promise.all([getCurrentUser(), getQueue(), getQueueSummary()]);
      setUser(currentUser);
      const mapped = queue.data.map((ticket) => ({
        id: ticket.id,
        number: ticket.ticket_number,
        title: `${ticket.priority} ticket awaiting review`,
        station: ticket.station.name,
        priority: ticket.priority,
        status: ticket.status.replaceAll("_", " "),
        age: formatAge(ticket.created_at),
        owner: ticket.assignee ? "Assigned" : "Unassigned",
      }));
      setTickets(mapped);
      setSelected((current) => mapped.find((ticket) => ticket.id === current?.id) ?? mapped[0] ?? null);
      setSummary(queueSummary.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load the ticket queue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const loadTimer = window.setTimeout(() => { void loadQueue(); }, 0);
    return () => window.clearTimeout(loadTimer);
  }, []);

  async function handleClaim() {
    if (!selected || claiming) return;
    setClaiming(true);
    try {
      await claimTicket(selected.id);
      await loadQueue();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to claim this ticket.");
    } finally {
      setClaiming(false);
    }
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthenticating(true);
    setError(null);
    try {
      const result = await login(username, password);
      setUser(result.user);
      await loadQueue();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign in.");
    } finally {
      setAuthenticating(false);
    }
  }

  if (!user && (error?.includes("Authentication credentials") || error?.includes("403"))) {
    return <LoginScreen username={username} password={password} setUsername={setUsername} setPassword={setPassword} error={error} loading={authenticating} onSubmit={handleLogin} />;
  }

  return (
    <main className="min-h-screen bg-[#f4f1eb] text-[#1c2926]">
      <div className="flex min-h-screen">
        <Sidebar section={section} setSection={setSection} />
        <section className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-[#d9d7cf] bg-[#f8f6f1] px-5 py-5 sm:px-8">
            <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#71817b]">Wednesday, 24 September 2026</p><h1 className="mt-1 font-sans text-3xl font-bold tracking-tight sm:text-4xl">Good morning, {user?.first_name || "there"}</h1></div>
            <div className="flex items-center gap-3"><button className="hidden rounded-lg border border-[#d0d2ca] bg-white px-4 py-2.5 text-sm font-semibold text-[#36534b] sm:block">+ New ticket</button><button aria-label="Notifications" className="relative grid h-10 w-10 place-items-center rounded-lg border border-[#d0d2ca] bg-white text-[#36534b]">◌<span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#d86d52]" /></button><div className="grid h-10 w-10 place-items-center rounded-full bg-[#d7e5de] text-xs font-bold text-[#31574f]">KM</div></div>
          </header>
          <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8">
            <div className="mb-7 flex items-end justify-between"><div><p className="text-sm font-medium text-[#71817b]">Live station overview</p><h2 className="mt-1 font-sans text-2xl font-bold tracking-tight">Today&apos;s queue</h2></div><label className="hidden items-center gap-2 text-sm text-[#71817b] sm:flex">Station <select className="rounded-lg border border-[#cbd8cd] bg-white px-3 py-2 font-semibold text-[#36534b] shadow-sm outline-none transition focus:border-[#31574f] focus:ring-2 focus:ring-[#d7ead7]"><option>All authorised stations</option><option>Head Office</option><option>Tesano</option></select></label></div>
            {error && <div className="mb-5 rounded-xl border border-[#f2b1a4] bg-[#ffe1da] px-4 py-3 text-sm text-[#a33a27]">{error} <button className="ml-3 font-bold underline" onClick={() => { setLoading(true); void loadQueue(); }}>Retry</button></div>}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Waiting now" value={String(summary.p2_count + summary.p3_count)} note="P2 and P3 in queue" /><Metric label="P1 critical" value={String(summary.p1_count)} note="Immediate handling" /><Metric label="My workload" value="—" note={user ? user.role : "Loading"} /><Metric label="Queue status" value={loading ? "…" : "Live"} note="Django API connected" /></div>
            <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <section className="overflow-hidden rounded-2xl border border-[#d9d7cf] bg-[#fbfaf7] shadow-[0_12px_30px_rgba(49,67,59,0.06)]"><div className="flex items-center justify-between border-b border-[#e2e0d8] px-5 py-4"><div><h3 className="font-sans text-xl font-bold">Station queue</h3><p className="mt-1 text-xs text-[#71817b]">Prioritised by urgency, then arrival time</p></div><button className="rounded-lg border border-[#d0d2ca] px-3 py-2 text-xs font-bold text-[#36534b] transition hover:bg-[#f0f5ef]" onClick={() => { setLoading(true); void loadQueue(); }}>Refresh</button></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead className="bg-[#f3f1eb] text-[10px] uppercase tracking-[0.16em] text-[#71817b]"><tr><th className="px-5 py-3">Ticket</th><th className="px-3 py-3">Priority</th><th className="px-3 py-3">Station</th><th className="px-3 py-3">Status</th><th className="px-5 py-3">Owner</th></tr></thead><tbody>{tickets.map((ticket) => <tr key={ticket.id} onClick={() => setSelected(ticket)} className={`cursor-pointer border-t border-[#ebe9e2] hover:bg-[#f2f5ef] ${selected?.id === ticket.id ? "bg-[#edf4ee]" : ""}`}><td className="px-5 py-4"><p className="text-xs font-bold text-[#668078]">{ticket.number}</p><p className="mt-1 max-w-[230px] truncate text-sm font-semibold">{ticket.title}</p><p className="mt-1 text-xs text-[#8b9791]">Opened {ticket.age} ago</p></td><td className="px-3 py-4"><span className={`rounded-md border px-2 py-1 text-[10px] font-bold ${priorityStyles[ticket.priority]}`}>{ticket.priority}</span></td><td className="px-3 py-4 text-sm text-[#52665e]">{ticket.station}</td><td className="px-3 py-4 text-xs font-semibold text-[#52665e]">{ticket.status}</td><td className="px-5 py-4 text-sm text-[#52665e]">{ticket.owner}</td></tr>)}</tbody></table>{!loading && tickets.length === 0 && <p className="px-5 py-12 text-center text-sm text-[#71817b]">No tickets are waiting in your authorised queue.</p>}</div></section>
              {selected ? <aside className="ticket-panel rounded-2xl border border-[#63c900] bg-[#7CFC00] p-6 text-[#17350d] shadow-[0_14px_32px_rgba(91,170,0,0.2)]"><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#356a12]">Selected ticket</p><h3 className="mt-2 font-sans text-2xl font-bold tracking-tight">{selected.number}</h3></div><span className={`rounded-md border px-2 py-1 text-[10px] font-bold ${priorityStyles[selected.priority]}`}>{selected.priority}</span></div><p className="mt-7 text-lg font-bold">{selected.title}</p><div className="mt-6 space-y-4 border-y border-[#62c610] py-5"><Detail label="Station" value={selected.station} /><Detail label="Status" value={selected.status} /><Detail label="Current owner" value={selected.owner} /><Detail label="Queue age" value={selected.age} /></div><p className="mt-6 text-sm leading-6 text-[#285613]">This ticket is within your authorised station scope. Review the issue, claim responsibility, or transfer it to another team.</p><div className="mt-6 grid grid-cols-2 gap-3"><button disabled={claiming || selected.owner !== "Unassigned"} onClick={() => void handleClaim()} className="rounded-lg bg-[#17350d] px-3 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#285613] disabled:cursor-not-allowed disabled:opacity-50">{claiming ? "Claiming…" : "Claim ticket"}</button><button className="rounded-lg border border-[#3a780d] px-3 py-3 text-sm font-bold text-[#17350d] transition hover:bg-[#a3ff52]">Open details</button></div></aside> : <aside className="rounded-2xl bg-[#203c37] p-6 text-[#b7cdc3]">Select a ticket to view its details.</aside>}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Sidebar({ section, setSection }: { section: string; setSection: (value: string) => void }) {
  const workspace = ["Queue", "My tickets", "All tickets", "Reports"];
  return <aside className="hidden w-[248px] shrink-0 border-r border-[#d9d7cf] bg-[#203c37] px-5 py-7 text-[#f5f0e6] lg:flex lg:flex-col"><div className="mb-12 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e0a34a] text-lg font-black text-[#203c37]">IT</div><div><p className="font-serif text-lg">Service desk</p><p className="text-[10px] uppercase tracking-[0.2em] text-[#a9c4b8]">Operations</p></div></div><p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8eafa2]">Workspace</p><nav className="space-y-1">{workspace.map((item) => <button key={item} onClick={() => setSection(item)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm ${section === item ? "bg-[#31574f] text-white" : "text-[#b7cdc3] hover:bg-[#294b44]"}`}><span className="h-1.5 w-1.5 rounded-full bg-[#e0a34a]" />{item}{item === "Queue" && <span className="ml-auto rounded-full bg-[#e0a34a] px-2 py-0.5 text-[10px] font-bold text-[#203c37]">8</span>}</button>)}</nav><p className="mb-3 mt-10 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8eafa2]">Manage</p><nav className="space-y-1">{["Stations", "Team", "Audit log"].map((item) => <button key={item} onClick={() => setSection(item)} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-[#b7cdc3] hover:bg-[#294b44]"><span className="h-1.5 w-1.5 rounded-full border border-[#8eafa2]" />{item}</button>)}</nav><div className="mt-auto border-t border-[#42665c] pt-5"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-[#b8d3c8] text-sm font-bold text-[#203c37]">KM</div><div><p className="text-sm font-semibold">Kofi Mensah</p><p className="text-xs text-[#8eafa2]">Support agent</p></div><span className="ml-auto h-2 w-2 rounded-full bg-[#6bd19e]" /></div></div></aside>;
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) { return <div className="rounded-2xl border border-[#d9d7cf] bg-[#fbfaf7] p-5 shadow-[0_8px_20px_rgba(49,67,59,0.04)]"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#71817b]">{label}</p><p className="mt-4 font-serif text-4xl">{value}</p><p className="mt-2 text-xs font-semibold text-[#71817b]">{note}</p></div>; }
function Detail({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-3 text-sm"><span className="text-[#356a12]">{label}</span><span className="text-right font-semibold text-[#17350d]">{value}</span></div>; }

function LoginScreen({ username, password, setUsername, setPassword, error, loading, onSubmit }: { username: string; password: string; setUsername: (value: string) => void; setPassword: (value: string) => void; error: string; loading: boolean; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <main className="grid min-h-screen place-items-center bg-[#203c37] px-5 py-10 text-[#1c2926]"><form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl bg-[#fbfaf7] p-8 shadow-2xl"><div className="mb-8 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#e0a34a] font-black text-[#203c37]">IT</div><div><p className="font-serif text-xl">Service desk</p><p className="text-xs uppercase tracking-[0.18em] text-[#71817b]">Operations portal</p></div></div><h1 className="font-serif text-3xl">Sign in</h1><p className="mt-2 text-sm text-[#71817b]">Use your internal support account to continue.</p>{error && <p className="mt-5 rounded-lg border border-[#f2b1a4] bg-[#ffe1da] px-3 py-2 text-sm text-[#a33a27]">{error}</p>}<label className="mt-6 block text-sm font-semibold text-[#36534b]">Username<input required value={username} onChange={(event) => setUsername(event.target.value)} className="mt-2 w-full rounded-lg border border-[#d0d2ca] bg-white px-3 py-3 outline-none focus:border-[#31574f]" autoComplete="username" /></label><label className="mt-4 block text-sm font-semibold text-[#36534b]">Password<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-[#d0d2ca] bg-white px-3 py-3 outline-none focus:border-[#31574f]" autoComplete="current-password" /></label><button disabled={loading} className="mt-7 w-full rounded-lg bg-[#203c37] px-4 py-3 font-bold text-white disabled:opacity-60">{loading ? "Signing in..." : "Sign in"}</button></form></main>;
}
