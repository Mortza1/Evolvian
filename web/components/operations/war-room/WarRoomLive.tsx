'use client';

import { useWarRoom } from './hooks/useWarRoom';
import { ActivityLog } from './components/ActivityLog';
import { AssumptionPanel } from './components/AssumptionPanel';
import { ChatPanel } from './components/ChatPanel';
import { CompletionPanel } from './components/CompletionPanel';
import { HierarchyView } from './components/HierarchyView';
import type { WarRoomLiveProps } from './types';

export default function WarRoomLive({ taskId, teamId, workflowNodes, taskDescription, initialStatus = 'pending', onClose }: WarRoomLiveProps) {
  const war = useWarRoom(taskId, teamId, workflowNodes, initialStatus);

  return (
    <div className="h-full flex flex-col" style={{ background: '#080E11', fontFamily: "'Syne', sans-serif" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 border-b px-8 py-5" style={{ borderColor: '#162025', background: '#080E11' }}>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '19px', color: '#EAE6DF', letterSpacing: '-0.01em' }}>
                Execution Theatre
              </h1>
              <span
                className="rounded border px-2 py-0.5 text-[10px] uppercase"
                style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#5A9E8F', borderColor: '#5A9E8F30', background: '#5A9E8F0A', letterSpacing: '0.08em' }}
              >
                ◈ Hierarchy
              </span>

              {war.isExecuting && (
                <div className="flex items-center gap-2 rounded border px-2.5 py-1" style={{ background: '#5A9E8F0A', borderColor: '#5A9E8F30' }}>
                  <div className="h-1.5 w-1.5 rounded-full bg-[#5A9E8F] animate-pulse" />
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#5A9E8F' }}>
                    {war.isPauseRequested ? 'Pausing…' : war.isCancelRequested ? 'Cancelling…' : 'Live'}
                  </span>
                </div>
              )}
              {war.isComplete && (
                <div className="rounded border px-2.5 py-1" style={{ background: '#5A9E8F0A', borderColor: '#5A9E8F30' }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#5A9E8F' }}>Complete</span>
                </div>
              )}
              {war.isPaused && !war.isExecuting && (
                <div className="rounded border px-2.5 py-1" style={{ background: '#BF8A520A', borderColor: '#BF8A5230' }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#BF8A52' }}>Paused</span>
                </div>
              )}
              {war.isCancelled && (
                <div className="rounded border px-2.5 py-1" style={{ background: '#9E5A5A0A', borderColor: '#9E5A5A30' }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#9E5A5A' }}>Cancelled</span>
                </div>
              )}
              {war.error && !war.isCancelled && (
                <div className="rounded border px-2.5 py-1" style={{ background: '#9E5A5A0A', borderColor: '#9E5A5A30' }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#9E5A5A' }}>Error</span>
                </div>
              )}
            </div>
            <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '13px', color: '#3A5056' }} className="truncate max-w-xl">
              {taskDescription}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {war.isExecuting && !war.isPauseRequested && !war.isCancelRequested && (
              <>
                <button
                  onClick={war.pauseExecution}
                  className="flex items-center gap-1.5 rounded border px-3 py-1.5 text-[11px] transition-all"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", borderColor: '#BF8A5240', color: '#BF8A52', background: '#BF8A5210' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#BF8A5220'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#BF8A5210'; }}
                >
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Pause
                </button>
                <button
                  onClick={war.cancelExecution}
                  className="flex items-center gap-1.5 rounded border px-3 py-1.5 text-[11px] transition-all"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", borderColor: '#9E5A5A40', color: '#9E5A5A', background: '#9E5A5A10' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#9E5A5A20'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#9E5A5A10'; }}
                >
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  Cancel
                </button>
              </>
            )}
            {war.isPaused && !war.isExecuting && !war.isCancelled && (
              <>
                <button
                  onClick={war.resumeExecution}
                  className="flex items-center gap-1.5 rounded border px-3 py-1.5 text-[11px] transition-all"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", borderColor: '#5A9E8F50', color: '#5A9E8F', background: '#5A9E8F12' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#5A9E8F22'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#5A9E8F12'; }}
                >
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Resume
                </button>
                <button
                  onClick={war.cancelExecution}
                  className="flex items-center gap-1.5 rounded border px-3 py-1.5 text-[11px] transition-all"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", borderColor: '#9E5A5A40', color: '#9E5A5A', background: '#9E5A5A10' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#9E5A5A20'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#9E5A5A10'; }}
                >
                  Cancel
                </button>
              </>
            )}
            {!war.isExecuting && !war.isComplete && !war.isPaused && !war.isCancelled && initialStatus !== 'pending' && (
              <button
                onClick={() => { war.setHasStarted(true); war.startExecution(); }}
                className="rounded border px-3 py-1.5 text-[11px] transition-all"
                style={{ fontFamily: "'IBM Plex Mono', monospace", background: '#5A9E8F12', borderColor: '#5A9E8F50', color: '#5A9E8F' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#5A9E8F22'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#5A9E8F12'; }}
              >
                Start Execution →
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded border transition-all"
                style={{ borderColor: '#1E2D30', color: '#3A5056', background: 'transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#B8B2AA'; e.currentTarget.style.borderColor = '#2A4A52'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#3A5056'; e.currentTarget.style.borderColor = '#1E2D30'; }}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto scrollbar-hide px-8 py-8">
          <HierarchyView
            hierarchyTeam={war.hierarchyTeam}
            hierarchyMetrics={war.hierarchyMetrics}
            isExecuting={war.isExecuting}
          />

          {war.isComplete && (
            <CompletionPanel
              totalCost={war.totalCost}
              savedFileId={war.savedFileId}
              savedFileName={war.savedFileName}
              userRating={war.userRating}
              hoveredStar={war.hoveredStar}
              ratingFeedback={war.ratingFeedback}
              isSubmittingRating={war.isSubmittingRating}
              ratingSubmitted={war.ratingSubmitted}
              qualityScore={war.qualityScore}
              onRatingChange={war.setUserRating}
              onHoverChange={war.setHoveredStar}
              onFeedbackChange={war.setRatingFeedback}
              onSubmitRating={war.submitRating}
            />
          )}
        </div>

        <ChatPanel
          messages={war.chatMessages}
          isExpanded={war.isChatExpanded}
          newMessage={war.newChatMessage}
          isSending={war.isSendingMessage}
          isDisabled={war.isComplete || war.isCancelled}
          chatContainerRef={war.chatContainerRef}
          onToggle={() => war.setIsChatExpanded(v => !v)}
          onMessageChange={war.setNewChatMessage}
          onSend={war.sendChatMessage}
        />
      </div>

      <ActivityLog
        logs={war.logs}
        logContainerRef={war.logContainerRef}
        onClear={() => war.setLogs([])}
      />

      {war.currentAssumption && (
        <AssumptionPanel
          assumption={war.currentAssumption}
          answer={war.assumptionAnswer}
          isSubmitting={war.isSubmittingAssumption}
          onAnswerChange={war.setAssumptionAnswer}
          onSubmit={war.submitAssumptionAnswer}
        />
      )}
    </div>
  );
}
