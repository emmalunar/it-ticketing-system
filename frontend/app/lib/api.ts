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

type QueueResponse = { data: QueueTicket[] };
type SummaryResponse = { data: { p1_count: number; p2_count: number; p3_count: number } };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
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

export function login(username: string, password: string) {
  return request<{ user: ApiUser }>("/api/v1/auth/login/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function getQueue(station?: string) {
  const query = station ? `?station=${encodeURIComponent(station)}` : "";
  return request<QueueResponse>(`/api/v1/queue/${query}`);
}

export function getQueueSummary(station?: string) {
  const query = station ? `?station=${encodeURIComponent(station)}` : "";
  return request<SummaryResponse>(`/api/v1/queue/summary/${query}`);
}

export function claimTicket(ticketId: string) {
  return request(`/api/v1/tickets/${ticketId}/claim/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
