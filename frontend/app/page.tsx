"use client";

import { useEffect, useRef, useState } from "react";

import {
  claimTicket,
  createTicket,
  getAccessibleTickets,
  getCurrentUser,
  getCsrfCookie,
  getQueue,
  getQueueSummary,
  getTicketOptions,
  login,
  logout,
  type ApiUser,
  type TicketOptions,
  type UserTicket,
} from "./lib/api";

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

type HeroSlide = {
  id: string;
  title: string;
  description: string;
  image: string;
};

const initialSlides: HeroSlide[] = [
  {
    id: "workspace",
    title: "Support that keeps work moving.",
    description: "A clearer view of your team's day, all in one place.",
    image: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1800&q=85",
  },
  {
    id: "team",
    title: "Better together, every day.",
    description: "Stay connected to the people and requests that need you.",
    image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1800&q=85",
  },
  {
    id: "focus",
    title: "Find focus in the busy moments.",
    description: "Keep priorities in sight and help your team move forward.",
    image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1800&q=85",
  },
];

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
  const [myTickets, setMyTickets] = useState<UserTicket[]>([]);
  const [ticketOptions, setTicketOptions] = useState<TicketOptions | null>(null);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [summary, setSummary] = useState({ p1_count: 0, p2_count: 0, p3_count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [slides, setSlides] = useState(initialSlides);
  const [activeSlide, setActiveSlide] = useState(0);

  async function loadDashboard() {
    try {
      setError(null);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      if (currentUser.role === "USER") {
        const [userTickets, options] = await Promise.all([getAccessibleTickets(), getTicketOptions()]);
        setMyTickets(userTickets);
        setTicketOptions(options);
        setTickets([]);
        setSummary({ p1_count: 0, p2_count: 0, p3_count: 0 });
        return;
      }
      const [queue, queueSummary, accessibleTickets] = await Promise.all([getQueue(), getQueueSummary(), getAccessibleTickets()]);
      const activeStatuses = new Set(["QUEUED", "IN_PROGRESS", "WAITING_USER", "REOPENED"]);
      const urgentTickets = accessibleTickets.filter((ticket) => ticket.priority === "P1" && activeStatuses.has(ticket.status));
      const stationNames = new Map(currentUser.stations.map((station) => [station.id, station.name]));
      const mappedUrgent = urgentTickets.map((ticket) => ({
        id: ticket.id,
        number: ticket.ticket_number,
        title: ticket.description,
        station: ticket.station_name || stationNames.get(ticket.station) || "Station",
        priority: ticket.priority,
        status: ticket.status.replaceAll("_", " "),
        age: formatAge(ticket.created_at),
        owner: ticket.assignee ? "Assigned" : "Unassigned",
      }));
      const mappedQueue = queue.data.map((ticket) => ({
        id: ticket.id,
        number: ticket.ticket_number,
        title: `${ticket.priority} ticket awaiting review`,
        station: ticket.station.name,
        priority: ticket.priority,
        status: ticket.status.replaceAll("_", " "),
        age: formatAge(ticket.created_at),
        owner: ticket.assignee ? "Assigned" : "Unassigned",
      }));
      const mapped = [...mappedUrgent, ...mappedQueue];
      setTickets(mapped);
      setSelected((current) => mapped.find((ticket) => ticket.id === current?.id) ?? mapped[0] ?? null);
      setSummary(queueSummary.data);
      setMyTickets([]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load your dashboard.");
    } finally {
      setLoading(false);
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

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthenticating(true);
    setError(null);
    try {
      await getCsrfCookie();
      const result = await login(username, password);
      setUser(result.user);
      await loadDashboard();
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

  if (!user && (error?.includes("Authentication credentials") || error?.includes("403"))) {
    return <LoginScreen username={username} password={password} setUsername={setUsername} setPassword={setPassword} error={error} loading={authenticating} onSubmit={handleLogin} />;
  }

  if (!user) {
    return <main className="grid min-h-screen place-items-center bg-[#f7f8f2] px-5 text-[#20291f]"><div className="max-w-md rounded-3xl border border-[#e8eadf] bg-white p-8 text-center shadow-sm"><p className="text-lg font-semibold">{loading ? "Connecting to the service desk…" : "We couldn’t load your dashboard."}</p>{error && <p className="mt-3 text-sm text-[#a33a27]">{error}</p>}<button className="mt-5 rounded-xl bg-[#d8f36a] px-4 py-2.5 text-sm font-bold text-[#243118]" onClick={() => { setLoading(true); void loadDashboard(); }} type="button">Retry</button></div></main>;
  }

  if (user.role === "USER") {
    return (
      <UserDashboard
        user={user}
        tickets={myTickets}
        options={ticketOptions}
        slides={slides}
        activeSlide={activeSlide}
        setActiveSlide={setActiveSlide}
        setSlides={setSlides}
        loading={loading}
        error={error}
        onRefresh={() => { setLoading(true); void loadDashboard(); }}
        onTicketCreated={() => { setLoading(true); void loadDashboard(); }}
        onError={setError}
        onLogout={() => void handleLogout()}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8f2] text-[#20291f]">
      <div className="flex min-h-screen">
        <Sidebar user={user} />
        <section className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-[#e8eadf] bg-white/80 px-5 py-5 sm:px-8">
            <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7d8678]">IT Officer workspace</p><h1 className="mt-1 font-sans text-2xl font-bold tracking-tight sm:text-3xl">Good morning, {user.first_name || "there"}</h1></div>
            <div className="flex items-center gap-3"><button aria-label="Notifications" className="relative grid h-10 w-10 place-items-center rounded-xl border border-[#e5e8dc] bg-white text-[#43503e]">◌<span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#e17b5f]" /></button><div className="grid h-10 w-10 place-items-center rounded-full bg-[#e7edda] text-xs font-bold text-[#43503e]">{user.first_name.slice(0, 1)}{user.last_name.slice(0, 1)}</div><button className="text-sm font-semibold text-[#65705e] hover:text-[#26321b]" onClick={() => void handleLogout()} type="button">Sign out</button></div>
          </header>
          <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8">
            <div className="mb-6 flex items-end justify-between"><div><p className="text-sm font-medium text-[#7d8678]">Live station overview</p><h2 className="mt-1 font-sans text-2xl font-bold tracking-tight">Ticket queue</h2></div><div className="text-sm font-medium text-[#7d8678]">{user?.stations.map((station) => station.name).join(", ") || "All stations"}</div></div>
            {error && <div className="mb-5 rounded-xl border border-[#f2b1a4] bg-[#ffe1da] px-4 py-3 text-sm text-[#a33a27]">{error} <button className="ml-3 font-bold underline" onClick={() => { setLoading(true); void loadDashboard(); }}>Retry</button></div>}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Waiting now" value={String(summary.p2_count + summary.p3_count)} note="P2 and P3 in queue" /><Metric label="P1 critical" value={String(summary.p1_count)} note="Immediate handling" /><Metric label="My workload" value="—" note={user ? user.role : "Loading"} /><Metric label="Queue status" value={loading ? "…" : "Live"} note="Django API connected" /></div>
            <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <section className="overflow-hidden rounded-3xl border border-[#e8eadf] bg-white shadow-[0_12px_30px_rgba(49,67,59,0.045)]">
                <div className="flex items-center justify-between border-b border-[#edf0e7] px-5 py-4">
                  <div><h3 className="font-sans text-xl font-bold">Station queue</h3><p className="mt-1 text-xs text-[#7d8678]">Prioritised by urgency, then arrival time</p></div>
                  <button className="rounded-xl border border-[#e2e7d8] px-3 py-2 text-xs font-bold text-[#43503e] transition hover:bg-[#f5f7ef]" onClick={() => { setLoading(true); void loadDashboard(); }}>Refresh</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left">
                    <thead className="bg-[#f7f8f2] text-[10px] uppercase tracking-[0.16em] text-[#7d8678]"><tr><th className="px-5 py-3">Ticket</th><th className="px-3 py-3">Priority</th><th className="px-3 py-3">Station</th><th className="px-3 py-3">Status</th><th className="px-5 py-3">Owner</th></tr></thead>
                    <tbody>{tickets.map((ticket) => <tr key={ticket.id} onClick={() => setSelected(ticket)} className={`cursor-pointer border-t border-[#edf0e7] transition hover:bg-[#f8faef] ${selected?.id === ticket.id ? "bg-[#f2f7df]" : ""}`}>
                      <td className="px-5 py-4"><p className="text-xs font-bold text-[#788763]">{ticket.number}</p><p className="mt-1 max-w-[230px] truncate text-sm font-semibold">{ticket.title}</p><p className="mt-1 text-xs text-[#899181]">Opened {ticket.age} ago</p></td>
                      <td className="px-3 py-4"><span className={`rounded-md border px-2 py-1 text-[10px] font-bold ${priorityStyles[ticket.priority]}`}>{ticket.priority}</span></td>
                      <td className="px-3 py-4 text-sm text-[#52605a]">{ticket.station}</td><td className="px-3 py-4 text-xs font-semibold text-[#52605a]">{ticket.status}</td><td className="px-5 py-4 text-sm text-[#52605a]">{ticket.owner}</td>
                    </tr>)}</tbody>
                  </table>
                  {!loading && tickets.length === 0 && <p className="px-5 py-12 text-center text-sm text-[#7d8678]">No tickets are waiting in your authorised queue.</p>}
                </div>
              </section>
              {selected ? (
                <aside className="rounded-3xl border border-[#dce8b1] bg-[#eff7d1] p-6 text-[#26321b] shadow-[0_14px_32px_rgba(91,120,39,0.08)]">
                  <div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#667c31]">Selected ticket</p><h3 className="mt-2 font-sans text-2xl font-bold tracking-tight">{selected.number}</h3></div><span className={`rounded-md border px-2 py-1 text-[10px] font-bold ${priorityStyles[selected.priority]}`}>{selected.priority}</span></div>
                  <p className="mt-7 text-lg font-bold">{selected.title}</p>
                  <div className="mt-6 space-y-4 border-y border-[#dce8b1] py-5"><Detail label="Station" value={selected.station} /><Detail label="Status" value={selected.status} /><Detail label="Current owner" value={selected.owner} /><Detail label="Queue age" value={selected.age} /></div>
                  <p className="mt-6 text-sm leading-6 text-[#526242]">This ticket is within your authorised station scope. Review the issue, claim responsibility, or transfer it to another team.</p>
                  <div className="mt-6 grid grid-cols-2 gap-3"><button disabled={claiming || selected.owner !== "Unassigned"} onClick={() => void handleClaim()} className="rounded-xl bg-[#29351d] px-3 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#3a4b25] disabled:cursor-not-allowed disabled:opacity-50">{claiming ? "Claiming…" : "Claim ticket"}</button><button className="rounded-xl border border-[#bdcd83] px-3 py-3 text-sm font-bold text-[#354322] transition hover:bg-[#e3efbc]">Open details</button></div>
                </aside>
              ) : <aside className="rounded-3xl border border-[#e8eadf] bg-white p-6 text-[#7d8678]">Select a ticket to view its details.</aside>}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function ImageCarousel({
  slides,
  activeSlide,
  setActiveSlide,
  setSlides,
}: {
  slides: HeroSlide[];
  activeSlide: number;
  setActiveSlide: (index: number) => void;
  setSlides: (updater: (current: HeroSlide[]) => HeroSlide[]) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadedImages = useRef<string[]>([]);
  const slide = slides[activeSlide] ?? slides[0];

  useEffect(() => () => {
    uploadedImages.current.forEach((imageUrl) => URL.revokeObjectURL(imageUrl));
  }, []);

  function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    const newSlides = imageFiles.map((file) => {
      const image = URL.createObjectURL(file);
      uploadedImages.current.push(image);
      return {
        id: `${file.name}-${image}`,
        title: file.name,
        description: "A fresh image for your service desk.",
        image,
      };
    });

    if (newSlides.length > 0) {
      setSlides((current) => [...current, ...newSlides]);
      setActiveSlide(slides.length);
    }
    event.currentTarget.value = "";
  }

  function moveSlide(direction: number) {
    setActiveSlide((activeSlide + direction + slides.length) % slides.length);
  }

  return (
    <section
      aria-label="Service desk highlights"
      aria-roledescription="carousel"
      className="relative mb-7 min-h-[270px] overflow-hidden rounded-[28px] bg-[#344438] text-white shadow-[0_18px_44px_rgba(38,51,34,0.14)] sm:min-h-[320px]"
    >
      <div
        aria-label={slide.title}
        className="absolute inset-0 bg-cover bg-center transition-[background-image] duration-300"
        role="img"
        style={{ backgroundImage: `linear-gradient(90deg, rgba(22,34,25,.88) 0%, rgba(22,34,25,.64) 48%, rgba(22,34,25,.08) 100%), url("${slide.image}")` }}
      />
      <div className="relative flex min-h-[270px] flex-col justify-between p-6 sm:min-h-[320px] sm:p-9">
        <div className="flex items-start justify-between gap-4">
          <span className="rounded-full bg-[#d8f36a] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.17em] text-[#26321b]">Service desk stories</span>
          <button
            className="rounded-full border border-white/40 bg-black/20 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d8f36a]"
            onClick={() => fileInput.current?.click()}
            type="button"
          >
            + Add images
          </button>
          <input
            ref={fileInput}
            accept="image/*"
            aria-label="Choose images for the carousel"
            className="sr-only"
            multiple
            onChange={handleImageUpload}
            type="file"
          />
        </div>
        <div className="max-w-xl py-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#d8f36a]">A better day starts here</p>
          <h2 className="max-w-lg text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">{slide.title}</h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-white/80 sm:text-base">{slide.description}</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2" aria-label={`Slide ${activeSlide + 1} of ${slides.length}`}>
            {slides.map((item, index) => (
              <button
                key={item.id}
                aria-label={`Show slide ${index + 1}: ${item.title}`}
                aria-current={activeSlide === index ? "true" : undefined}
                className={`h-2 rounded-full transition-all ${activeSlide === index ? "w-8 bg-[#d8f36a]" : "w-2 bg-white/60 hover:bg-white"}`}
                onClick={() => setActiveSlide(index)}
                type="button"
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button aria-label="Previous slide" className="grid h-10 w-10 place-items-center rounded-full border border-white/40 bg-black/20 text-lg backdrop-blur-sm transition hover:bg-white/20" onClick={() => moveSlide(-1)} type="button">←</button>
            <button aria-label="Next slide" className="grid h-10 w-10 place-items-center rounded-full border border-white/40 bg-black/20 text-lg backdrop-blur-sm transition hover:bg-white/20" onClick={() => moveSlide(1)} type="button">→</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function UserDashboard({
  user,
  tickets,
  options,
  slides,
  activeSlide,
  setActiveSlide,
  setSlides,
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
  slides: HeroSlide[];
  activeSlide: number;
  setActiveSlide: (index: number) => void;
  setSlides: (updater: (current: HeroSlide[]) => HeroSlide[]) => void;
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
  const [submitting, setSubmitting] = useState(false);
  const stationNames = new Map((options?.stations ?? []).map((item) => [item.id, item.name]));
  const problemTypeNames = new Map((options?.problem_types ?? []).map((item) => [item.id, item.name]));
  const activeTickets = tickets.filter((ticket) => !["RESOLVED", "CLOSED"].includes(ticket.status));
  const waitingTickets = tickets.filter((ticket) => ["QUEUED", "WAITING_USER", "REOPENED"].includes(ticket.status));

  async function submitTicket(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    onError(null);
    try {
      await createTicket({ station, problem_type: problemType, description });
      setDescription("");
      setStation("");
      setProblemType("");
      setShowForm(false);
      onTicketCreated();
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Unable to submit your ticket.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8f2] text-[#20291f]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[248px] shrink-0 border-r border-[#e8eadf] bg-white px-5 py-7 text-[#263126] lg:flex lg:flex-col">
          <div className="mb-12 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#d8f36a] text-lg font-black text-[#26321b]">IT</div>
            <div><p className="font-serif text-lg">Service desk</p><p className="text-[10px] uppercase tracking-[0.2em] text-[#899181]">Requester portal</p></div>
          </div>
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#899181]">My workspace</p>
          <div className="rounded-xl bg-[#eff5d8] px-3 py-3 text-sm font-semibold text-[#354322]"><span className="mr-3 inline-block h-2 w-2 rounded-full bg-[#9bbd36]" />My tickets</div>
          <div className="mt-auto border-t border-[#e8eadf] pt-5">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[#e7edda] text-sm font-bold text-[#43503e]">{user.first_name.slice(0, 1)}{user.last_name.slice(0, 1)}</div>
              <div><p className="text-sm font-semibold">{user.first_name || user.username}</p><p className="text-xs text-[#899181]">Requester</p></div>
            </div>
          </div>
        </aside>
        <section className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-[#e8eadf] bg-white/80 px-5 py-5 sm:px-8">
            <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7d8678]">Requester portal</p><h1 className="mt-1 font-sans text-2xl font-bold tracking-tight sm:text-3xl">Hello, {user.first_name || user.username}</h1></div>
            <div className="flex items-center gap-3"><button className="rounded-xl bg-[#d8f36a] px-4 py-2.5 text-sm font-bold text-[#243118] shadow-sm transition hover:bg-[#c9e957]" onClick={() => setShowForm((visible) => !visible)} type="button">{showForm ? "Close form" : "+ New ticket"}</button><button className="text-sm font-semibold text-[#65705e] hover:text-[#26321b]" onClick={onLogout} type="button">Sign out</button></div>
          </header>
          <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8">
            <ImageCarousel slides={slides} activeSlide={activeSlide} setActiveSlide={setActiveSlide} setSlides={setSlides} />
            {error && <div className="mb-5 rounded-xl border border-[#f2b1a4] bg-[#ffe1da] px-4 py-3 text-sm text-[#a33a27]">{error}<button className="ml-3 font-bold underline" onClick={onRefresh} type="button">Retry</button></div>}
            {showForm && (
              <form onSubmit={submitTicket} className="mb-7 rounded-3xl border border-[#e8eadf] bg-white p-5 shadow-[0_12px_30px_rgba(49,67,59,0.045)] sm:p-7">
                <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#7d8678]">Get support</p><h2 className="mt-1 text-xl font-bold">Tell us what you need help with</h2></div>
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
                <div className="mt-5 flex justify-end"><button disabled={submitting || !options?.stations.length || !options.problem_types.length} className="rounded-xl bg-[#29351d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#3a4b25] disabled:cursor-not-allowed disabled:opacity-50" type="submit">{submitting ? "Submitting…" : "Submit request"}</button></div>
                {options && (!options.stations.length || !options.problem_types.length) && <p className="mt-3 text-sm text-[#8b6200]">Ticket submission is unavailable because no active locations or issue types are configured.</p>}
              </form>
            )}
            <div className="mb-6 flex items-end justify-between"><div><p className="text-sm font-medium text-[#7d8678]">Your support requests</p><h2 className="mt-1 text-2xl font-bold tracking-tight">My tickets</h2></div><button className="rounded-xl border border-[#e2e7d8] bg-white px-3 py-2 text-xs font-bold text-[#43503e] transition hover:bg-[#f5f7ef]" onClick={onRefresh} type="button">Refresh</button></div>
            <div className="mb-6 grid gap-4 sm:grid-cols-3"><Metric label="Total requests" value={String(tickets.length)} note="All time" /><Metric label="Need attention" value={String(waitingTickets.length)} note="Waiting or reopened" /><Metric label="Being handled" value={String(tickets.filter((ticket) => ticket.status === "IN_PROGRESS").length)} note="Currently in progress" /></div>
            <section className="overflow-hidden rounded-3xl border border-[#e8eadf] bg-white shadow-[0_12px_30px_rgba(49,67,59,0.045)]">
              <div className="border-b border-[#edf0e7] px-5 py-4"><h3 className="text-xl font-bold">Your requests</h3><p className="mt-1 text-xs text-[#7d8678]">Track updates on the support issues you have reported.</p></div>
              {tickets.length > 0 ? (
                <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left">
                  <thead className="bg-[#f7f8f2] text-[10px] uppercase tracking-[0.16em] text-[#7d8678]"><tr><th className="px-5 py-3">Ticket</th><th className="px-3 py-3">Issue</th><th className="px-3 py-3">Location</th><th className="px-3 py-3">Status</th><th className="px-5 py-3">Updated</th></tr></thead>
                  <tbody>{tickets.map((ticket) => <tr key={ticket.id} className="border-t border-[#edf0e7]">
                    <td className="px-5 py-4"><p className="text-xs font-bold text-[#788763]">{ticket.ticket_number}</p><p className="mt-1 max-w-[250px] truncate text-sm">{ticket.description}</p></td>
                    <td className="px-3 py-4 text-sm">{ticket.problem_type_name || problemTypeNames.get(ticket.problem_type) || "Support request"}</td>
                    <td className="px-3 py-4 text-sm text-[#52605a]">{ticket.station_name || stationNames.get(ticket.station) || "Location"}</td>
                    <td className="px-3 py-4"><StatusBadge status={ticket.status} /></td>
                    <td className="px-5 py-4 text-sm text-[#7d8678]">{new Date(ticket.updated_at).toLocaleDateString()}</td>
                  </tr>)}</tbody>
                </table></div>
              ) : <div className="px-5 py-14 text-center"><p className="font-semibold">{loading ? "Loading your requests…" : "No tickets yet"}</p><p className="mt-2 text-sm text-[#7d8678]">{loading ? "Your support requests will appear here." : "When you need help, create a ticket and track it here."}</p>{!loading && <button className="mt-5 rounded-xl bg-[#d8f36a] px-4 py-2.5 text-sm font-bold text-[#243118]" onClick={() => setShowForm(true)} type="button">Create your first ticket</button>}</div>}
            </section>
            <p className="mt-5 text-xs text-[#7d8678]">{activeTickets.length} active request{activeTickets.length === 1 ? "" : "s"}</p>
          </div>
        </section>
      </div>
    </main>
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
    <aside className="hidden w-[248px] shrink-0 border-r border-[#e8eadf] bg-white px-5 py-7 text-[#263126] lg:flex lg:flex-col">
      <div className="mb-12 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#d8f36a] text-lg font-black text-[#26321b]">IT</div>
        <div><p className="font-serif text-lg">Service desk</p><p className="text-[10px] uppercase tracking-[0.2em] text-[#899181]">Operations</p></div>
      </div>
      <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#899181]">Workspace</p>
      <div className="flex items-center gap-3 rounded-xl bg-[#eff5d8] px-3 py-3 text-sm font-semibold text-[#354322]">
        <span className="h-2 w-2 rounded-full bg-[#9bbd36]" />Ticket queue
      </div>
      <div className="mt-auto border-t border-[#e8eadf] pt-5">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-[#e7edda] text-sm font-bold text-[#43503e]">{user.first_name.slice(0, 1)}{user.last_name.slice(0, 1)}</div>
          <div><p className="text-sm font-semibold">{user.first_name || user.username}</p><p className="text-xs text-[#899181]">{user.role === "ADMIN" ? "Administrator" : "IT Officer"}</p></div>
          <span className="ml-auto h-2 w-2 rounded-full bg-[#9bbd36]" />
        </div>
      </div>
    </aside>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-2xl border border-[#e8eadf] bg-white p-5 shadow-[0_8px_20px_rgba(49,67,59,0.035)]"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7d8678]">{label}</p><p className="mt-4 font-serif text-4xl">{value}</p><p className="mt-2 text-xs font-semibold text-[#7d8678]">{note}</p></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 text-sm"><span className="text-[#526242]">{label}</span><span className="text-right font-semibold text-[#26321b]">{value}</span></div>;
}

function LoginScreen({ username, password, setUsername, setPassword, error, loading, onSubmit }: { username: string; password: string; setUsername: (value: string) => void; setPassword: (value: string) => void; error: string; loading: boolean; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  const isAuthenticationRequired = error.includes("Authentication credentials") || error.includes("403");
  const visibleError = isAuthenticationRequired ? "" : error;
  return <main className="grid min-h-screen place-items-center bg-[#f4f6ed] px-5 py-10 text-[#20291f]"><form onSubmit={onSubmit} className="w-full max-w-md rounded-[28px] border border-[#e8eadf] bg-white p-8 shadow-[0_20px_60px_rgba(41,53,34,0.1)]"><div className="mb-8 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#d8f36a] font-black text-[#26321b]">IT</div><div><p className="font-serif text-xl">Service desk</p><p className="text-xs uppercase tracking-[0.18em] text-[#7d8678]">Operations portal</p></div></div><h1 className="font-serif text-3xl">Sign in</h1><p className="mt-2 text-sm text-[#7d8678]">Use your internal support account to continue.</p>{visibleError && <p className="mt-5 rounded-lg border border-[#f2b1a4] bg-[#ffe1da] px-3 py-2 text-sm text-[#a33a27]">{visibleError}</p>}<label className="mt-6 block text-sm font-semibold text-[#43503e]">Username<input required value={username} onChange={(event) => setUsername(event.target.value)} className="mt-2 w-full rounded-xl border border-[#dfe4d7] bg-white px-3 py-3 outline-none focus:border-[#9cba43] focus:ring-2 focus:ring-[#edf6ca]" autoComplete="username" /></label><label className="mt-4 block text-sm font-semibold text-[#43503e]">Password<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-[#dfe4d7] bg-white px-3 py-3 outline-none focus:border-[#9cba43] focus:ring-2 focus:ring-[#edf6ca]" autoComplete="current-password" /></label><button disabled={loading} className="mt-7 w-full rounded-xl bg-[#d8f36a] px-4 py-3 font-bold text-[#26321b] transition hover:bg-[#c9e957] disabled:opacity-60">{loading ? "Signing in..." : "Sign in"}</button></form></main>;
}
