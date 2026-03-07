'use client';

import { useWarRoom } from './hooks/useWarRoom';
import { ActivityLog } from './components/ActivityLog';
import { AssumptionPanel } from './components/AssumptionPanel';
import { ChatPanel } from './components/ChatPanel';
import { CompletionPanel } from './components/CompletionPanel';
import { FlatWorkflowView } from './components/FlatWorkflowView';
import { HierarchyView } from './components/HierarchyView';
import type { WarRoomLiveProps } from './types';

export default function WarRoomLive({ taskId, teamId, workflowNodes, taskDescription, initialStatus = 'pending', onClose }: WarRoomLiveProps) {
  const war = useWarRoom(taskId, teamId, workflowNodes, initialStatus);

  return (
    <div className="h-full flex flex-col bg-[#020617]">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-white">Execution Theatre</h1>
              <span className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/40 rounded text-xs text-purple-300 font-semibold uppercase tracking-wider">
                ◈ Hierarchy
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">{taskDescription}</p>
          </div>
          <div className="flex items-center gap-3">
            {war.isExecuting && (
              <div className="px-3 py-1.5 bg-[#6366F1]/20 border border-[#6366F1]/30 rounded text-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-[#6366F1] rounded-full animate-pulse" />
                <span className="text-[#6366F1] font-medium">
                  {war.isPauseRequested ? 'Pausing...' : war.isCancelRequested ? 'Cancelling...' : 'Live'}
                </span>
              </div>
            )}
            {war.isComplete && <div className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded text-sm"><span className="text-green-500 font-medium">Completed</span></div>}
            {war.isPaused && !war.isExecuting && <div className="px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded text-sm"><span className="text-amber-500 font-medium">Paused</span></div>}
            {war.isCancelled && <div className="px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded text-sm"><span className="text-red-500 font-medium">Cancelled</span></div>}
            {war.error && !war.isCancelled && <div className="px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded text-sm"><span className="text-red-500 font-medium">Error</span></div>}

            {war.isExecuting && !war.isPauseRequested && !war.isCancelRequested && (
              <>
                <button onClick={war.pauseExecution} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-sm font-medium transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  Pause
                </button>
                <button onClick={war.cancelExecution} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-sm font-medium transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                  Cancel
                </button>
              </>
            )}
            {war.isPaused && !war.isExecuting && !war.isCancelled && (
              <>
                <button onClick={war.resumeExecution} className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-medium transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                  Resume
                </button>
                <button onClick={war.cancelExecution} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-sm font-medium transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                  Cancel
                </button>
              </>
            )}
            {!war.isExecuting && !war.isComplete && !war.isPaused && !war.isCancelled && initialStatus !== 'pending' && (
              <button onClick={() => { war.setHasStarted(true); war.startExecution(); }} className="px-3 py-1.5 bg-[#6366F1] hover:bg-[#5558E3] text-white rounded text-sm font-medium transition-colors">
                Start Execution
              </button>
            )}
            {onClose && (
              <button onClick={onClose} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded text-sm transition-colors">
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-8 overflow-auto scrollbar-hide">
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
