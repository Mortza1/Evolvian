'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Breadcrumb from './Breadcrumb';
import CorporateStatusBar from './CorporateStatusBar';
import ManagerChat from './ManagerChat';
import NewOperationModal, { OperationConfig } from './NewOperationModal';
import HQView from './views/HQView';
import OfficeView from './views/OfficeView';
import TalentHubView from './views/TalentHubView';
import BoardView from './views/BoardView';
import NeuralVaultView from '../neural-vault/NeuralVaultView';
import WorkshopView from '../workshop/WorkshopView';
import HomeView from '../home/HomeView';
import InboxView from '../inbox/InboxView';
import OperationsView from './views/OperationsView';
import BillingView from './views/BillingView';
import { getActiveTeam, setActiveTeamId, syncTeamsFromBackend, Team } from '@/lib/teams';
import { TeamEventsProvider } from '@/lib/contexts/TeamEventsContext';
import { ToastProvider } from '@/lib/contexts/ToastContext';

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
          billing: 'Billing',
        };
        items.push({
          label: viewLabels[activeView] || activeView,
        });
      }
    }

    return items;
  };

  const mainContent = (
    <>
      {/* Corporate Status Bar */}
      <CorporateStatusBar
        teamId={currentTeam?.id.toString()}
        onNavigateToBilling={() => setActiveView('billing')}
      />

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Navigation */}
        <Sidebar
          activeView={activeView}
          setActiveView={handleViewChange}
          currentTeam={currentTeam}
          onGoHome={handleGoHome}
          onSelectTeam={handleSelectTeam}
          onLogout={onLogout}
        />

        {/* Main Workspace */}
        <main className="flex-1 overflow-y-auto flex flex-col bg-[#0B0E14]">
          {/* Breadcrumb Navigation - Show when not on home, inbox, billing, or vault */}
          {activeView !== 'home' && activeView !== 'inbox' && activeView !== 'billing' && activeView !== 'vault' && (
            <div className="bg-[#0B0E14]/50 border-b border-[#161B22] px-6 py-3">
              <Breadcrumb items={getBreadcrumbItems()} />
            </div>
          )}

          {/* Home gets full height without padding */}
          {activeView === 'home' && (
            <div className="flex-1 overflow-hidden">
              <HomeView onSelectTeam={handleSelectTeam} />
            </div>
          )}

          {/* Inbox gets full height without padding */}
          {activeView === 'inbox' && currentTeam && (
            <div className="flex-1 overflow-hidden">
              <InboxView teamId={currentTeam.id.toString()} />
            </div>
          )}

          {/* Billing gets full height without padding */}
          {activeView === 'billing' && currentTeam && (
            <div className="flex-1 overflow-hidden">
              <BillingView
                totalSpend={currentTeam.stats.spendThisMonth * 12} // Mock total spend
                thisMonthSpend={currentTeam.stats.spendThisMonth}
              />
            </div>
          )}

          {/* Vault gets full height without padding */}
          {activeView === 'vault' && currentTeam && (
            <div className="flex-1 overflow-hidden">
              <NeuralVaultView teamId={currentTeam.id.toString()} />
            </div>
          )}

          {/* HQ gets full height without padding */}
          {activeView === 'hq' && currentTeam && (
            <div className="flex-1 overflow-hidden">
              <HQView
                team={currentTeam}
                onViewOffice={() => handleViewChange('office')}
                onViewStore={() => handleViewChange('store')}
              />
            </div>
          )}

          {/* Other views get padding wrapper */}
          {activeView !== 'home' && activeView !== 'hq' && activeView !== 'inbox' && activeView !== 'billing' && activeView !== 'vault' && (
            <div className="p-6">
              {/* home/hq rendered above at full height */}

              {activeView === 'board' && currentTeam && <BoardView teamId={currentTeam.id.toString()} onNavigateToVault={() => setActiveView('vault')} />}
              {activeView === 'office' && currentTeam && <OfficeView teamId={currentTeam.id.toString()} />}
              {activeView === 'store' && currentTeam && <TalentHubView teamId={currentTeam.id.toString()} />}
              {activeView === 'workshop' && currentTeam && <WorkshopView />}
              {activeView === 'war-room' && currentTeam && <OperationsView teamId={currentTeam.id.toString()} onNavigateToVault={() => setActiveView('vault')} />}
            </div>
          )}
        </main>

        {/* Right Sidebar - Contextual - Only show when in a team and not in inbox, billing, or vault */}
        {currentTeam && activeView !== 'home' && activeView !== 'inbox' && activeView !== 'billing' && activeView !== 'vault' && (
          <aside className="flex flex-col w-80 h-full border-l border-[#161B22] bg-[#0B0E14] overflow-hidden">
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
    </>
  );

  return (
    <ToastProvider>
      <div className="h-screen w-full bg-[#0B0E14] flex flex-col overflow-hidden">
        {currentTeam ? (
          <TeamEventsProvider teamId={currentTeam.id}>
            {mainContent}
          </TeamEventsProvider>
        ) : (
          mainContent
        )}
      </div>
    </ToastProvider>
  );
}
