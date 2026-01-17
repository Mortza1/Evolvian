'use client';

import { useState, useEffect } from 'react';

interface FirstMissionProps {
  onComplete: () => void;
}

type MissionStage = 'start' | 'working' | 'assumption' | 'evolved' | 'complete';

export default function FirstMission({ onComplete }: FirstMissionProps) {
  const [stage, setStage] = useState<MissionStage>('start');
  const [workflowProgress, setWorkflowProgress] = useState(0);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [showAssumption, setShowAssumption] = useState(false);
  const [userResponse, setUserResponse] = useState('');
  const [logs, setLogs] = useState<Array<{ agent: string; message: string; time: string }>>([]);

  const agents = [
    { id: 'manager', name: 'Manager', color: 'from-[#6366F1] to-[#818CF8]' },
    { id: 'scanner', name: 'Scanner', color: 'from-emerald-500 to-teal-500' },
    { id: 'auditor', name: 'Auditor', color: 'from-amber-500 to-orange-500' },
    { id: 'reporter', name: 'Reporter', color: 'from-blue-500 to-indigo-500' },
  ];

  const addLog = (agent: string, message: string) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs((prev) => [...prev, { agent, message, time }]);
  };

  useEffect(() => {
    if (stage === 'working') {
      let timeouts: NodeJS.Timeout[] = [];

      // Simulate workflow progression
      const workflow = [
        { delay: 1000, agent: 'manager', message: 'Distributing task to Scanner...', progress: 10 },
        { delay: 2000, agent: 'scanner', message: 'Analyzing document structure...', progress: 25 },
        { delay: 3500, agent: 'scanner', message: 'Extracted 47 clauses, 12 data handling sections', progress: 40 },
        { delay: 4500, agent: 'manager', message: 'Forwarding to Auditor for compliance check...', progress: 50 },
        { delay: 5500, agent: 'auditor', message: 'Cross-referencing GDPR Article 44-50...', progress: 65 },
        { delay: 7000, agent: 'auditor', message: 'Found ambiguous clause regarding data storage in Germany', progress: 75 },
      ];

      workflow.forEach(({ delay, agent, message, progress }) => {
        const timeout = setTimeout(() => {
          setActiveAgent(agent);
          addLog(agent, message);
          setWorkflowProgress(progress);

          // Trigger assumption dialog after last log
          if (progress === 75) {
            const assumptionTimeout = setTimeout(() => setShowAssumption(true), 500);
            timeouts.push(assumptionTimeout);
          }
        }, delay);
        timeouts.push(timeout);
      });

      return () => {
        timeouts.forEach(timeout => clearTimeout(timeout));
      };
    }
  }, [stage]);

  const handleStartMission = () => {
    setStage('working');
  };

  const handleAssumptionResponse = () => {
    if (!userResponse.trim()) return;

    setShowAssumption(false);
    setStage('evolved');

    // Continue workflow
    setTimeout(() => {
      addLog('auditor', `User clarified: "${userResponse}"`);
      setWorkflowProgress(85);
    }, 500);

    setTimeout(() => {
      addLog('auditor', 'Updating compliance knowledge base...');
      setWorkflowProgress(90);
    }, 1500);

    setTimeout(() => {
      addLog('manager', 'Forwarding to Reporter for summary...');
      setWorkflowProgress(95);
    }, 2500);

    setTimeout(() => {
      addLog('reporter', 'Generating executive summary...');
      setWorkflowProgress(100);
    }, 3500);

    setTimeout(() => {
      setStage('complete');
    }, 4500);
  };

  return (
    <div className="min-h-screen w-full bg-[#020617] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#020617] via-[#1E293B] to-[#020617] border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-1">First Mission: GDPR Compliance Review</h1>
          <p className="text-slate-400 text-sm">Watch your team in action</p>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Workspace */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {/* Task Card */}
            {stage === 'start' && (
              <div className="glass rounded-2xl p-8 mb-6 animate-fadeIn">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-white mb-2">Sample Task</h2>
                    <p className="text-slate-300 mb-4">
                      "Review this contract for GDPR compliance, specifically focusing on cross-border data transfers to Germany."
                    </p>
                    <div className="bg-[#020617]/50 rounded-lg p-4 mb-4">
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Document</p>
                      <p className="text-sm text-slate-300">sample_contract_v2.pdf (127 KB)</p>
                    </div>
                    <button
                      onClick={handleStartMission}
                      className="px-6 py-3 bg-gradient-to-r from-[#6366F1] to-[#818CF8] text-white font-semibold rounded-lg shadow-lg shadow-[#6366F1]/30 hover:shadow-[#6366F1]/50 transform hover:scale-105 transition-all"
                    >
                      Start Task
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Workflow Visualization */}
            {stage !== 'start' && (
              <div className="glass rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Workflow Progress</h3>
                  <span className="text-sm text-[#FDE047] font-semibold">{workflowProgress}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-[#020617]/50 rounded-full mb-6 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#6366F1] to-[#818CF8] transition-all duration-500"
                    style={{ width: `${workflowProgress}%` }}
                  ></div>
                </div>

                {/* Agent Flow */}
                <div className="flex items-center justify-between">
                  {agents.map((agent, index) => (
                    <div key={agent.id} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-16 h-16 bg-gradient-to-br ${agent.color} rounded-xl flex items-center justify-center transition-all ${
                            activeAgent === agent.id ? 'ring-4 ring-[#6366F1] scale-110 pulse-glow' : 'opacity-50'
                          }`}
                        >
                          <span className="text-white font-bold text-sm">
                            {agent.name.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 mt-2">{agent.name}</span>
                      </div>
                      {index < agents.length - 1 && (
                        <svg className="w-8 h-8 text-slate-600 mx-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Evolution Notification */}
            {stage === 'evolved' && (
              <div className="glass rounded-2xl p-6 mb-6 border-2 border-[#FDE047] animate-fadeIn">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#FDE047] rounded-full flex items-center justify-center animate-pulse">
                    <svg className="w-6 h-6 text-[#020617]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1">Employee Evolution!</h3>
                    <p className="text-slate-300">
                      <span className="font-semibold text-[#FDE047]">Auditor</span> has learned from your feedback
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      Memory updated: German servers are compliant for GDPR data transfers
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Final Report */}
            {stage === 'complete' && (
              <div className="glass rounded-2xl p-8 animate-fadeIn">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">Task Completed</h3>
                  <div className="flex items-center gap-2 text-green-400">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold">Success</span>
                  </div>
                </div>

                <div className="bg-[#020617]/50 rounded-lg p-6 mb-6">
                  <h4 className="text-sm font-semibold text-white mb-3">Executive Summary</h4>
                  <p className="text-slate-300 text-sm leading-relaxed mb-3">
                    The contract has been reviewed for GDPR compliance. All clauses related to cross-border data transfers comply with Articles 44-50 of the GDPR.
                  </p>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    <span className="font-semibold text-emerald-400">No risks identified.</span> The data storage provisions for Germany are compliant with existing server infrastructure.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-[#020617]/30 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-white mb-1">47</div>
                    <div className="text-xs text-slate-400">Clauses Reviewed</div>
                  </div>
                  <div className="bg-[#020617]/30 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-400 mb-1">0</div>
                    <div className="text-xs text-slate-400">Risks Found</div>
                  </div>
                  <div className="bg-[#020617]/30 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-[#FDE047] mb-1">$0.12</div>
                    <div className="text-xs text-slate-400">Task Cost</div>
                  </div>
                </div>

                <button
                  onClick={onComplete}
                  className="w-full px-6 py-4 bg-gradient-to-r from-[#6366F1] to-[#818CF8] text-white font-semibold rounded-lg shadow-lg shadow-[#6366F1]/30 hover:shadow-[#6366F1]/50 transform hover:scale-105 transition-all"
                >
                  Enter Your Dashboard
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Activity Log Sidebar */}
        <div className="w-96 border-l border-slate-800 bg-[#020617] p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Live Activity Log
          </h3>
          <div className="space-y-2">
            {logs.map((log, index) => (
              <div key={index} className="bg-[#1E293B]/50 rounded-lg p-3 text-xs animate-fadeIn">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-[#6366F1]">{log.agent}</span>
                  <span className="text-slate-500">{log.time}</span>
                </div>
                <p className="text-slate-300">{log.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Assumption Dialog */}
      {showAssumption && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="glass rounded-2xl p-8 max-w-lg w-full animate-fadeIn border-2 border-[#6366F1]">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">AU</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Auditor needs clarification</h3>
                <p className="text-sm text-slate-400">Level 12 Compliance Specialist</p>
              </div>
            </div>

            <div className="bg-[#020617]/50 rounded-lg p-4 mb-6">
              <p className="text-slate-200 leading-relaxed">
                CEO, I found an ambiguous clause regarding data storage in Germany (Section 4.2).
                Should I flag this as a compliance risk?
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={userResponse}
                onChange={(e) => setUserResponse(e.target.value)}
                placeholder="Type your response..."
                className="w-full px-4 py-3 bg-[#1E293B] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                onKeyDown={(e) => e.key === 'Enter' && handleAssumptionResponse()}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setUserResponse("No, we have a server there. It's safe.");
                    setTimeout(handleAssumptionResponse, 100);
                  }}
                  className="flex-1 px-4 py-2 bg-[#6366F1] hover:bg-[#5558E3] text-white rounded-lg text-sm font-medium transition-colors"
                >
                  No, it's compliant
                </button>
                <button
                  onClick={() => {
                    setUserResponse("Yes, flag it as medium risk");
                    setTimeout(handleAssumptionResponse, 100);
                  }}
                  className="flex-1 px-4 py-2 bg-[#1E293B] hover:bg-[#2D3B52] text-white border border-slate-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Yes, flag it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
