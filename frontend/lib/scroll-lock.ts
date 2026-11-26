let locks = 0;
let previousOverflow = "";

export function lockBodyScroll(): void {
  if (typeof document === "undefined") return;
  if (locks === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  locks += 1;
}

export function unlockBodyScroll(): void {
  if (typeof document === "undefined") return;
  locks = Math.max(0, locks - 1);
  if (locks === 0) document.body.style.overflow = previousOverflow;
}
