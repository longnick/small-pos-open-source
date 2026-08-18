const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

const attempts = new Map<string, number[]>();

export function allowPinAttempt(staffId: string, now = Date.now()): boolean {
  if (typeof staffId !== "string" || staffId.trim().length === 0) return false;
  const recent = (attempts.get(staffId) ?? []).filter((stamp) => now - stamp < WINDOW_MS);
  if (recent.length >= MAX_ATTEMPTS) {
    attempts.set(staffId, recent);
    return false;
  }
  recent.push(now);
  attempts.set(staffId, recent);
  return true;
}

export function resetPinAttempts(): void {
  attempts.clear();
}
