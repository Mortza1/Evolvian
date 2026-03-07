/**
 * Team Events Context
 *
 * Global SSE connection for team-level real-time events.
 * Phase 6.2 - Real-Time Cross-View Updates
 */

'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';

interface TeamEvent {
  type: 'team_state' | 'assumption_raised' | 'assumption_answered' | 'operation_created' | 'active_operations_changed' | 'error';
  data: Record<string, any>;
}

interface TeamState {
  pending_assumptions: number;
  active_operations: number;
  total_operations: number;
}

interface TeamEventsContextType {
  teamState: TeamState | null;
  isConnected: boolean;
  subscribe: (eventType: string, callback: (data: any) => void) => () => void;
}

const TeamEventsContext = createContext<TeamEventsContextType | undefined>(undefined);

interface TeamEventsProviderProps {
  children: ReactNode;
  teamId: number;
}

export function TeamEventsProvider({ children, teamId }: TeamEventsProviderProps) {
  const [teamState, setTeamState] = useState<TeamState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const subscribersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());

  const subscribe = useCallback((eventType: string, callback: (data: any) => void) => {
    if (!subscribersRef.current.has(eventType)) {
      subscribersRef.current.set(eventType, new Set());
    }
    subscribersRef.current.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      subscribersRef.current.get(eventType)?.delete(callback);
    };
  }, []);

  const emit = useCallback((eventType: string, data: any) => {
    const subscribers = subscribersRef.current.get(eventType);
    if (subscribers) {
      subscribers.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[TeamEvents] Error in ${eventType} subscriber:`, error);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (!teamId) return;

    let aborted = false;
    const abortController = new AbortController();

    const connect = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      console.log('[TeamEvents] Connecting to team event stream:', teamId);

      try {
        const response = await fetch(`${baseUrl}/api/teams/${teamId}/events`, {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: abortController.signal,
        });

        if (!response.ok || !response.body) {
          console.error('[TeamEvents] Failed to connect:', response.status);
          return;
        }

        setIsConnected(true);
        console.log('[TeamEvents] Connected');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEventType = 'message';

        while (!aborted) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                switch (currentEventType) {
                  case 'team_state':
                    setTeamState(data);
                    emit('team_state', data);
                    break;
                  case 'assumption_raised':
                    emit('assumption_raised', data);
                    setTeamState((prev) => prev ? { ...prev, pending_assumptions: prev.pending_assumptions + 1 } : null);
                    break;
                  case 'assumption_answered':
                    emit('assumption_answered', data);
                    setTeamState((prev) => prev ? { ...prev, pending_assumptions: data.pending_count } : null);
                    break;
                  case 'operation_created':
                    emit('operation_created', data);
                    setTeamState((prev) => prev ? { ...prev, total_operations: prev.total_operations + data.count } : null);
                    break;
                  case 'active_operations_changed':
                    emit('active_operations_changed', data);
                    setTeamState((prev) => prev ? { ...prev, active_operations: data.active_count } : null);
                    break;
                  default:
                    emit(currentEventType, data);
                }
              } catch {
                // ignore malformed lines
              }
              currentEventType = 'message';
            }
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.warn('[TeamEvents] Connection lost, retrying in 5s');
      }

      if (!aborted) {
        setIsConnected(false);
        setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      aborted = true;
      abortController.abort();
      setIsConnected(false);
      console.log('[TeamEvents] Disconnected');
    };
  }, [teamId, emit]);

  return (
    <TeamEventsContext.Provider value={{ teamState, isConnected, subscribe }}>
      {children}
    </TeamEventsContext.Provider>
  );
}

export function useTeamEvents() {
  const context = useContext(TeamEventsContext);
  if (!context) {
    throw new Error('useTeamEvents must be used within TeamEventsProvider');
  }
  return context;
}
