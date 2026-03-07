'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTeamAgents, Agent } from '@/lib/services/agents';
import { workflowService } from '@/lib/services/workflows/workflow.service';
import type { ExecutionMessage } from '@/lib/services/workflows/types';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { useToast } from '@/lib/contexts/ToastContext';

interface WarRoomLiveProps {
  taskId: number;
  teamId: string;
  workflowNodes: {
    id: string;
    name?: string;
    description?: string;
    agentId?: string;
    agentName?: string;
    agentPhoto?: string;
    agentRole: string;
    action?: string;
    order: number;
  }[];
  taskDescription: string;
  initialStatus?: 'pending' | 'active' | 'completed' | 'failed' | 'paused' | 'cancelled';
  onClose?: () => void;
  hierarchical?: boolean;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  agent: string;
  message: string;
  type: 'info' | 'tool' | 'output' | 'complete' | 'file' | 'error' | 'llm';
}

interface NodeStatus {
  nodeId: string;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'waiting' | 'waiting_for_input';
  activeTool?: string;
  progress?: number;
  output?: string;
}

interface AssumptionData {
  operationId: number;
  nodeId: string;
  agentName: string;
  agentPhoto?: string;
  question: string;
  context: string;
  options: string[];
  priority: string;
  assumptionIndex: number;
}

export default function WarRoomLive({ taskId, teamId, workflowNodes, taskDescription, initialStatus = 'pending', onClose, hierarchical = false }: WarRoomLiveProps) {
  // Notification hooks (Phase 6.1)
  const { showNotification, playNotificationSound, canNotify } = useNotifications();
  const { showToast } = useToast();

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [nodeStatuses, setNodeStatuses] = useState<NodeStatus[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isComplete, setIsComplete] = useState(initialStatus === 'completed');
  const [isPaused, setIsPaused] = useState(initialStatus === 'paused');
  const [isCancelled, setIsCancelled] = useState(initialStatus === 'cancelled');
  const [isPauseRequested, setIsPauseRequested] = useState(false);
  const [isCancelRequested, setIsCancelRequested] = useState(false);
  const [totalCost, setTotalCost] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [pausedAtNode, setPausedAtNode] = useState<number | null>(null);
  const [savedFileId, setSavedFileId] = useState<number | null>(null);
  const [savedFileName, setSavedFileName] = useState<string | null>(null);
  const [userRating, setUserRating] = useState<number>(0);
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const useHierarchy = true;
  const [hierarchyTeam, setHierarchyTeam] = useState<{ supervisor: string; workers: string[]; teamName: string } | null>(null);
  const [hierarchyMetrics, setHierarchyMetrics] = useState<{ review_loops: number; escalations: number; revisions: number } | null>(null);
  const [currentAssumption, setCurrentAssumption] = useState<AssumptionData | null>(null);
  const [assumptionAnswer, setAssumptionAnswer] = useState('');
  const [isSubmittingAssumption, setIsSubmittingAssumption] = useState(false);
  const [chatMessages, setChatMessages] = useState<ExecutionMessage[]>([]);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [newChatMessage, setNewChatMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Get team agents for display
  const { agents: hiredAgents } = useTeamAgents({
    teamId: parseInt(teamId, 10),
    autoFetch: true,
  });

  // Map agents by name/role for display
  const getAgentPhoto = useCallback((agentName: string): string | undefined => {
    const agent = hiredAgents.find(a =>
      a.name.toLowerCase() === agentName.toLowerCase() ||
      a.role.toLowerCase().includes(agentName.toLowerCase())
    );
    return agent?.photo_url;
  }, [hiredAgents]);

  // Initialize node statuses based on initial task status
  useEffect(() => {
    const initialStatuses = workflowNodes.map((node) => ({
      nodeId: node.id,
      status: initialStatus === 'completed' ? 'completed' as const : 'pending' as const,
      progress: initialStatus === 'completed' ? 100 : 0,
    }));
    setNodeStatuses(initialStatuses);

    // Add initial log for completed tasks
    if (initialStatus === 'completed') {
      addLog('System', 'This operation has already been completed.', 'complete');
    } else if (initialStatus === 'active') {
      addLog('System', 'This operation is in progress. Click "Start Execution" to resume.', 'info');
    } else if (initialStatus === 'paused') {
      addLog('System', 'This operation is paused. Click "Resume" to continue.', 'info');
    } else if (initialStatus === 'cancelled') {
      addLog('System', 'This operation was cancelled.', 'error');
    }
  }, [workflowNodes, initialStatus]);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = useCallback((agent: string, message: string, type: LogEntry['type'] = 'info') => {
    const newLog: LogEntry = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      agent,
      message,
      type,
    };
    setLogs(prev => [...prev, newLog]);
  }, []);

  const updateNodeStatus = useCallback((nodeId: string, updates: Partial<NodeStatus>) => {
    setNodeStatuses(prev =>
      prev.map(status =>
        status.nodeId === nodeId ? { ...status, ...updates } : status
      )
    );
  }, []);

  // Start execution with SSE
  const startExecution = useCallback(async () => {
    if (isExecuting) return;

    setIsExecuting(true);
    setError(null);
    addLog('System', 'Starting operation execution...', 'info');

    const token = localStorage.getItem('access_token');
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    if (!token) {
      setError('Not authenticated. Please log in again.');
      addLog('System', 'Error: No authentication token found. Please log in again.', 'error');
      setIsExecuting(false);
      return;
    }

    try {
      // Use fetch with SSE parsing since EventSource doesn't support auth headers
      const endpoint = useHierarchy
        ? `${baseUrl}/api/operations/${taskId}/execute-hierarchical`
        : `${baseUrl}/api/operations/${taskId}/execute`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream',
        },
      });

      if (response.status === 401) {
        setError('Session expired. Please log in again.');
        addLog('System', 'Error: Session expired. Please log in again.', 'error');
        setIsExecuting(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Execution failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              handleEvent(data);
            } catch (e) {
              console.warn('Failed to parse SSE event:', line);
            }
          }
        }
      }

    } catch (err) {
      console.error('Execution error:', err);
      const message = err instanceof Error ? err.message : 'Execution failed';
      setError(message);
      addLog('System', `Error: ${message}`, 'error');
    } finally {
      setIsExecuting(false);
      setIsPauseRequested(false);
      setIsCancelRequested(false);
    }
  }, [taskId, isExecuting, addLog]);

  // Pause execution
  const pauseExecution = useCallback(async () => {
    if (!isExecuting || isPauseRequested) return;

    setIsPauseRequested(true);
    addLog('System', 'Pause requested... will pause after current node completes.', 'info');

    const token = localStorage.getItem('access_token');
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    try {
      const response = await fetch(`${baseUrl}/api/operations/${taskId}/pause`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (!data.success) {
        addLog('System', `Pause failed: ${data.message}`, 'error');
        setIsPauseRequested(false);
      }
    } catch (err) {
      console.error('Pause error:', err);
      const message = err instanceof Error ? err.message : 'Failed to pause';
      addLog('System', `Error: ${message}`, 'error');
      setIsPauseRequested(false);
    }
  }, [taskId, isExecuting, isPauseRequested, addLog]);

  // Cancel execution
  const cancelExecution = useCallback(async () => {
    if (isCancelRequested) return;

    setIsCancelRequested(true);
    addLog('System', 'Cancel requested...', 'info');

    const token = localStorage.getItem('access_token');
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    try {
      const response = await fetch(`${baseUrl}/api/operations/${taskId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        if (data.status === 'cancelled') {
          // Immediately cancelled (was paused or pending)
          setIsCancelled(true);
          setIsPaused(false);
          addLog('System', 'Operation cancelled.', 'error');
        }
      } else {
        addLog('System', `Cancel failed: ${data.message}`, 'error');
        setIsCancelRequested(false);
      }
    } catch (err) {
      console.error('Cancel error:', err);
      const message = err instanceof Error ? err.message : 'Failed to cancel';
      addLog('System', `Error: ${message}`, 'error');
      setIsCancelRequested(false);
    }
  }, [taskId, isCancelRequested, addLog]);

  // Resume execution
  const resumeExecution = useCallback(async () => {
    if (isExecuting || !isPaused) return;

    setIsExecuting(true);
    setIsPaused(false);
    setError(null);
    addLog('System', 'Resuming operation...', 'info');

    const token = localStorage.getItem('access_token');
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    try {
      const response = await fetch(`${baseUrl}/api/operations/${taskId}/resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream',
        },
      });

      if (!response.ok) {
        throw new Error(`Resume failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              handleEvent(data);
            } catch (e) {
              console.warn('Failed to parse SSE event:', line);
            }
          }
        }
      }
    } catch (err) {
      console.error('Resume error:', err);
      const message = err instanceof Error ? err.message : 'Resume failed';
      setError(message);
      addLog('System', `Error: ${message}`, 'error');
      setIsPaused(true);
    } finally {
      setIsExecuting(false);
      setIsPauseRequested(false);
      setIsCancelRequested(false);
    }
  }, [taskId, isExecuting, isPaused, addLog]);

  // Handle SSE events
  const handleEvent = useCallback((data: any) => {
    console.log('[SSE Event]', data.type, data);

    switch (data.type) {
      case 'start':
        addLog('System', `Operation started: ${data.title}`, 'info');
        break;

      case 'node_start':
        updateNodeStatus(data.node_id, {
          status: 'active',
          progress: 0,
          activeTool: undefined
        });
        addLog(data.agent_name, `Starting: ${data.name || data.description}`, 'info');
        break;

      case 'tool_use':
        if (data.status === 'running') {
          updateNodeStatus(data.node_id, { activeTool: data.tool });
          addLog(data.agent_name, `Using tool: ${data.tool}`, 'tool');
        } else if (data.status === 'completed') {
          addLog(data.agent_name, `Tool completed: ${data.tool}`, 'tool');
        }
        break;

      case 'progress':
        updateNodeStatus(data.node_id, { progress: data.progress });
        break;

      case 'llm_call':
        if (data.status === 'calling') {
          addLog(data.agent_name, data.message || 'Processing...', 'llm');
        } else if (data.status === 'completed') {
          addLog(data.agent_name, `Output generated`, 'output');
          if (data.output_preview) {
            updateNodeStatus(data.node_id, { output: data.output_preview });
          }
        } else if (data.status === 'error') {
          addLog(data.agent_name, `Error: ${data.error}`, 'error');
        }
        break;

      case 'node_complete':
        updateNodeStatus(data.node_id, {
          status: data.status === 'failed' ? 'failed' : 'completed',
          progress: 100,
          activeTool: undefined
        });
        addLog(data.agent_name, `Task completed`, 'complete');
        break;

      case 'agent_xp':
        addLog('System', `${data.agent_name} gained ${data.xp_gained} XP`, 'complete');
        break;

      case 'file_saved':
        setSavedFileId(data.file_id);
        setSavedFileName(data.file_name);
        addLog('System', `Results saved to vault: ${data.file_name}`, 'complete');
        break;

      case 'complete':
        setIsComplete(true);
        setTotalCost(data.total_cost || 0);
        if (data.hierarchy_metrics) {
          setHierarchyMetrics(data.hierarchy_metrics);
          addLog('System', `Operation complete — ${data.hierarchy_metrics.review_loops} review loops, ${data.hierarchy_metrics.escalations} escalations, ${data.hierarchy_metrics.revisions} revisions`, 'complete');
        } else {
          addLog('System', `Operation completed! Total cost: $${(data.total_cost || 0).toFixed(2)}`, 'complete');
        }
        break;

      case 'paused':
        setIsPaused(true);
        setIsExecuting(false);
        setIsPauseRequested(false);
        setPausedAtNode(data.at_node);
        setTotalCost(data.total_cost || 0);
        addLog('System', `Operation paused at "${data.node_name}". Click Resume to continue.`, 'info');
        break;

      case 'cancelled':
        setIsCancelled(true);
        setIsExecuting(false);
        setIsCancelRequested(false);
        setTotalCost(data.total_cost || 0);
        addLog('System', `Operation cancelled at "${data.node_name}". Total cost: $${(data.total_cost || 0).toFixed(2)}`, 'error');
        break;

      case 'resumed':
        addLog('System', `Resuming from node ${data.from_node + 1}`, 'info');
        break;

      // ── Hierarchy events ──────────────────────────────────────────────
      case 'hierarchy_decompose':
        if (data.workers) {
          // Second decompose event — team is ready
          setHierarchyTeam({
            supervisor: data.supervisor,
            workers: data.workers,
            teamName: data.team_name || 'Hierarchical Team',
          });
          addLog(data.supervisor, `Team ready: ${data.workers.join(', ')}`, 'info');
          if (data.reasoning) {
            addLog(data.supervisor, data.reasoning, 'info');
          }
        } else {
          addLog(data.supervisor || 'Supervisor', data.message || 'Decomposing task...', 'llm');
        }
        break;

      case 'hierarchy_delegate':
        addLog('Supervisor', data.message || `→ ${data.worker}: ${data.subtask_description}`, 'info');
        break;

      case 'hierarchy_worker_start':
        addLog(data.worker, data.message || `Working on subtask...`, 'llm');
        break;

      case 'hierarchy_worker_complete':
        addLog(data.worker, data.message || 'Subtask complete', 'output');
        if (data.output_preview) {
          addLog(data.worker, `Preview: ${data.output_preview.slice(0, 120)}...`, 'output');
        }
        break;

      case 'hierarchy_escalate':
        addLog('⚠ Escalation', data.message || `${data.from_worker} → ${data.to_worker}`, 'error');
        setHierarchyMetrics(m => ({ review_loops: m?.review_loops ?? 0, escalations: (m?.escalations ?? 0) + 1, revisions: m?.revisions ?? 0 }));
        break;

      case 'hierarchy_review':
        if (data.approved) {
          addLog(data.supervisor || 'Supervisor', data.message || '✓ Output approved', 'complete');
        } else {
          addLog(data.supervisor || 'Supervisor', data.message || 'Reviewing outputs...', 'llm');
          setHierarchyMetrics(m => ({ review_loops: (m?.review_loops ?? 0) + 1, escalations: m?.escalations ?? 0, revisions: m?.revisions ?? 0 }));
        }
        break;

      case 'hierarchy_revise':
        addLog('Supervisor', data.message || `Requesting revision ${data.revision_round}...`, 'tool');
        setHierarchyMetrics(m => ({ review_loops: m?.review_loops ?? 0, escalations: m?.escalations ?? 0, revisions: (m?.revisions ?? 0) + 1 }));
        break;

      case 'hierarchy_complete':
        addLog('✓ Hierarchy', data.message || 'All outputs approved', 'complete');
        if (data.output_length) {
          addLog('System', `Final output: ${data.output_length.toLocaleString()} characters`, 'complete');
        }
        break;

      case 'assumption_raised':
        setCurrentAssumption({
          operationId: data.operation_id,
          nodeId: data.node_id,
          agentName: data.agent_name,
          agentPhoto: data.agent_photo,
          question: data.question,
          context: data.context,
          options: data.options || [],
          priority: data.priority,
          assumptionIndex: data.assumption_index,
        });
        updateNodeStatus(data.node_id, { status: 'waiting_for_input' });
        setIsPaused(true);
        addLog(data.agent_name, `Needs your input: ${data.question}`, 'info');

        // Trigger notifications (Phase 6.1)
        playNotificationSound();

        // Browser notification
        if (canNotify) {
          showNotification({
            title: `${data.agent_name} needs your input`,
            body: data.question,
            tag: `assumption-${data.operation_id}-${data.assumption_index}`,
            requireInteraction: true,
            onClick: () => {
              window.focus();
            },
          });
        }

        // Toast notification
        showToast({
          type: 'assumption',
          title: `${data.agent_name} needs your input`,
          message: data.question,
          duration: 0, // Don't auto-dismiss
          action: {
            label: 'View',
            onClick: () => {
              // Scroll to assumption panel
              const panel = document.querySelector('[data-assumption-panel]');
              if (panel) {
                panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            },
          },
        });

        break;

      case 'assumption_answered':
        setCurrentAssumption(null);
        setAssumptionAnswer('');
        setIsPaused(false);
        addLog('System', 'Input received. Resuming execution...', 'info');
        break;

      case 'manager_question':
        setCurrentAssumption({
          operationId: data.operation_id,
          nodeId: data.node_id,
          agentName: 'Evo (Manager)',
          agentPhoto: '/evo-avatar.png',
          question: data.question,
          context: data.context,
          options: data.options || [],
          priority: data.priority,
          assumptionIndex: data.assumption_index,
        });
        updateNodeStatus(data.node_id, { status: 'waiting_for_input' });
        setIsPaused(true);
        addLog('Evo', `Manager needs your input: ${data.question}`, 'info');

        // Trigger notifications (Phase 6.1)
        playNotificationSound();

        // Browser notification
        if (canNotify) {
          showNotification({
            title: 'Evo (Manager) needs your input',
            body: data.question,
            tag: `manager-question-${data.operation_id}-${data.assumption_index}`,
            requireInteraction: true,
            onClick: () => {
              window.focus();
            },
          });
        }

        // Toast notification
        showToast({
          type: 'assumption',
          title: 'Evo (Manager) needs your input',
          message: data.question,
          duration: 0, // Don't auto-dismiss
          action: {
            label: 'View',
            onClick: () => {
              // Scroll to assumption panel
              const panel = document.querySelector('[data-assumption-panel]');
              if (panel) {
                panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            },
          },
        });

        break;

      case 'error':
        setError(data.message);
        addLog('System', `Error: ${data.message}`, 'error');
        break;
    }
  }, [addLog, updateNodeStatus]);

  // Submit assumption answer
  const submitAssumptionAnswer = useCallback(async (answer: string) => {
    if (!currentAssumption || isSubmittingAssumption) return;

    setIsSubmittingAssumption(true);
    try {
      const response = await fetch(`/api/operations/${taskId}/assumption/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answer,
          assumption_index: currentAssumption.assumptionIndex,
        }),
      });

      const result = await response.json();

      if (result.success) {
        addLog('System', 'Answer submitted. Execution will resume...', 'complete');
        // The SSE event 'assumption_answered' will clear the assumption state
      } else {
        addLog('System', `Failed to submit answer: ${result.message}`, 'error');
      }
    } catch (err) {
      console.error('Error submitting assumption answer:', err);
      addLog('System', 'Failed to submit answer. Please try again.', 'error');
    } finally {
      setIsSubmittingAssumption(false);
    }
  }, [currentAssumption, taskId, isSubmittingAssumption, addLog]);

  // Submit rating
  const submitRating = useCallback(async () => {
    if (userRating === 0 || isSubmittingRating) return;

    setIsSubmittingRating(true);
    try {
      const result = await workflowService.rateOperation(
        taskId,
        userRating,
        ratingFeedback || undefined
      );
      if (result.success) {
        setRatingSubmitted(true);
        setQualityScore(result.quality_score ?? null);
        addLog('System', `Rating submitted: ${userRating}/5 stars. Quality score: ${(result.quality_score ?? 0).toFixed(2)}`, 'complete');
      } else {
        addLog('System', `Failed to submit rating: ${result.error}`, 'error');
      }
    } catch (err) {
      addLog('System', 'Failed to submit rating', 'error');
    } finally {
      setIsSubmittingRating(false);
    }
  }, [taskId, userRating, ratingFeedback, isSubmittingRating, addLog]);

  // Load chat messages (execution transcript)
  const loadChatMessages = useCallback(async () => {
    try {
      const result = await workflowService.getExecutionMessages(taskId);
      if (result.success && result.messages) {
        setChatMessages(result.messages);
      }
    } catch (err) {
      console.error('Error loading chat messages:', err);
    }
  }, [taskId]);

  // Send chat message
  const sendChatMessage = useCallback(async () => {
    if (!newChatMessage.trim() || isSendingMessage) return;

    const messageContent = newChatMessage.trim();
    setNewChatMessage('');
    setIsSendingMessage(true);

    try {
      const result = await workflowService.sendExecutionMessage(
        taskId,
        messageContent,
        'current_agent',
        'chat'
      );
      if (result.success && result.message) {
        // Add message to local state immediately
        setChatMessages(prev => [...prev, result.message!]);
        addLog('You', `Sent message: ${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}`, 'info');
      } else {
        addLog('System', `Failed to send message: ${result.error}`, 'error');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      addLog('System', 'Failed to send message', 'error');
    } finally {
      setIsSendingMessage(false);
    }
  }, [taskId, newChatMessage, isSendingMessage, addLog]);

  // Load messages on mount
  useEffect(() => {
    loadChatMessages();
  }, [loadChatMessages]);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current && isChatExpanded) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, isChatExpanded]);

  // Keyboard shortcuts for assumption quick replies (Phase 4.4)
  useEffect(() => {
    if (!currentAssumption || !currentAssumption.options || currentAssumption.options.length === 0) {
      return;
    }

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Number keys 1-9 for quick option selection
      const num = parseInt(e.key);
      if (num >= 1 && num <= Math.min(9, currentAssumption.options.length)) {
        e.preventDefault();
        const selectedOption = currentAssumption.options[num - 1];
        setAssumptionAnswer(selectedOption);
        submitAssumptionAnswer(selectedOption);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentAssumption, submitAssumptionAnswer]);

  // Auto-start execution for pending tasks only
  useEffect(() => {
    // Only auto-start if:
    // 1. We have workflow nodes
    // 2. Not already executing
    // 3. Not complete
    // 4. Haven't started yet (prevents re-execution)
    // 5. Initial status is pending (not already active or completed)
    if (workflowNodes.length > 0 && !isExecuting && !isComplete && !hasStarted && initialStatus === 'pending') {
      const timer = setTimeout(() => {
        setHasStarted(true);
        startExecution();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [workflowNodes, startExecution, isExecuting, isComplete, hasStarted, initialStatus]);

  const colors = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B'];

  return (
    <div className="h-full flex flex-col bg-[#020617]">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-white">Execution Theatre</h1>
              {useHierarchy && (
                <span className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/40 rounded text-xs text-purple-300 font-semibold uppercase tracking-wider">
                  ◈ Hierarchy
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1">{taskDescription}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Status badges */}
            {isExecuting && (
              <div className="px-3 py-1.5 bg-[#6366F1]/20 border border-[#6366F1]/30 rounded text-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-[#6366F1] rounded-full animate-pulse"></div>
                <span className="text-[#6366F1] font-medium">
                  {isPauseRequested ? 'Pausing...' : isCancelRequested ? 'Cancelling...' : 'Live'}
                </span>
              </div>
            )}
            {isComplete && (
              <div className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded text-sm">
                <span className="text-green-500 font-medium">Completed</span>
              </div>
            )}
            {isPaused && !isExecuting && (
              <div className="px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded text-sm">
                <span className="text-amber-500 font-medium">Paused</span>
              </div>
            )}
            {isCancelled && (
              <div className="px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded text-sm">
                <span className="text-red-500 font-medium">Cancelled</span>
              </div>
            )}
            {error && !isCancelled && (
              <div className="px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded text-sm">
                <span className="text-red-500 font-medium">Error</span>
              </div>
            )}

            {/* Control buttons */}
            {isExecuting && !isPauseRequested && !isCancelRequested && (
              <>
                <button
                  onClick={pauseExecution}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Pause
                </button>
                <button
                  onClick={cancelExecution}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  Cancel
                </button>
              </>
            )}

            {/* Resume button for paused operations */}
            {isPaused && !isExecuting && !isCancelled && (
              <button
                onClick={resumeExecution}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Resume
              </button>
            )}

            {/* Cancel button for paused operations */}
            {isPaused && !isExecuting && !isCancelled && (
              <button
                onClick={cancelExecution}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                Cancel
              </button>
            )}

            {/* Manual start button for non-pending tasks or when not auto-started */}
            {!isExecuting && !isComplete && !isPaused && !isCancelled && initialStatus !== 'pending' && (
              <button
                onClick={() => {
                  setHasStarted(true);
                  startExecution();
                }}
                className="px-3 py-1.5 bg-[#6366F1] hover:bg-[#5558E3] text-white rounded text-sm font-medium transition-colors"
              >
                Start Execution
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded text-sm transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Workflow Graph */}
        <div className="flex-1 p-8 overflow-auto scrollbar-hide">
          {useHierarchy ? (
            /* ── Hierarchy Tree View ─────────────────────────────────── */
            <div className="flex flex-col items-center min-h-[280px] py-4">
              {hierarchyTeam ? (
                <>
                  {/* Supervisor Node */}
                  <div className="relative">
                    {isExecuting && (
                      <div className="absolute -inset-3 rounded-xl blur-xl opacity-20 bg-purple-500 animate-pulse"></div>
                    )}
                    <div className="relative px-8 py-5 bg-[#0A0A0F] border-2 border-purple-500/60 rounded-xl w-72 text-center shadow-lg shadow-purple-500/10">
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-[#7C3AED] to-[#6366F1] rounded-full text-[10px] text-white font-bold uppercase tracking-widest whitespace-nowrap">
                        Supervisor
                      </div>
                      <div className="w-14 h-14 bg-gradient-to-br from-[#7C3AED] to-[#6366F1] rounded-full flex items-center justify-center mx-auto mt-2 mb-3 ring-2 ring-purple-500/30">
                        <span className="text-white font-bold text-xl">{hierarchyTeam.supervisor.substring(0, 2).toUpperCase()}</span>
                      </div>
                      <div className="text-white font-semibold text-sm">{hierarchyTeam.supervisor}</div>
                      <div className="text-xs text-purple-300 mt-0.5">Orchestrates · Reviews · Approves</div>
                      {isExecuting && (
                        <div className="mt-2.5 flex items-center justify-center gap-1">
                          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vertical line from supervisor */}
                  <div className="w-px h-6 bg-gradient-to-b from-purple-500/60 to-purple-500/20"></div>

                  {/* Workers row with horizontal connector */}
                  <div className="relative flex items-start gap-3">
                    {/* Horizontal bar across workers */}
                    {hierarchyTeam.workers.length > 1 && (
                      <div
                        className="absolute top-0 h-px bg-purple-500/30"
                        style={{
                          left: `calc(${100 / (hierarchyTeam.workers.length * 2)}%)`,
                          right: `calc(${100 / (hierarchyTeam.workers.length * 2)}%)`,
                        }}
                      ></div>
                    )}
                    {hierarchyTeam.workers.map((worker) => (
                      <div key={worker} className="flex flex-col items-center">
                        {/* Vertical drop to worker */}
                        <div className="w-px h-6 bg-purple-500/30"></div>
                        {/* Worker card */}
                        <div className="px-4 py-4 bg-[#0A0A0F] border border-indigo-500/40 hover:border-indigo-400/60 rounded-xl w-44 text-center transition-colors">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 rounded-full flex items-center justify-center mx-auto mb-2">
                            <span className="text-indigo-300 font-semibold text-sm">{worker.substring(0, 2).toUpperCase()}</span>
                          </div>
                          <div className="text-white text-xs font-semibold truncate" title={worker}>{worker}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Specialist</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Metrics row */}
                  <div className="mt-8 flex items-center gap-8">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400 tabular-nums">{hierarchyMetrics?.review_loops ?? 0}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Review Loops</div>
                    </div>
                    <div className="w-px h-10 bg-slate-800"></div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-400 tabular-nums">{hierarchyMetrics?.escalations ?? 0}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Escalations</div>
                    </div>
                    <div className="w-px h-10 bg-slate-800"></div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400 tabular-nums">{hierarchyMetrics?.revisions ?? 0}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Revisions</div>
                    </div>
                  </div>

                  {/* Team name badge */}
                  <div className="mt-4 px-4 py-1.5 bg-purple-900/20 border border-purple-500/20 rounded-full">
                    <span className="text-xs text-purple-300 font-medium">{hierarchyTeam.teamName}</span>
                  </div>
                </>
              ) : isExecuting ? (
                /* Building team... */
                <div className="flex flex-col items-center gap-4 py-16">
                  <div className="relative">
                    <div className="w-16 h-16 border-2 border-purple-500/20 rounded-full"></div>
                    <div className="absolute inset-0 w-16 h-16 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div className="text-slate-400 text-sm">Building hierarchy team...</div>
                  <div className="text-xs text-slate-600">Analysing task and auto-generating specialist team</div>
                </div>
              ) : (
                /* Not yet started */
                <div className="flex flex-col items-center gap-4 py-16">
                  <div className="w-16 h-16 bg-purple-500/10 border border-purple-500/30 rounded-full flex items-center justify-center">
                    <span className="text-2xl text-purple-400">◈</span>
                  </div>
                  <div className="text-slate-400 text-sm">Hierarchy mode enabled</div>
                  <div className="text-xs text-slate-600">Team will be auto-built when execution starts</div>
                </div>
              )}
            </div>
          ) : (
            /* ── Flat Workflow Nodes ────────────────────────────────── */
            <div className="flex items-center justify-center gap-6 min-w-max">
              {workflowNodes.map((node, idx) => {
                const nodeStatus = nodeStatuses.find(s => s.nodeId === node.id);
                const nodeColor = colors[idx % colors.length];
                const isActive = nodeStatus?.status === 'active';
                const isCompleted = nodeStatus?.status === 'completed';
                const isFailed = nodeStatus?.status === 'failed';
                const isWaitingForInput = nodeStatus?.status === 'waiting_for_input';
                const displayColor = isFailed ? '#EF4444' : isWaitingForInput ? '#F59E0B' : nodeColor;

                // Get agent photo
                const agentPhoto = node.agentPhoto || getAgentPhoto(node.agentName || node.agentRole);

                return (
                  <div key={node.id} className="flex items-center">
                    {/* Node */}
                    <div className="relative">
                      {/* Pulsing glow for active or waiting node */}
                      {(isActive || isWaitingForInput) && (
                        <div
                          className="absolute -inset-4 rounded-lg blur-2xl opacity-40 animate-pulse"
                          style={{ backgroundColor: displayColor }}
                        ></div>
                      )}

                      {/* Node card */}
                      <div
                        className={`relative bg-[#0A0A0F] border rounded-lg p-5 w-64 transition-all ${
                          (isActive || isWaitingForInput) ? 'border-opacity-100' : 'border-opacity-50'
                        } ${isCompleted ? 'opacity-70' : ''}`}
                        style={{ borderColor: (isActive || isWaitingForInput) ? displayColor : '#334155' }}
                      >
                        {/* Order badge */}
                        <div
                          className={`absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                            isCompleted ? 'bg-green-600' : isFailed ? 'bg-red-600' : isWaitingForInput ? 'bg-amber-500 animate-pulse' : ''
                          }`}
                          style={{ backgroundColor: (isCompleted || isFailed || isWaitingForInput) ? undefined : displayColor }}
                        >
                          {isCompleted ? '✓' : isFailed ? '✕' : isWaitingForInput ? '?' : node.order}
                        </div>

                        {/* Agent Photo */}
                        <div className="mb-4">
                          {agentPhoto ? (
                            <img
                              src={agentPhoto}
                              alt={node.agentName || node.agentRole}
                              className={`w-16 h-16 rounded-full object-cover mx-auto border-2 ${
                                isActive ? 'ring-2 ring-offset-2 ring-offset-[#0A0A0F]' : ''
                              }`}
                              style={{ borderColor: displayColor }}
                            />
                          ) : (
                            <div
                              className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center text-white text-xl font-bold border-2`}
                              style={{ backgroundColor: `${displayColor}40`, borderColor: displayColor }}
                            >
                              {(node.agentName || node.agentRole).substring(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Agent name */}
                        <h3 className="text-base font-semibold text-white text-center mb-1">
                          {node.agentName || node.agentRole}
                        </h3>
                        <div className="text-xs text-slate-500 text-center mb-3">{node.agentRole}</div>

                        {/* Action */}
                        <p className="text-xs text-slate-400 text-center leading-relaxed mb-3">
                          {node.name || node.action || node.description}
                        </p>

                        {/* Tool indicator */}
                        {isActive && nodeStatus?.activeTool && (
                          <div className="flex items-center justify-center gap-2 p-2 bg-[#6366F1]/10 border border-[#6366F1]/30 rounded mb-3">
                            <div className="w-3 h-3 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs text-[#6366F1] font-medium">{nodeStatus.activeTool}</span>
                          </div>
                        )}

                        {/* Progress bar */}
                        {(isActive || isCompleted) && nodeStatus?.progress !== undefined && (
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full transition-all duration-500 rounded-full"
                              style={{
                                width: `${nodeStatus.progress}%`,
                                backgroundColor: isCompleted ? '#22C55E' : nodeColor,
                              }}
                            ></div>
                          </div>
                        )}

                        {/* Status */}
                        <div className="mt-3 pt-3 border-t border-slate-800">
                          <div className="text-xs text-center">
                            {isCompleted && <span className="text-green-500">Completed</span>}
                            {isFailed && <span className="text-red-500">Failed</span>}
                            {isWaitingForInput && <span className="text-amber-500 font-semibold">⚠️ Needs your input</span>}
                            {isActive && !isWaitingForInput && <span className="text-[#6366F1]">In Progress</span>}
                            {nodeStatus?.status === 'pending' && <span className="text-slate-500">Pending</span>}
                          </div>
                        </div>

                        {/* Output preview */}
                        {nodeStatus?.output && (
                          <div className="mt-3 p-2 bg-slate-900 rounded text-xs text-slate-400 max-h-20 overflow-hidden">
                            {nodeStatus.output.substring(0, 100)}...
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Connection line */}
                    {idx < workflowNodes.length - 1 && (
                      <div className="flex items-center mx-4">
                        <div className="w-12 h-0.5 bg-slate-700"></div>
                        <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Completion Summary + Rating */}
          {isComplete && (
            <div className="flex justify-center mt-12">
              <div className="w-full max-w-md">
                {/* Cost Summary Card */}
                <div className="px-6 py-5 bg-green-900/20 border border-green-500/30 rounded-xl">
                  <div className="text-center">
                    <div className="text-sm text-green-400 mb-1">Operation Complete</div>
                    <div className="text-2xl font-bold text-white">${totalCost.toFixed(2)}</div>
                    <div className="text-xs text-slate-400 mt-1">Total Cost</div>
                    {savedFileId && (
                      <div className="mt-4 pt-4 border-t border-green-500/20">
                        <a
                          href={`/dashboard?view=vault&fileId=${savedFileId}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-[#6366F1] hover:bg-[#5558E3] text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          View Results
                        </a>
                        <div className="text-xs text-slate-500 mt-2">{savedFileName}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rating Section */}
                <div className="mt-4 px-6 py-5 bg-[#0A0A0F] border border-slate-800 rounded-xl">
                  {!ratingSubmitted ? (
                    <>
                      <div className="text-center mb-4">
                        <div className="text-sm font-medium text-white mb-1">Rate this output</div>
                        <div className="text-xs text-slate-500">Your feedback helps agents improve</div>
                      </div>

                      {/* Star Rating */}
                      <div className="flex justify-center gap-2 mb-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onMouseEnter={() => setHoveredStar(star)}
                            onMouseLeave={() => setHoveredStar(0)}
                            onClick={() => setUserRating(star)}
                            className="transition-transform hover:scale-110 focus:outline-none"
                          >
                            <svg
                              className="w-8 h-8 transition-colors"
                              fill={(hoveredStar || userRating) >= star ? '#FDE047' : '#334155'}
                              stroke={(hoveredStar || userRating) >= star ? '#FDE047' : '#475569'}
                              strokeWidth={1}
                              viewBox="0 0 24 24"
                            >
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          </button>
                        ))}
                      </div>

                      {/* Rating label */}
                      {userRating > 0 && (
                        <div className="text-center text-xs text-slate-400 mb-4">
                          {userRating === 1 && 'Poor'}
                          {userRating === 2 && 'Below Average'}
                          {userRating === 3 && 'Average'}
                          {userRating === 4 && 'Good'}
                          {userRating === 5 && 'Excellent'}
                        </div>
                      )}

                      {/* Feedback textarea */}
                      {userRating > 0 && (
                        <div className="mb-4">
                          <textarea
                            value={ratingFeedback}
                            onChange={(e) => setRatingFeedback(e.target.value)}
                            placeholder="What could be improved? (optional)"
                            rows={2}
                            className="w-full bg-[#020617] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-[#6366F1] resize-none"
                          />
                        </div>
                      )}

                      {/* Submit button */}
                      {userRating > 0 && (
                        <button
                          onClick={submitRating}
                          disabled={isSubmittingRating}
                          className="w-full py-2 bg-[#6366F1] hover:bg-[#5558E3] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          {isSubmittingRating ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            'Submit Rating'
                          )}
                        </button>
                      )}
                    </>
                  ) : (
                    /* Rating submitted confirmation */
                    <div className="text-center py-2">
                      <div className="flex justify-center gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className="w-6 h-6"
                            fill={userRating >= star ? '#FDE047' : '#334155'}
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        ))}
                      </div>
                      <div className="text-sm text-green-400 font-medium mb-1">Thanks for your feedback!</div>
                      {qualityScore !== null && (
                        <div className="text-xs text-slate-500">
                          Quality score updated to {(qualityScore * 100).toFixed(0)}%
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Panel (Phase 4.2) */}
        {isChatExpanded ? (
          <div className="w-96 border-l border-slate-800 bg-[#0A0A0F] flex flex-col">
            {/* Chat Header */}
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <h3 className="text-xs font-semibold text-slate-400">EXECUTION CHAT</h3>
                <span className="text-xs text-slate-500">({chatMessages.length})</span>
              </div>
              <button
                onClick={() => setIsChatExpanded(false)}
                className="text-slate-500 hover:text-slate-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Chat Messages */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">
              {chatMessages.length === 0 ? (
                <div className="text-center text-slate-600 text-xs py-8">
                  No messages yet. Send a message to communicate with the agents during execution.
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isUser = msg.sender_type === 'user';
                  const isAgent = msg.sender_type === 'agent';
                  const isManager = msg.sender_type === 'manager';
                  const isSystem = msg.sender_type === 'system';

                  return (
                    <div key={msg.id} className="flex items-start gap-2">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {isUser ? (
                          <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                            <span className="text-xs text-blue-400">U</span>
                          </div>
                        ) : isAgent ? (
                          <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                            <span className="text-xs text-purple-400">A</span>
                          </div>
                        ) : isManager ? (
                          <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                            <span className="text-xs text-indigo-400">E</span>
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center">
                            <span className="text-xs text-slate-400">S</span>
                          </div>
                        )}
                      </div>

                      {/* Message Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium ${
                            isUser ? 'text-blue-400' :
                            isAgent ? 'text-purple-400' :
                            isManager ? 'text-indigo-400' :
                            'text-slate-400'
                          }`}>
                            {msg.sender_name}
                          </span>
                          {msg.message_type !== 'chat' && (
                            <span className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-500 uppercase">
                              {msg.message_type}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-600">
                            {new Date(msg.created_at).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {/* Content */}
                        <p className="text-xs text-slate-300 whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chat Input */}
            <div className="p-3 border-t border-slate-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChatMessage}
                  onChange={(e) => setNewChatMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendChatMessage();
                    }
                  }}
                  placeholder="Message to current agent..."
                  disabled={isSendingMessage || isComplete || isCancelled}
                  className="flex-1 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!newChatMessage.trim() || isSendingMessage || isComplete || isCancelled}
                  className="px-3 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors flex items-center gap-1"
                >
                  {isSendingMessage ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-600 mt-1.5">
                Press Enter to send • Messages go to the current agent
              </p>
            </div>
          </div>
        ) : (
          // Collapsed chat button
          <div className="w-12 border-l border-slate-800 bg-[#0A0A0F] flex flex-col items-center py-4">
            <button
              onClick={() => setIsChatExpanded(true)}
              className="relative p-2 text-slate-500 hover:text-purple-400 hover:bg-slate-800 rounded transition-colors"
              title="Open Chat"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {chatMessages.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full text-[10px] text-white flex items-center justify-center">
                  {chatMessages.length > 9 ? '9+' : chatMessages.length}
                </span>
              )}
            </button>
            <span className="text-[10px] text-slate-600 mt-2 [writing-mode:vertical-rl]">
              CHAT
            </span>
          </div>
        )}
      </div>

      {/* Live Activity Log */}
      <div className="flex-shrink-0 h-56 border-t border-slate-800 bg-[#0A0A0F] flex flex-col">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-400">LIVE ACTIVITY LOG</h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{logs.length} events</span>
            <button
              onClick={() => setLogs([])}
              className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
        <div ref={logContainerRef} className="flex-1 overflow-y-auto p-3 space-y-1 font-mono scrollbar-hide">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 text-xs">
              <span className="text-slate-600 flex-shrink-0">
                {log.timestamp.toLocaleTimeString('en-US', { hour12: false })}
              </span>
              <span
                className={`flex-shrink-0 font-medium ${
                  log.type === 'tool'
                    ? 'text-[#6366F1]'
                    : log.type === 'file'
                    ? 'text-[#FDE047]'
                    : log.type === 'output'
                    ? 'text-[#EC4899]'
                    : log.type === 'llm'
                    ? 'text-[#8B5CF6]'
                    : log.type === 'complete'
                    ? 'text-green-500'
                    : log.type === 'error'
                    ? 'text-red-500'
                    : 'text-slate-400'
                }`}
              >
                [{log.agent}]
              </span>
              <span className={`flex-1 ${
                log.type === 'error' ? 'text-red-400' :
                log.type === 'complete' ? 'text-green-400' :
                'text-slate-400'
              }`}>
                {log.message}
              </span>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-slate-600 text-center py-4">
              Waiting for execution to start...
            </div>
          )}
        </div>
      </div>

      {/* Assumption Panel (Phase 4.1) */}
      {currentAssumption && (
        <div
          data-assumption-panel
          className="flex-shrink-0 border-t border-slate-800 bg-gradient-to-br from-amber-500/10 to-orange-500/10 animate-in slide-in-from-bottom"
        >
          <div className="p-4">
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
              {/* Agent Photo */}
              {currentAssumption.agentPhoto && (
                <img
                  src={currentAssumption.agentPhoto}
                  alt={currentAssumption.agentName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-amber-500 ring-2 ring-amber-500/50 flex-shrink-0"
                />
              )}

              <div className="flex-1">
                {/* Badge */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded text-xs font-semibold text-amber-400">
                    {currentAssumption.agentName === 'Evo (Manager)' ? '🎯 MANAGER QUESTION' : '❓ AGENT QUESTION'}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    currentAssumption.priority === 'high' || currentAssumption.priority === 'critical'
                      ? 'bg-red-500/20 border border-red-500/30 text-red-400'
                      : 'bg-slate-700 text-slate-400'
                  }`}>
                    {currentAssumption.priority.toUpperCase()}
                  </span>
                </div>

                {/* Question */}
                <h4 className="text-white font-semibold text-lg mb-1">
                  {currentAssumption.agentName} needs your input
                </h4>
                <p className="text-amber-100 text-base mb-2">
                  {currentAssumption.question}
                </p>

                {/* Context */}
                {currentAssumption.context && (
                  <p className="text-slate-400 text-sm mb-3">
                    {currentAssumption.context}
                  </p>
                )}

                {/* Options (if provided) - Smart Quick Actions */}
                {currentAssumption.options && currentAssumption.options.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {currentAssumption.options.map((option, idx) => {
                      // Smart styling based on option content
                      const optionLower = option.toLowerCase();
                      const isYes = optionLower === 'yes' || optionLower === 'y' || optionLower === 'proceed' || optionLower === 'continue' || optionLower === 'approve';
                      const isNo = optionLower === 'no' || optionLower === 'n' || optionLower === 'cancel' || optionLower === 'decline';
                      const isSkip = optionLower === 'skip' || optionLower === 'maybe later' || optionLower === 'not sure';
                      const isCritical = optionLower.includes('critical') || optionLower.includes('urgent') || optionLower.includes('high priority');
                      const isMinor = optionLower.includes('minor') || optionLower.includes('low') || optionLower.includes('low priority');

                      let buttonClass = "px-4 py-2 bg-slate-800 hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/50 rounded text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed";

                      if (isYes) {
                        buttonClass = "px-4 py-2 bg-green-900/30 hover:bg-green-600/40 border border-green-600/50 hover:border-green-500 rounded text-sm text-green-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium";
                      } else if (isNo) {
                        buttonClass = "px-4 py-2 bg-red-900/30 hover:bg-red-600/40 border border-red-600/50 hover:border-red-500 rounded text-sm text-red-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium";
                      } else if (isSkip) {
                        buttonClass = "px-4 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-slate-500 rounded text-sm text-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed";
                      } else if (isCritical) {
                        buttonClass = "px-4 py-2 bg-red-900/30 hover:bg-red-500/30 border border-red-500/50 hover:border-red-400 rounded text-sm text-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold";
                      } else if (isMinor) {
                        buttonClass = "px-4 py-2 bg-blue-900/30 hover:bg-blue-500/30 border border-blue-500/50 hover:border-blue-400 rounded text-sm text-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed";
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setAssumptionAnswer(option);
                            submitAssumptionAnswer(option);
                          }}
                          disabled={isSubmittingAssumption}
                          className={buttonClass}
                          title={`Quick reply: ${option} (${idx + 1})`}
                        >
                          {option}
                          {idx < 9 && (
                            <span className="ml-2 text-xs opacity-60">
                              {idx + 1}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Custom Answer Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={assumptionAnswer}
                    onChange={(e) => setAssumptionAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && assumptionAnswer.trim()) {
                        submitAssumptionAnswer(assumptionAnswer);
                      }
                    }}
                    placeholder={currentAssumption.options.length > 0 ? "Or type your own answer..." : "Type your answer..."}
                    disabled={isSubmittingAssumption}
                    className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50"
                  />
                  <button
                    onClick={() => assumptionAnswer.trim() && submitAssumptionAnswer(assumptionAnswer)}
                    disabled={!assumptionAnswer.trim() || isSubmittingAssumption}
                    className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-white font-medium rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingAssumption ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
