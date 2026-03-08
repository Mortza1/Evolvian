'use client';

import { RefObject } from 'react';
import type { LogEntry } from '../types';

const LOG_STYLES: Record<LogEntry['type'], { color: string; label: string }> = {
  tool:     { color: '#5A9E8F', label: 'tool'  },
  file:     { color: '#BF8A52', label: 'file'  },
  output:   { color: '#7BBDAE', label: 'out'   },
  llm:      { color: '#7A8FA0', label: 'llm'   },
  complete: { color: '#5A9E8F', label: 'done'  },
  error:    { color: '#9E5A5A', label: 'err'   },
  info:     { color: '#3A5056', label: 'info'  },
};

interface ActivityLogProps {
  logs: LogEntry[];
  logContainerRef: RefObject<HTMLDivElement | null>;
  onClear: () => void;
}

export function ActivityLog({ logs, logContainerRef, onClear }: ActivityLogProps) {
  return (
    <div
      className="flex-shrink-0 h-52 border-t flex flex-col"
      style={{ borderColor: '#162025', background: '#080E11' }}
    >
      {/* Bar */}
      <div
        className="flex shrink-0 items-center justify-between border-b px-6 py-2.5"
        style={{ borderColor: '#162025' }}
      >
        <div className="flex items-center gap-3">
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#2E4248', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Activity Log
          </p>
          {logs.length > 0 && (
            <span
              className="rounded border px-1.5 py-0.5 text-[10px]"
              style={{ fontFamily: "'IBM Plex Mono', monospace", borderColor: '#1E2D30', color: '#3A5056', background: '#111A1D' }}
            >
              {logs.length}
            </span>
          )}
        </div>
        {logs.length > 0 && (
          <button
            onClick={onClear}
            className="text-[10px] transition-colors"
            style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#2E4248' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#3A5056'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#2E4248'; }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Log stream */}
      <div ref={logContainerRef} className="flex-1 overflow-y-auto scrollbar-hide px-6 py-3 space-y-1">
        {logs.length === 0 ? (
          <div
            className="flex h-full items-center justify-center text-[12px]"
            style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#2A3E44' }}
          >
            Waiting for execution to start…
          </div>
        ) : (
          logs.map((log) => {
            const style = LOG_STYLES[log.type] ?? LOG_STYLES.info;
            return (
              <div key={log.id} className="flex items-start gap-4 text-[11px]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                <span className="shrink-0" style={{ color: '#2A3E44' }}>
                  {log.timestamp.toLocaleTimeString('en-US', { hour12: false })}
                </span>
                <span
                  className="shrink-0 rounded px-1 py-0.5 text-[9px] uppercase"
                  style={{ color: style.color, background: `${style.color}12`, letterSpacing: '0.06em' }}
                >
                  {style.label}
                </span>
                <span className="shrink-0" style={{ color: style.color }}>
                  [{log.agent}]
                </span>
                <span
                  className="flex-1"
                  style={{ color: log.type === 'error' ? '#9E7A7A' : log.type === 'complete' ? '#7BBDAE' : '#4A6A72' }}
                >
                  {log.message}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
