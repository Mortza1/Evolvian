'use client';

/**
 * Reusable Dialog — confirm, alert, and destructive variants.
 *
 * Usage (confirm):
 *   <Dialog
 *     open={open}
 *     title="Remove agent?"
 *     description="This will permanently remove Sarah from the team."
 *     variant="destructive"
 *     confirmLabel="Remove"
 *     onConfirm={handleDelete}
 *     onCancel={() => setOpen(false)}
 *   />
 *
 * Usage (alert / info only):
 *   <Dialog
 *     open={open}
 *     title="Coming soon"
 *     description="This feature isn't available yet."
 *     onCancel={() => setOpen(false)}
 *   />
 */

import { useEffect, useRef } from 'react';

export type DialogVariant = 'default' | 'destructive' | 'warning';

interface DialogProps {
  open: boolean;
  title: string;
  description?: string;
  variant?: DialogVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  /** If omitted the dialog renders as an alert (no confirm button) */
  onConfirm?: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const VARIANT_STYLES: Record<DialogVariant, { confirm: string; icon: React.ReactNode }> = {
  default: {
    confirm:
      'border-[#5A9E8F40] bg-[#5A9E8F18] text-[#5A9E8F] hover:bg-[#5A9E8F28] hover:border-[#5A9E8F70]',
    icon: (
      <svg className="h-5 w-5 text-[#5A9E8F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  destructive: {
    confirm:
      'border-[#9E5A5A40] bg-[#9E5A5A18] text-[#C47A7A] hover:bg-[#9E5A5A28] hover:border-[#9E5A5A70]',
    icon: (
      <svg className="h-5 w-5 text-[#C47A7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
  },
  warning: {
    confirm:
      'border-[#BF8A5240] bg-[#BF8A5218] text-[#BF8A52] hover:bg-[#BF8A5228] hover:border-[#BF8A5270]',
    icon: (
      <svg className="h-5 w-5 text-[#BF8A52]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
};

export function Dialog({
  open,
  title,
  description,
  variant = 'default',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
}: DialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus cancel button on open (safe default)
  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  const styles = VARIANT_STYLES[variant];
  const isAlertOnly = !onConfirm;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(8,14,17,0.80)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="w-full max-w-[420px] rounded-xl border shadow-2xl"
        style={{ background: '#0D1A1F', borderColor: '#1E2D30', fontFamily: "'Syne', sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-start gap-4 px-6 pt-6 pb-4">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
            style={{ background: '#111A1D', borderColor: '#1E2D30' }}
          >
            {styles.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h2
              id="dialog-title"
              style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }}
              className="text-[15px] text-[#EAE6DF] leading-snug"
            >
              {title}
            </h2>
            {description && (
              <p
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                className="mt-1.5 text-[12px] leading-relaxed text-[#4A6A72]"
              >
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex items-center justify-end gap-2 border-t px-6 py-4"
          style={{ borderColor: '#162025' }}
        >
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={loading}
            className="rounded-md border px-4 py-2 text-[12px] transition-all disabled:opacity-40"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              borderColor: '#1E2D30',
              background: 'transparent',
              color: '#4A6A72',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#111A1D'; e.currentTarget.style.color = '#EAE6DF'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4A6A72'; }}
          >
            {isAlertOnly ? 'Close' : cancelLabel}
          </button>

          {!isAlertOnly && (
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex items-center gap-2 rounded-md border px-4 py-2 text-[12px] transition-all disabled:opacity-40 ${styles.confirm}`}
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {loading && (
                <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
