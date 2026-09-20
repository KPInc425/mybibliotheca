/**
 * In-memory ring buffer for debug output.
 *
 * This lives outside the DebugConsole component on purpose. DebugConsole used to
 * export both the component (default) and `pushLog`, which breaks React Fast
 * Refresh: a module that exports a component *and* other values cannot be hot
 * swapped, so Vite falls back to a full reload. Importers (BarcodeScanner,
 * scannerService) are unaffected because they only ever wanted `pushLog`.
 */

const MAX_LOGS = 200;
const logs: string[] = [];

export const pushLog = (entry: unknown) => {
  try {
    const text = typeof entry === 'string' ? entry : JSON.stringify(entry, null, 2);
    logs.push(`[${new Date().toISOString()}] ${text}`);
    if (logs.length > MAX_LOGS) logs.splice(0, logs.length - MAX_LOGS);
  } catch {
    logs.push(`[${new Date().toISOString()}] ${String(entry)}`);
  }
};

export const getLogs = () => logs;

export const clearLogs = () => {
  logs.length = 0;
};

/**
 * Mirror console.log/warn/error into the ring buffer.
 *
 * Installed once. Kept here rather than in the component module so the hook is
 * owned by the same module as the buffer it writes to.
 */
export const installConsoleHook = () => {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { __debugConsoleInstalled?: boolean };
  if (w.__debugConsoleInstalled) return;
  w.__debugConsoleInstalled = true;

  const fmt = (args: unknown[]) =>
    args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');

  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;

  console.log = (...args: unknown[]) => {
    pushLog(fmt(args));
    origLog.apply(console, args);
  };
  console.warn = (...args: unknown[]) => {
    pushLog('[WARN] ' + fmt(args));
    origWarn.apply(console, args);
  };
  console.error = (...args: unknown[]) => {
    pushLog('[ERROR] ' + fmt(args));
    origError.apply(console, args);
  };
};
