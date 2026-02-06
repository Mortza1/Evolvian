'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTeamAgents, Agent } from '@/lib/services/agents';
import { workflowService } from '@/lib/services/workflows/workflow.service';

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
  status: 'pending' | 'active' | 'completed' | 'failed' | 'waiting';
  activeTool?: string;
  progress?: number;
  output?: string;
}

export default function WarRoomLive({ taskId, teamId, workflowNodes, taskDescription, initialStatus = 'pending', onClose }: WarRoomLiveProps) {
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
  const logContainerRef = useRef<HTMLDivElement>(null);
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
      const response = await fetch(`${baseUrl}/api/operations/${taskId}/execute`, {
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
        addLog('System', `Operation completed! Total cost: $${(data.total_cost || 0).toFixed(2)}`, 'complete');
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

      case 'error':
        setError(data.message);
        addLog('System', `Error: ${data.message}`, 'error');
        break;
    }
  }, [addLog, updateNodeStatus]);

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
            <h1 className="text-xl font-semibold text-white">Execution Theatre</h1>
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
          <div className="flex items-center justify-center gap-6 min-w-max">
            {workflowNodes.map((node, idx) => {
              const nodeStatus = nodeStatuses.find(s => s.nodeId === node.id);
              const nodeColor = colors[idx % colors.length];
              const isActive = nodeStatus?.status === 'active';
              const isCompleted = nodeStatus?.status === 'completed';
              const isFailed = nodeStatus?.status === 'failed';
              const displayColor = isFailed ? '#EF4444' : nodeColor;

              // Get agent photo
              const agentPhoto = node.agentPhoto || getAgentPhoto(node.agentName || node.agentRole);

              return (
                <div key={node.id} className="flex items-center">
                  {/* Node */}
                  <div className="relative">
                    {/* Pulsing glow for active node */}
                    {isActive && (
                      <div
                        className="absolute -inset-4 rounded-lg blur-2xl opacity-40 animate-pulse"
                        style={{ backgroundColor: displayColor }}
                      ></div>
                    )}

                    {/* Node card */}
                    <div
                      className={`relative bg-[#0A0A0F] border rounded-lg p-5 w-64 transition-all ${
                        isActive ? 'border-opacity-100' : 'border-opacity-50'
                      } ${isCompleted ? 'opacity-70' : ''}`}
                      style={{ borderColor: isActive ? displayColor : '#334155' }}
                    >
                      {/* Order badge */}
                      <div
                        className={`absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                          isCompleted ? 'bg-green-600' : isFailed ? 'bg-red-600' : ''
                        }`}
                        style={{ backgroundColor: isCompleted || isFailed ? undefined : displayColor }}
                      >
                        {isCompleted ? '✓' : isFailed ? '✕' : node.order}
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
                          {isActive && <span className="text-[#6366F1]">In Progress</span>}
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
    </div>
  );
}
