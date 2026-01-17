'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
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

interface DashboardProps {
  isFirstTime?: boolean;
}

export default function Dashboard({ isFirstTime = false }: DashboardProps) {
  const [activeView, setActiveView] = useState('hq');
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const [isNewOperationOpen, setIsNewOperationOpen] = useState(false);

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

  return (
    <div className="min-h-screen w-full bg-[#020617] flex flex-col">
      {/* Global Ticker */}
      <GlobalTicker />

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Navigation */}
        <Sidebar activeView={activeView} setActiveView={handleViewChange} />

        {/* Main Workspace */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeView === 'hq' && (
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Manager Input Bar - Top */}
              <ManagerInputBar onNewOperation={() => setIsNewOperationOpen(true)} />

              {/* Center Section - Two Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Center-Left: Active Operations (Mission Control) */}
                <ActiveOperations />

                {/* Center-Right: Team Overview (The Office) */}
                <TeamOverview />
              </div>

              {/* Bottom: Company Ledger (Recent History) */}
              <CompanyLedger
                onViewAll={() => handleViewChange('ledger')}
                onViewOperation={(id) => {
                  setSelectedOperationId(id);
                  handleViewChange('ledger');
                }}
              />
            </div>
          )}

          {activeView === 'office' && <OfficeView />}
          {activeView === 'store' && <TalentHubView />}
          {activeView === 'operations' && <OperationsView />}
          {activeView === 'ledger' && (
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
          {activeView === 'vault' && <NeuralVaultView />}
        </main>

        {/* Right Sidebar - Contextual */}
        <aside className="w-80 border-l border-slate-800 bg-[#020617] overflow-y-auto">
          {/* Manager Chat */}
          <ManagerChat />

          {/* Live Payroll */}
          <LivePayroll />
        </aside>
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
