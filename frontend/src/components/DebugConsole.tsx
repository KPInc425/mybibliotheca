import React, { useEffect, useState } from 'react';
import {
  BugAntIcon,
  ClipboardDocumentIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useSettingsStore } from '@/store/settings';
import { useAuthStore } from '@/store/auth';
import { api } from '@/api/client';
import { getLogs, installConsoleHook, pushLog } from '@/utils/debugLog';

// The log buffer and the console hook live in @/utils/debugLog so this module
// exports only a component. Exporting a component plus other values from one
// module breaks React Fast Refresh (Vite falls back to a full page reload).
installConsoleHook();

const DebugConsole: React.FC = () => {
  const settings = useSettingsStore((s) => s.settings);
  const { user } = useAuthStore();
  const [adminDebugEnabled, setAdminDebugEnabled] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [, forceRerender] = useState(0);

  useEffect(() => {
    if (!open) return;
    const iv = setInterval(() => forceRerender((n) => n + 1), 1000);
    return () => clearInterval(iv);
  }, [open]);

  // Read the admin system-level debug switch.
  useEffect(() => {
    let mounted = true;
    const checkAdmin = async () => {
      if (!user?.is_admin) {
        setAdminDebugEnabled(false);
        return;
      }
      try {
        const res = await api.admin.getSettings();
        if (mounted && res && res.success && res.data) {
          setAdminDebugEnabled(Boolean(res.data.debug_mode));
        }
      } catch (e) {
        console.debug('Failed to fetch admin settings for DebugConsole', e);
        if (mounted) setAdminDebugEnabled(false);
      }
    };
    checkAdmin();
    return () => {
      mounted = false;
    };
  }, [user]);

  // Visibility: debug must be explicitly switched on.
  //
  // This used to read `user?.is_admin && adminDebugEnabled !== false || scannerDebugMode`,
  // which treated the "still fetching" null state as enabled, so every admin saw
  // the floating ladybug as soon as the page loaded. Both accounts on this
  // instance are admins, so the debug tool was effectively always on screen in
  // production. Now an admin needs the system-level debug_mode switched on, and
  // a regular user needs their own scanner debug switched on.
  const visible =
    (Boolean(user?.is_admin) && adminDebugEnabled === true) ||
    settings.scannerDebugMode;

  // Emit a small trace so visibility can be diagnosed on devices where the
  // ladybug does not appear.
  useEffect(() => {
    pushLog({
      event: 'DebugConsole.visibility',
      userIsAdmin: Boolean(user?.is_admin),
      adminDebugEnabled,
      scannerDebugMode: settings.scannerDebugMode,
      visible,
    });
  }, [user, adminDebugEnabled, settings.scannerDebugMode, visible]);

  if (!visible) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getLogs().join('\n'));
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
                <button
                  className="btn btn-ghost"
                  onClick={() => setOpen(false)}
                  title="Close"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div style={{ maxHeight: '60vh', overflowY: 'auto', fontSize: 12 }}>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{getLogs().join('\n')}</pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DebugConsole;
