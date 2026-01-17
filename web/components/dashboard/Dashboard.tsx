'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import GlobalTicker from './GlobalTicker';
import ManagerChat from './ManagerChat';
import LivePayroll from './LivePayroll';
import RecentEvolutions from './RecentEvolutions';
import QuickStats from './QuickStats';
import OfficeView from './views/OfficeView';
import TalentHubView from './views/TalentHubView';
import OperationsView from './views/OperationsView';
import OperationsLedger from '../operations/OperationsLedger';
import OperationDetail from '../operations/OperationDetail';

interface DashboardProps {
  isFirstTime?: boolean;
}

export default function Dashboard({ isFirstTime = false }: DashboardProps) {
  const [activeView, setActiveView] = useState('hq');
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);

  const handleViewChange = (view: string) => {
    setActiveView(view);
    // Clear selected operation when changing views
    if (view !== 'ledger') {
      setSelectedOperationId(null);
    }
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
            <div className="max-w-7xl mx-auto">
              {/* Welcome Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">
                  Welcome back to HQ
                </h1>
                <p className="text-slate-400">
                  Your workforce is ready. Here's what's happening today.
                </p>
              </div>

              {/* Quick Stats Grid */}
              <QuickStats />

              {/* Recent Evolutions Feed */}
              <RecentEvolutions />
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
        </main>

        {/* Right Sidebar - Contextual */}
        <aside className="w-80 border-l border-slate-800 bg-[#020617] overflow-y-auto">
          {/* Manager Chat */}
          <ManagerChat />

          {/* Live Payroll */}
          <LivePayroll />
        </aside>
      </div>
    </div>
  );
}
