export type PosMode = "demo" | "production-local";

export function resolvePosMode(value: string | undefined): PosMode {
  return value === "demo" || value === "production-local" ? value : "demo";
}

export function shouldBootstrapDemoAuth(mode: PosMode): boolean {
  return mode === "demo";
}

export function loginVenueName(mode: PosMode, tenantName?: string): string {
  const trimmed = tenantName?.trim();
  if (trimmed) return trimmed;
  return mode === "production-local" ? "Chưa thiết lập quán" : "Quán Demo";
}
