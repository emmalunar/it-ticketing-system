export type RequesterFilter = "all" | "attention" | "handling";

export function requesterFilterFromUrl(search: string): RequesterFilter {
  const params = new URLSearchParams(search);
  const destination = params.get("view") === "requester" ? params.get("destination") : null;
  return destination === "attention" || destination === "handling" ? destination : "all";
}

export function isRequesterFilter(value: string): value is RequesterFilter {
  return value === "all" || value === "attention" || value === "handling";
}

export function scrollToRequesterDestination(id: string) {
  requestAnimationFrame(() => {
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    document.getElementById(id)?.scrollIntoView({ behavior, block: "start" });
  });
}
