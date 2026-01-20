'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Breadcrumb from './Breadcrumb';
import CorporateStatusBar from './CorporateStatusBar';
import ManagerChat from './ManagerChat';
import ActiveOperations from './ActiveOperations';
import TeamOverview from './TeamOverview';
import NewOperationModal, { OperationConfig } from './NewOperationModal';
import OfficeView from './views/OfficeView';
import TalentHubView from './views/TalentHubView';
import BoardView from './views/BoardView';
import NeuralVaultView from '../neural-vault/NeuralVaultView';
import WorkshopView from '../workshop/WorkshopView';
import HomeView from '../home/HomeView';
import InboxView from '../inbox/InboxView';
import OperationsView from './views/OperationsView';
import { getActiveTeam, setActiveTeamId, syncTeamsFromBackend, Team } from '@/lib/teams';

interface DashboardProps {
  isFirstTime?: boolean;
  onLogout?: () => void;
}

export default function Dashboard({ isFirstTime = false, onLogout }: DashboardProps) {
  const [activeView, setActiveView] = useState('home'); // Start at home
  const [isNewOperationOpen, setIsNewOperationOpen] = useState(false);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);

  useEffect(() => {
    // Sync teams from backend on mount
    const initializeTeams = async () => {
      await syncTeamsFromBackend();

      // Check if there's a new team from onboarding
      const isNewTeam = localStorage.getItem('isNewTeam');
      const newTeamId = localStorage.getItem('newTeamId');

      if (isNewTeam === 'true' && newTeamId) {
        // Clear the flags
        localStorage.removeItem('isNewTeam');
        localStorage.removeItem('newTeamId');

        // Set the team as active
        setActiveTeamId(parseInt(newTeamId));
        await syncTeamsFromBackend();

        const team = getActiveTeam();
        if (team) {
          setCurrentTeam(team);
          // Go to inbox to start the Evo conversation
          setActiveView('inbox');
        }
      } else {
        // Check if there's an active team
        const team = getActiveTeam();
        if (team) {
          setCurrentTeam(team);
        }
      }
    };

    initializeTeams();
  }, []);

  const handleViewChange = (view: string) => {
    setActiveView(view);
  };

  const handleLaunchOperation = (config: OperationConfig) => {
    // TODO: Integrate with OperationFlow
    console.log('Launching operation:', config);
    // For now, just close the modal
    setIsNewOperationOpen(false);
  };

  const handleSelectTeam = async (teamId: number) => {
    setActiveTeamId(teamId);

    // Reload teams from backend to get latest data
    await syncTeamsFromBackend();

    const team = getActiveTeam();
    setCurrentTeam(team);
    setActiveView('hq'); // Go to team's HQ
  };

  const handleGoHome = () => {
    setActiveView('home');
  };

  // Build breadcrumb items
  const getBreadcrumbItems = () => {
    const items = [];

    // Always start with Home
    items.push({
      label: 'Home',
      onClick: activeView === 'home' ? undefined : handleGoHome,
    });

    // If a team is selected, add team name
    if (currentTeam && activeView !== 'home') {
      items.push({
        label: currentTeam.name,
        onClick: activeView === 'hq' ? undefined : () => setActiveView('hq'),
      });

      // Add current view
      if (activeView !== 'hq') {
        const viewLabels: Record<string, string> = {
          inbox: 'Inbox',
          board: 'Board',
          office: 'Office',
          store: 'Store',
          vault: 'Vault',
          workshop: 'Workshop',
          'war-room': 'Execution Theatre',
        };
        items.push({
          label: viewLabels[activeView] || activeView,
        });
      }
    }

    return items;
  };

  return (
    <div className="min-h-screen w-full bg-[#020617] flex flex-col">
      {/* Corporate Status Bar */}
      <CorporateStatusBar teamId={currentTeam?.id.toString()} />

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Navigation */}
        <Sidebar
          activeView={activeView}
          setActiveView={handleViewChange}
          currentTeam={currentTeam}
          onGoHome={handleGoHome}
          onLogout={onLogout}
        />

        {/* Main Workspace */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          {/* Breadcrumb Navigation - Show when not on home */}
          {activeView !== 'home' && activeView !== 'inbox' && (
            <div className="bg-[#020617]/50 border-b border-slate-800 px-6 py-3">
              <Breadcrumb items={getBreadcrumbItems()} />
            </div>
          )}

          {/* Inbox gets full height without padding */}
          {activeView === 'inbox' && currentTeam && (
            <div className="flex-1 overflow-hidden">
              <InboxView teamId={currentTeam.id.toString()} />
            </div>
          )}

          {/* Other views get padding wrapper */}
          {activeView !== 'inbox' && (
            <div className="p-6">
              {activeView === 'home' && <HomeView onSelectTeam={handleSelectTeam} />}

            {activeView === 'hq' && currentTeam && (
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Quick Stats Overview */}
              <div className="grid grid-cols-4 gap-4">
                <div className="glass rounded-xl p-4 border border-slate-700/50">
                  <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Total Agents</div>
                  <div className="text-3xl font-bold text-white mb-1">{currentTeam.stats.totalAgents}</div>
                  <div className="text-xs text-[#10B981]">{currentTeam.stats.activeAgents} active</div>
                </div>

                <div className="glass rounded-xl p-4 border border-slate-700/50">
                  <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">This Week</div>
                  <div className="text-3xl font-bold text-white mb-1">{currentTeam.stats.operationsThisWeek}</div>
                  <div className="text-xs text-slate-400">operations</div>
                </div>

                <div className="glass rounded-xl p-4 border border-slate-700/50">
                  <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">This Month</div>
                  <div className="text-3xl font-bold text-[#FDE047] mb-1">${currentTeam.stats.spendThisMonth.toFixed(0)}</div>
                  <div className="text-xs text-slate-400">total spend</div>
                </div>

                <div className="glass rounded-xl p-4 border border-slate-700/50">
                  <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Avg Cost</div>
                  <div className="text-3xl font-bold text-white mb-1">${currentTeam.stats.avgOperationCost.toFixed(0)}</div>
                  <div className="text-xs text-slate-400">per operation</div>
                </div>
              </div>

              {/* Main Content - Two Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Team Overview */}
                <TeamOverview
                  teamId={currentTeam.id.toString()}
                  onViewOffice={() => handleViewChange('office')}
                  onViewStore={() => handleViewChange('store')}
                />

                {/* Right: Active Operations */}
                <ActiveOperations teamId={currentTeam.id.toString()} />
              </div>

              {/* Quick Actions */}
              <div className="glass rounded-xl p-6 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                <div className="grid grid-cols-4 gap-3">
                  <button
                    onClick={() => handleViewChange('inbox')}
                    className="p-4 bg-[#020617]/50 border border-slate-700/50 rounded-lg hover:border-[#6366F1] hover:bg-[#6366F1]/10 transition-all group"
                  >
                    <svg className="w-6 h-6 text-slate-400 group-hover:text-[#6366F1] mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <div className="text-sm font-medium text-white">Inbox</div>
                  </button>

                  <button
                    onClick={() => handleViewChange('board')}
                    className="p-4 bg-[#020617]/50 border border-slate-700/50 rounded-lg hover:border-[#6366F1] hover:bg-[#6366F1]/10 transition-all group"
                  >
                    <svg className="w-6 h-6 text-slate-400 group-hover:text-[#6366F1] mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                    <div className="text-sm font-medium text-white">Board</div>
                  </button>

                  <button
                    onClick={() => handleViewChange('office')}
                    className="p-4 bg-[#020617]/50 border border-slate-700/50 rounded-lg hover:border-[#6366F1] hover:bg-[#6366F1]/10 transition-all group"
                  >
                    <svg className="w-6 h-6 text-slate-400 group-hover:text-[#6366F1] mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <div className="text-sm font-medium text-white">Office</div>
                  </button>

                  <button
                    onClick={() => handleViewChange('store')}
                    className="p-4 bg-[#020617]/50 border border-slate-700/50 rounded-lg hover:border-[#6366F1] hover:bg-[#6366F1]/10 transition-all group"
                  >
                    <svg className="w-6 h-6 text-slate-400 group-hover:text-[#6366F1] mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <div className="text-sm font-medium text-white">Store</div>
                  </button>
                </div>
              </div>
            </div>
          )}

              {activeView === 'board' && currentTeam && <BoardView teamId={currentTeam.id.toString()} />}
              {activeView === 'office' && currentTeam && <OfficeView teamId={currentTeam.id.toString()} />}
              {activeView === 'store' && currentTeam && <TalentHubView teamId={currentTeam.id.toString()} />}
              {activeView === 'vault' && currentTeam && <NeuralVaultView />}
              {activeView === 'workshop' && currentTeam && <WorkshopView />}
              {activeView === 'war-room' && currentTeam && <OperationsView teamId={currentTeam.id.toString()} />}
            </div>
          )}
        </main>

        {/* Right Sidebar - Contextual - Only show when in a team and not in inbox */}
        {currentTeam && activeView !== 'home' && activeView !== 'inbox' && (
          <aside className="w-80 border-l border-slate-800 bg-[#020617]">
            {/* Manager Chat - Full screen height */}
            <ManagerChat teamId={currentTeam.id.toString()} />
          </aside>
        )}
      </div>

      {/* New Operation Modal */}
      <NewOperationModal
        isOpen={isNewOperationOpen}
        onClose={() => setIsNewOperationOpen(false)}
        onLaunch={handleLaunchOperation}
      />
    </div>
  );
}
