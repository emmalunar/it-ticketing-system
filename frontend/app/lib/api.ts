export type ApiUser = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  role: "USER" | "AGENT" | "ADMIN";
  priority_level: "P1" | "P2" | "P3";
  stations: { id: string; name: string; code: string }[];
};

export type QueueTicket = {
  id: string;
  ticket_number: string;
  station: { id: string; name: string };
  priority: "P1" | "P2" | "P3";
  status: string;
  created_at: string;
  assignee: string | null;
};

export type UserTicket = {
  id: string;
  ticket_number: string;
  station: string;
  station_name: string;
  problem_type: string;
  problem_type_name: string;
  description: string;
  status: string;
  priority: "P1" | "P2" | "P3";
  assignee: string | null;
  created_at: string;
  updated_at: string;
};

export type TicketOptions = {
  stations: { id: string; name: string; code: string }[];
  problem_types: { id: string; name: string; category: string }[];
};

type QueueResponse = { data: QueueTicket[] };
type SummaryResponse = { data: { p1_count: number; p2_count: number; p3_count: number } };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (init?.method && init.method.toUpperCase() !== "GET" && typeof document !== "undefined") {
    const csrfCookie = document.cookie.split("; ").find((cookie) => cookie.startsWith("csrftoken="));
    if (csrfCookie) headers.set("X-CSRFToken", csrfCookie.slice("csrftoken=".length));
  }
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? body?.error?.message ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function getCurrentUser() {
  return request<ApiUser>("/api/v1/auth/me/");
}

export function getCsrfCookie() {
  return request<{ detail: string }>("/api/v1/auth/csrf/");
}

export function login(username: string, password: string) {
  return request<{ user: ApiUser }>("/api/v1/auth/login/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function logout() {
  return request<{ detail: string }>("/api/v1/auth/logout/", { method: "POST" });
}

export function getQueue(station?: string) {
  const query = station ? `?station=${encodeURIComponent(station)}` : "";
  return request<QueueResponse>(`/api/v1/queue/${query}`);
}

export function getQueueSummary(station?: string) {
  const query = station ? `?station=${encodeURIComponent(station)}` : "";
  return request<SummaryResponse>(`/api/v1/queue/summary/${query}`);
}

export function getAccessibleTickets() {
  return request<UserTicket[]>("/api/v1/tickets/");
}

export function getTicketOptions() {
  return request<TicketOptions>("/api/v1/tickets/options/");
}

export function createTicket(input: { station: string; problem_type: string; description: string }) {
  return request<UserTicket>("/api/v1/tickets/", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function claimTicket(ticketId: string) {
  return request(`/api/v1/tickets/${ticketId}/claim/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
