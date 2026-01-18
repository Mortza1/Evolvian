'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Breadcrumb from './Breadcrumb';
import GlobalTicker from './GlobalTicker';
import ManagerChat from './ManagerChat';
import LivePayroll from './LivePayroll';
import ManagerInputBar from './ManagerInputBar';
import ActiveOperations from './ActiveOperations';
import TeamOverview from './TeamOverview';
import CompanyLedger from './CompanyLedger';
import NewOperationModal, { OperationConfig } from './NewOperationModal';
import OfficeView from './views/OfficeView';
import TalentHubView from './views/TalentHubView';
import OperationsView from './views/OperationsView';
import OperationsLedger from '../operations/OperationsLedger';
import OperationDetail from '../operations/OperationDetail';
import NeuralVaultView from '../neural-vault/NeuralVaultView';
import WorkshopView from '../workshop/WorkshopView';
import HomeView from '../home/HomeView';
import { getActiveTeam, setActiveTeamId, syncTeamsFromBackend, Team } from '@/lib/teams';

interface DashboardProps {
  isFirstTime?: boolean;
}

export default function Dashboard({ isFirstTime = false }: DashboardProps) {
  const [activeView, setActiveView] = useState('home'); // Start at home
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const [isNewOperationOpen, setIsNewOperationOpen] = useState(false);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);

  useEffect(() => {
    // Sync teams from backend on mount
    const initializeTeams = async () => {
      await syncTeamsFromBackend();

      // Check if there's an active team
      const team = getActiveTeam();
      if (team) {
        setCurrentTeam(team);
      }
    };

    initializeTeams();
  }, []);

  const handleViewChange = (view: string) => {
    setActiveView(view);
    // Clear selected operation when changing views
    if (view !== 'ledger') {
      setSelectedOperationId(null);
    }
  };

  const handleLaunchOperation = (config: OperationConfig) => {
    // TODO: Integrate with OperationFlow
    console.log('Launching operation:', config);
    // For now, just close the modal
    setIsNewOperationOpen(false);
  };

  const handleSelectTeam = (teamId: number) => {
    setActiveTeamId(teamId);
    const team = getActiveTeam();
    setCurrentTeam(team);
    setActiveView('hq'); // Go to team's HQ
  };

  const handleGoHome = () => {
    setActiveView('home');
    setSelectedOperationId(null);
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
          office: 'Office',
          store: 'Store',
          operations: 'Operations',
          ledger: 'Ledger',
          vault: 'Vault',
          workshop: 'Workshop',
        };
        items.push({
          label: viewLabels[activeView] || activeView,
        });
      }

      // If viewing operation detail, add that
      if (selectedOperationId) {
        items.push({
          label: `Operation #${selectedOperationId.slice(-6)}`,
        });
      }
    }

    return items;
  };

  return (
    <div className="min-h-screen w-full bg-[#020617] flex flex-col">
      {/* Global Ticker */}
      <GlobalTicker teamId={currentTeam?.id.toString()} />

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Navigation */}
        <Sidebar
          activeView={activeView}
          setActiveView={handleViewChange}
          currentTeam={currentTeam}
          onGoHome={handleGoHome}
        />

        {/* Main Workspace */}
        <main className="flex-1 overflow-y-auto">
          {/* Breadcrumb Navigation - Show when not on home */}
          {activeView !== 'home' && (
            <div className="bg-[#020617]/50 border-b border-slate-800 px-6 py-3">
              <Breadcrumb items={getBreadcrumbItems()} />
            </div>
          )}

          <div className="p-6">
            {activeView === 'home' && <HomeView onSelectTeam={handleSelectTeam} />}

            {activeView === 'hq' && currentTeam && (
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Manager Input Bar - Top */}
              <ManagerInputBar onNewOperation={() => setIsNewOperationOpen(true)} />

              {/* Center Section - Two Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Center-Left: Active Operations (Mission Control) */}
                <ActiveOperations teamId={currentTeam.id.toString()} />

                {/* Center-Right: Team Overview (The Office) */}
                <TeamOverview teamId={currentTeam.id.toString()} onViewOffice={() => handleViewChange('office')} onViewStore={() => handleViewChange('store')} />
              </div>

              {/* Bottom: Company Ledger (Recent History) */}
              <CompanyLedger
                teamId={currentTeam.id.toString()}
                onViewAll={() => handleViewChange('ledger')}
                onViewOperation={(id) => {
                  setSelectedOperationId(id);
                  handleViewChange('ledger');
                }}
              />
            </div>
          )}

            {activeView === 'office' && currentTeam && <OfficeView teamId={currentTeam.id.toString()} />}
            {activeView === 'store' && currentTeam && <TalentHubView teamId={currentTeam.id.toString()} />}
            {activeView === 'operations' && currentTeam && <OperationsView />}
            {activeView === 'ledger' && currentTeam && (
              selectedOperationId ? (
                <OperationDetail
                  operationId={selectedOperationId}
                  onBack={() => setSelectedOperationId(null)}
                />
              ) : (
                <OperationsLedger
                  onViewOperation={(id) => setSelectedOperationId(id)}
                />
              )
            )}
            {activeView === 'vault' && currentTeam && <NeuralVaultView />}
            {activeView === 'workshop' && currentTeam && <WorkshopView />}
          </div>
        </main>

        {/* Right Sidebar - Contextual - Only show when in a team */}
        {currentTeam && activeView !== 'home' && (
          <aside className="w-80 border-l border-slate-800 bg-[#020617] overflow-y-auto">
            {/* Manager Chat */}
            <ManagerChat teamId={currentTeam.id.toString()} />

            {/* Live Payroll */}
            <LivePayroll teamId={currentTeam.id.toString()} />
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
