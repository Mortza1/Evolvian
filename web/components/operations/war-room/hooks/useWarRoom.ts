'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTeamAgents } from '@/lib/services/agents';
import { workflowService } from '@/lib/services/workflows/workflow.service';
import type { ExecutionMessage } from '@/lib/services/workflows/types';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { useToast } from '@/lib/contexts/ToastContext';
import type {
  LogEntry, NodeStatus, AssumptionData,
  HierarchyTeam, HierarchyMetrics, WorkflowNode,
} from '../types';

export function useWarRoom(
  taskId: number,
  teamId: string,
  workflowNodes: WorkflowNode[],
  initialStatus: 'pending' | 'active' | 'completed' | 'failed' | 'paused' | 'cancelled' = 'pending',
  initialHierarchyTeam?: HierarchyTeam,
  initialVaultFileId?: number,
  initialVaultFileName?: string,
) {
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
  const [savedFileId, setSavedFileId] = useState<number | null>(initialVaultFileId ?? null);
  const [savedFileName, setSavedFileName] = useState<string | null>(initialVaultFileName ?? null);
  const [userRating, setUserRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [hierarchyTeam, setHierarchyTeam] = useState<HierarchyTeam | null>(initialHierarchyTeam ?? null);
  const [hierarchyMetrics, setHierarchyMetrics] = useState<HierarchyMetrics | null>(null);
  const [activeStepTeamId, setActiveStepTeamId] = useState<string | null>(null);
  const [currentAssumption, setCurrentAssumption] = useState<AssumptionData | null>(null);
  const [assumptionAnswer, setAssumptionAnswer] = useState('');
  const [isSubmittingAssumption, setIsSubmittingAssumption] = useState(false);
  const [chatMessages, setChatMessages] = useState<ExecutionMessage[]>([]);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [newChatMessage, setNewChatMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const logContainerRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const { agents: hiredAgents } = useTeamAgents({ teamId: parseInt(teamId, 10), autoFetch: true });

  const getAgentPhoto = useCallback((agentName: string) => {
    const agent = hiredAgents.find(a =>
      a.name.toLowerCase() === agentName.toLowerCase() ||
      a.role.toLowerCase().includes(agentName.toLowerCase())
    );
    return agent?.photo_url;
  }, [hiredAgents]);

  const addLog = useCallback((agent: string, message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      agent,
      message,
      type,
    }]);
  }, []);

  const updateNodeStatus = useCallback((nodeId: string, updates: Partial<NodeStatus>) => {
    setNodeStatuses(prev =>
      prev.map(s => s.nodeId === nodeId ? { ...s, ...updates } : s)
    );
  }, []);

  const handleEvent = useCallback((data: any) => {
    switch (data.type) {
      case 'start':
        addLog('System', `Operation started: ${data.title}`, 'info');
        break;
      case 'node_start':
        updateNodeStatus(data.node_id, { status: 'active', progress: 0, activeTool: undefined });
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
        if (data.status === 'calling') addLog(data.agent_name, data.message || 'Processing...', 'llm');
        else if (data.status === 'completed') {
          addLog(data.agent_name, 'Output generated', 'output');
          if (data.output_preview) updateNodeStatus(data.node_id, { output: data.output_preview });
        } else if (data.status === 'error') {
          addLog(data.agent_name, `Error: ${data.error}`, 'error');
        }
        break;
      case 'node_complete':
        updateNodeStatus(data.node_id, {
          status: data.status === 'failed' ? 'failed' : 'completed',
          progress: 100,
          activeTool: undefined,
        });
        addLog(data.agent_name, 'Task completed', 'complete');
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
        setTotalCost(data.total_cost || 0);
        addLog('System', `Operation paused at "${data.node_name}". Click Resume to continue.`, 'info');
        break;
      case 'cancelled':
        setIsCancelled(true);
        setIsExecuting(false);
        setIsCancelRequested(false);
        setActiveStepTeamId(null);
        setTotalCost(data.total_cost || 0);
        addLog('System', `Operation cancelled at "${data.node_name}". Total cost: $${(data.total_cost || 0).toFixed(2)}`, 'error');
        break;
      case 'resumed':
        addLog('System', `Resuming from node ${data.from_node + 1}`, 'info');
        break;
      case 'hierarchy_decompose':
        if (data.workers) {
          setHierarchyTeam({ supervisor: data.supervisor, workers: data.workers, teamName: data.team_name || 'Hierarchical Team', stepTree: data.step_tree });
          addLog(data.supervisor, `Team ready: ${data.workers.join(', ')}`, 'info');
          if (data.reasoning) addLog(data.supervisor, data.reasoning, 'info');
        } else {
          addLog(data.supervisor || 'Supervisor', data.message || 'Decomposing task...', 'llm');
        }
        break;
      case 'hierarchy_delegate':
        addLog('Supervisor', data.message || `→ ${data.worker}: ${data.subtask_description}`, 'info');
        break;
      case 'hierarchy_worker_start':
        addLog(data.worker, data.message || 'Working on subtask...', 'llm');
        if (data.team_id) setActiveStepTeamId(data.team_id);
        break;
      case 'hierarchy_worker_complete':
        addLog(data.worker, data.message || 'Subtask complete', 'output');
        if (data.output_preview) addLog(data.worker, `Preview: ${data.output_preview.slice(0, 120)}...`, 'output');
        setActiveStepTeamId(null);
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
        if (data.output_length) addLog('System', `Final output: ${data.output_length.toLocaleString()} characters`, 'complete');
        break;
      case 'assumption_raised':
      case 'manager_question': {
        const isManager = data.type === 'manager_question';
        const assumption: AssumptionData = {
          operationId: data.operation_id,
          nodeId: data.node_id,
          agentName: isManager ? 'Evo (Manager)' : data.agent_name,
          agentPhoto: isManager ? '/evo-avatar.png' : data.agent_photo,
          question: data.question,
          context: data.context,
          options: data.options || [],
          priority: data.priority,
          assumptionIndex: data.assumption_index,
        };
        setCurrentAssumption(assumption);
        updateNodeStatus(data.node_id, { status: 'waiting_for_input' });
        setIsPaused(true);
        addLog(assumption.agentName, `Needs your input: ${data.question}`, 'info');
        playNotificationSound();
        if (canNotify) {
          showNotification({
            title: `${assumption.agentName} needs your input`,
            body: data.question,
            tag: `assumption-${data.operation_id}-${data.assumption_index}`,
            requireInteraction: true,
            onClick: () => window.focus(),
          });
        }
        showToast({
          type: 'assumption',
          title: `${assumption.agentName} needs your input`,
          message: data.question,
          duration: 0,
          action: {
            label: 'View',
            onClick: () => {
              document.querySelector('[data-assumption-panel]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            },
          },
        });
        break;
      }
      case 'assumption_answered':
        setCurrentAssumption(null);
        setAssumptionAnswer('');
        setIsPaused(false);
        addLog('System', 'Input received. Resuming execution...', 'info');
        break;
      case 'error':
        setError(data.message);
        addLog('System', `Error: ${data.message}`, 'error');
        break;
    }
  }, [addLog, updateNodeStatus, canNotify, showNotification, showToast, playNotificationSound]);

  const streamSSE = useCallback(async (url: string, token: string) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'text/event-stream' },
    });

    if (response.status === 401) throw new Error('Session expired. Please log in again.');
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try { handleEvent(JSON.parse(line.slice(6))); }
          catch { console.warn('Failed to parse SSE event:', line); }
        }
      }
    }
  }, [handleEvent]);

  const startExecution = useCallback(async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    setError(null);
    addLog('System', 'Starting operation execution...', 'info');

    const token = localStorage.getItem('access_token');
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    if (!token) {
      setError('Not authenticated. Please log in again.');
      addLog('System', 'Error: No authentication token found.', 'error');
      setIsExecuting(false);
      return;
    }

    try {
      await streamSSE(`${baseUrl}/api/operations/${taskId}/execute-hierarchical`, token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Execution failed';
      setError(message);
      addLog('System', `Error: ${message}`, 'error');
    } finally {
      setIsExecuting(false);
      setIsPauseRequested(false);
      setIsCancelRequested(false);
    }
  }, [taskId, isExecuting, addLog, streamSSE]);

  const pauseExecution = useCallback(async () => {
    if (!isExecuting || isPauseRequested) return;
    setIsPauseRequested(true);
    addLog('System', 'Pause requested...', 'info');
    const token = localStorage.getItem('access_token');
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    try {
      const res = await fetch(`${baseUrl}/api/operations/${taskId}/pause`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!data.success) { addLog('System', `Pause failed: ${data.message}`, 'error'); setIsPauseRequested(false); }
    } catch (err) {
      addLog('System', `Error: ${err instanceof Error ? err.message : 'Failed to pause'}`, 'error');
      setIsPauseRequested(false);
    }
  }, [taskId, isExecuting, isPauseRequested, addLog]);

  const cancelExecution = useCallback(async () => {
    if (isCancelRequested) return;
    setIsCancelRequested(true);
    addLog('System', 'Cancel requested...', 'info');
    const token = localStorage.getItem('access_token');
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    try {
      const res = await fetch(`${baseUrl}/api/operations/${taskId}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        // 'cancelled' = was paused/pending, done immediately
        // 'cancel_requested' = running, will stop at next boundary via SSE
        if (data.status === 'cancelled') {
          setIsCancelled(true);
          setIsPaused(false);
          addLog('System', 'Operation cancelled.', 'error');
        }
        // else: stay in isCancelRequested=true state; SSE 'cancelled' event will finalize
      } else {
        addLog('System', `Cancel failed: ${data.message}`, 'error');
        setIsCancelRequested(false);
      }
    } catch (err) {
      addLog('System', `Error: ${err instanceof Error ? err.message : 'Failed to cancel'}`, 'error');
      setIsCancelRequested(false);
    }
  }, [taskId, isCancelRequested, addLog]);

  const resumeExecution = useCallback(async () => {
    if (isExecuting || !isPaused) return;
    setIsExecuting(true);
    setIsPaused(false);
    setError(null);
    addLog('System', 'Resuming operation...', 'info');
    const token = localStorage.getItem('access_token');
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    try {
      await streamSSE(`${baseUrl}/api/operations/${taskId}/resume`, token!);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Resume failed';
      setError(message);
      addLog('System', `Error: ${message}`, 'error');
      setIsPaused(true);
    } finally {
      setIsExecuting(false);
      setIsPauseRequested(false);
      setIsCancelRequested(false);
    }
  }, [taskId, isExecuting, isPaused, addLog, streamSSE]);

  const submitAssumptionAnswer = useCallback(async (answer: string) => {
    if (!currentAssumption || isSubmittingAssumption) return;
    setIsSubmittingAssumption(true);
    try {
      const res = await fetch(`/api/operations/${taskId}/assumption/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer, assumption_index: currentAssumption.assumptionIndex }),
      });
      const result = await res.json();
      if (result.success) {
        addLog('System', 'Answer submitted. Execution will resume...', 'complete');
      } else {
        addLog('System', `Failed to submit answer: ${result.message}`, 'error');
      }
    } catch {
      addLog('System', 'Failed to submit answer. Please try again.', 'error');
    } finally {
      setIsSubmittingAssumption(false);
    }
  }, [currentAssumption, taskId, isSubmittingAssumption, addLog]);

  const submitRating = useCallback(async () => {
    if (userRating === 0 || isSubmittingRating) return;
    setIsSubmittingRating(true);
    try {
      const result = await workflowService.rateOperation(taskId, userRating, ratingFeedback || undefined);
      if (result.success) {
        setRatingSubmitted(true);
        setQualityScore(result.quality_score ?? null);
        addLog('System', `Rating submitted: ${userRating}/5 stars.`, 'complete');
      } else {
        addLog('System', `Failed to submit rating: ${result.error}`, 'error');
      }
    } catch {
      addLog('System', 'Failed to submit rating', 'error');
    } finally {
      setIsSubmittingRating(false);
    }
  }, [taskId, userRating, ratingFeedback, isSubmittingRating, addLog]);

  const loadChatMessages = useCallback(async () => {
    try {
      const result = await workflowService.getExecutionMessages(taskId);
      if (result.success && result.messages) setChatMessages(result.messages);
    } catch { /* silent */ }
  }, [taskId]);

  const sendChatMessage = useCallback(async () => {
    if (!newChatMessage.trim() || isSendingMessage) return;
    const content = newChatMessage.trim();
    setNewChatMessage('');
    setIsSendingMessage(true);
    try {
      const result = await workflowService.sendExecutionMessage(taskId, content, 'current_agent', 'chat');
      if (result.success && result.message) {
        setChatMessages(prev => [...prev, result.message!]);
      } else {
        addLog('System', `Failed to send message: ${result.error}`, 'error');
      }
    } catch {
      addLog('System', 'Failed to send message', 'error');
    } finally {
      setIsSendingMessage(false);
    }
  }, [taskId, newChatMessage, isSendingMessage, addLog]);

  // Init node statuses
  useEffect(() => {
    const initialStatuses = workflowNodes.map(node => ({
      nodeId: node.id,
      status: initialStatus === 'completed' ? 'completed' as const : 'pending' as const,
      progress: initialStatus === 'completed' ? 100 : 0,
    }));
    setNodeStatuses(initialStatuses);
    if (initialStatus === 'completed') addLog('System', 'This operation has already been completed.', 'complete');
    else if (initialStatus === 'active') addLog('System', 'This operation is in progress.', 'info');
    else if (initialStatus === 'paused') addLog('System', 'This operation is paused. Click "Resume" to continue.', 'info');
    else if (initialStatus === 'cancelled') addLog('System', 'This operation was cancelled.', 'error');
  }, [workflowNodes, initialStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
  }, [logs]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current && isChatExpanded) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, isChatExpanded]);

  // Load chat on mount
  useEffect(() => { loadChatMessages(); }, [loadChatMessages]);

  // Keyboard shortcuts for assumption quick replies
  useEffect(() => {
    if (!currentAssumption?.options?.length) return;
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const num = parseInt(e.key);
      if (num >= 1 && num <= Math.min(9, currentAssumption.options.length)) {
        e.preventDefault();
        const option = currentAssumption.options[num - 1];
        setAssumptionAnswer(option);
        submitAssumptionAnswer(option);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentAssumption, submitAssumptionAnswer]);

  // Auto-start for pending tasks
  useEffect(() => {
    if (workflowNodes.length > 0 && !isExecuting && !isComplete && !hasStarted && initialStatus === 'pending') {
      const timer = setTimeout(() => { setHasStarted(true); startExecution(); }, 1000);
      return () => clearTimeout(timer);
    }
  }, [workflowNodes, startExecution, isExecuting, isComplete, hasStarted, initialStatus]);

  return {
    // state
    logs, nodeStatuses, isExecuting, isComplete, isPaused, isCancelled,
    isPauseRequested, isCancelRequested, totalCost, error,
    savedFileId, savedFileName,
    userRating, setUserRating, hoveredStar, setHoveredStar,
    ratingFeedback, setRatingFeedback, isSubmittingRating, ratingSubmitted, qualityScore,
    hierarchyTeam, hierarchyMetrics, activeStepTeamId,
    currentAssumption, assumptionAnswer, setAssumptionAnswer, isSubmittingAssumption,
    chatMessages, isChatExpanded, setIsChatExpanded,
    newChatMessage, setNewChatMessage, isSendingMessage,
    // refs
    logContainerRef, chatContainerRef,
    // helpers
    getAgentPhoto,
    // actions
    startExecution, pauseExecution, cancelExecution, resumeExecution,
    submitAssumptionAnswer, submitRating,
    sendChatMessage, setLogs,
    setHasStarted,
  };
}
