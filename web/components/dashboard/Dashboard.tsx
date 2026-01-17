'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import GlobalTicker from './GlobalTicker';
import ManagerChat from './ManagerChat';
import LivePayroll from './LivePayroll';
import RecentEvolutions from './RecentEvolutions';
import QuickStats from './QuickStats';

export default function Dashboard() {
  const [activeView, setActiveView] = useState('hq');

  return (
    <div className="min-h-screen w-full bg-[#020617] flex flex-col">
      {/* Global Ticker */}
      <GlobalTicker />

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Navigation */}
        <Sidebar activeView={activeView} setActiveView={setActiveView} />

        {/* Main Workspace */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Welcome Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">
                Welcome back to HQ
              </h1>
              <p className="text-slate-400">
                Your AI workforce is ready. Here's what's happening today.
              </p>
            </div>

            {/* Quick Stats Grid */}
            <QuickStats />

            {/* Recent Evolutions Feed */}
            <RecentEvolutions />
          </div>
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
