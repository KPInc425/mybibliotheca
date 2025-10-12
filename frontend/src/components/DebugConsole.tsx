import React, { useEffect, useState } from 'react';
import { BugAntIcon, ClipboardDocumentIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useSettingsStore } from '@/store/settings';

// Small in-memory ring buffer for logs
const MAX_LOGS = 200;
const logs: string[] = [];

export const pushLog = (entry: any) => {
  try {
    const s = typeof entry === 'string' ? entry : JSON.stringify(entry, null, 2);
    logs.push(`[${new Date().toISOString()}] ${s}`);
    if (logs.length > MAX_LOGS) logs.splice(0, logs.length - MAX_LOGS);
  } catch (e) {
    logs.push(`[${new Date().toISOString()}] ${String(entry)}`);
  }
};

// Install a global console hook to capture console.log/warn/error
if (typeof window !== 'undefined' && !(window as any).__debugConsoleInstalled) {
  (window as any).__debugConsoleInstalled = true;
  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;
  console.log = (...args: any[]) => {
    pushLog(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
    origLog.apply(console, args);
  };
  console.warn = (...args: any[]) => {
    pushLog('[WARN] ' + args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
    origWarn.apply(console, args);
  };
  console.error = (...args: any[]) => {
    pushLog('[ERROR] ' + args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
    origError.apply(console, args);
  };
}

const DebugConsole: React.FC = () => {
  const settings = useSettingsStore((s) => s.settings);
  const [open, setOpen] = useState(false);
  const [, forceRerender] = useState(0);

  useEffect(() => {
    if (!open) return;
    const iv = setInterval(() => forceRerender((n) => n + 1), 1000);
    return () => clearInterval(iv);
  }, [open]);

  if (!settings.scannerDebugMode) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(logs.join('\n'));
      alert('Copied debug logs to clipboard');
    } catch (e) {
      alert('Failed to copy logs: ' + String(e));
    }
  };

  return (
    <>
      {/* Floating ladybug button */}
      <button
        aria-label="Open debug console"
        onClick={() => setOpen(true)}
        title="Open debug console"
        className="fixed z-50 bottom-6 right-6 bg-base-300 p-3 rounded-full shadow-lg hover:bg-base-200"
        style={{ width: 56, height: 56 }}
      >
        <BugAntIcon className="w-6 h-6 text-primary" />
      </button>

      {open && (
        <div className="fixed z-50 inset-0 flex items-center justify-center bg-black/50">
          <div className="bg-base-100 rounded-lg shadow-xl w-11/12 max-w-3xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold">Debug Console</h3>
              <div className="flex items-center gap-2">
                <button className="btn btn-ghost" onClick={handleCopy} title="Copy logs">
                  <ClipboardDocumentIcon className="w-5 h-5" />
                </button>
                <button className="btn btn-ghost" onClick={() => setOpen(false)} title="Close">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div style={{ maxHeight: '60vh', overflowY: 'auto', fontSize: 12 }}>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{logs.join('\n')}</pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DebugConsole;
