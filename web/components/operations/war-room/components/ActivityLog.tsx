'use client';

import { RefObject } from 'react';
import type { LogEntry } from '../types';

const LOG_COLORS: Record<LogEntry['type'], string> = {
  tool: 'text-[#6366F1]',
  file: 'text-[#FDE047]',
  output: 'text-[#EC4899]',
  llm: 'text-[#8B5CF6]',
  complete: 'text-green-500',
  error: 'text-red-500',
  info: 'text-slate-400',
};

interface ActivityLogProps {
  logs: LogEntry[];
  logContainerRef: RefObject<HTMLDivElement | null>;
  onClear: () => void;
}

export function ActivityLog({ logs, logContainerRef, onClear }: ActivityLogProps) {
  return (
    <div className="flex-shrink-0 h-56 border-t border-slate-800 bg-[#0A0A0F] flex flex-col">
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-400">LIVE ACTIVITY LOG</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{logs.length} events</span>
          <button onClick={onClear} className="text-xs text-slate-500 hover:text-slate-400 transition-colors">
            Clear
          </button>
        </div>
      </div>
      <div ref={logContainerRef} className="flex-1 overflow-y-auto p-3 space-y-1 font-mono scrollbar-hide">
        {logs.length === 0 ? (
          <div className="text-slate-600 text-center py-4">Waiting for execution to start...</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 text-xs">
              <span className="text-slate-600 flex-shrink-0">
                {log.timestamp.toLocaleTimeString('en-US', { hour12: false })}
              </span>
              <span className={`flex-shrink-0 font-medium ${LOG_COLORS[log.type]}`}>
                [{log.agent}]
              </span>
              <span className={`flex-1 ${
                log.type === 'error' ? 'text-red-400' :
                log.type === 'complete' ? 'text-green-400' : 'text-slate-400'
              }`}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
