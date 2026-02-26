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
  const eventSourceRef = useRef<EventSource | null>(null);
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

    console.log('[TeamEvents] Connecting to team event stream:', teamId);

    const eventSource = new EventSource(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/${teamId}/events`, {
      withCredentials: true,
    });

    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[TeamEvents] Connected');
      setIsConnected(true);
    };

    // Handle team_state event (initial state + periodic updates)
    eventSource.addEventListener('team_state', (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log('[TeamEvents] team_state:', data);
        setTeamState(data);
        emit('team_state', data);
      } catch (error) {
        console.error('[TeamEvents] Error parsing team_state:', error);
      }
    });

    // Handle assumption_raised event
    eventSource.addEventListener('assumption_raised', (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log('[TeamEvents] assumption_raised:', data);
        emit('assumption_raised', data);

        // Update state
        setTeamState((prev) => prev ? { ...prev, pending_assumptions: prev.pending_assumptions + 1 } : null);
      } catch (error) {
        console.error('[TeamEvents] Error parsing assumption_raised:', error);
      }
    });

    // Handle assumption_answered event
    eventSource.addEventListener('assumption_answered', (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log('[TeamEvents] assumption_answered:', data);
        emit('assumption_answered', data);

        // Update state
        setTeamState((prev) => prev ? { ...prev, pending_assumptions: data.pending_count } : null);
      } catch (error) {
        console.error('[TeamEvents] Error parsing assumption_answered:', error);
      }
    });

    // Handle operation_created event
    eventSource.addEventListener('operation_created', (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log('[TeamEvents] operation_created:', data);
        emit('operation_created', data);

        // Update state
        setTeamState((prev) => prev ? { ...prev, total_operations: prev.total_operations + data.count } : null);
      } catch (error) {
        console.error('[TeamEvents] Error parsing operation_created:', error);
      }
    });

    // Handle active_operations_changed event
    eventSource.addEventListener('active_operations_changed', (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log('[TeamEvents] active_operations_changed:', data);
        emit('active_operations_changed', data);

        // Update state
        setTeamState((prev) => prev ? { ...prev, active_operations: data.active_count } : null);
      } catch (error) {
        console.error('[TeamEvents] Error parsing active_operations_changed:', error);
      }
    });

    // Handle error event
    eventSource.addEventListener('error', (e: any) => {
      try {
        const data = e.data ? JSON.parse(e.data) : { error: 'Unknown error' };
        console.error('[TeamEvents] Server error:', data);
        emit('error', data);
      } catch (error) {
        console.error('[TeamEvents] Connection error:', error);
      }
    });

    eventSource.onerror = (error) => {
      console.error('[TeamEvents] Connection error:', error);
      setIsConnected(false);

      // Auto-reconnect after 5 seconds
      setTimeout(() => {
        console.log('[TeamEvents] Attempting to reconnect...');
        eventSource.close();
      }, 5000);
    };

    return () => {
      console.log('[TeamEvents] Disconnecting from team event stream');
      eventSource.close();
      eventSourceRef.current = null;
      setIsConnected(false);
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
