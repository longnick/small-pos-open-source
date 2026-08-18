let onSessionClear: (() => void) | null = null;

export function registerSessionClear(fn: () => void): void {
  onSessionClear = fn;
}

export function runSessionClear(): void {
  onSessionClear?.();
}
