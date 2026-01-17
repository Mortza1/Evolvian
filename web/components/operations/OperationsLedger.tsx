'use client';

import { useState, useMemo } from 'react';
import { getAllOperations, type StoredOperation } from '@/lib/operations-storage';

interface OperationsLedgerProps {
  onViewOperation: (operationId: string) => void;
}

export default function OperationsLedger({ onViewOperation }: OperationsLedgerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'failed' | 'in_progress'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'cost' | 'time'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const operations = useMemo(() => getAllOperations(), []);

  const filteredAndSortedOperations = useMemo(() => {
    let filtered = operations;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(op =>
        op.config.title.toLowerCase().includes(query) ||
        op.team.some(agent => agent.name.toLowerCase().includes(query)) ||
        op.id.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(op => op.status === statusFilter);
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'date') {
        comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      } else if (sortBy === 'cost') {
        comparison = a.cost - b.cost;
      } else if (sortBy === 'time') {
        comparison = a.timeTaken - b.timeTaken;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [operations, searchQuery, statusFilter, sortBy, sortOrder]);

  const totalCost = useMemo(() =>
    operations.filter(op => op.status === 'completed').reduce((sum, op) => sum + op.cost, 0),
    [operations]
  );

  const totalOperations = operations.length;
  const completedOperations = operations.filter(op => op.status === 'completed').length;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getStatusColor = (status: StoredOperation['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400';
      case 'failed':
        return 'bg-red-500/20 text-red-400';
      case 'in_progress':
        return 'bg-yellow-500/20 text-yellow-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#020617] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#020617] via-[#1E293B] to-[#020617] border-b border-slate-800 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-2">Operations Ledger</h1>
          <p className="text-slate-400">Complete history of all operations run by your team</p>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="glass rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Total Operations</div>
              <div className="text-2xl font-bold text-white">{totalOperations}</div>
            </div>
            <div className="glass rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Completed</div>
              <div className="text-2xl font-bold text-green-400">{completedOperations}</div>
            </div>
            <div className="glass rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Total Cost</div>
              <div className="text-2xl font-bold text-[#FDE047]">${totalCost.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-[#020617] border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search operations, teams, or IDs..."
              className="w-full px-4 py-2 bg-[#1E293B] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 bg-[#1E293B] border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="failed">Failed</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 bg-[#1E293B] border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
          >
            <option value="date">Sort by Date</option>
            <option value="cost">Sort by Cost</option>
            <option value="time">Sort by Time</option>
          </select>

          {/* Sort Order */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-4 py-2 bg-[#1E293B] border border-slate-700 rounded-lg text-white hover:bg-[#2D3B52] transition-colors"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Operations Table */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          {filteredAndSortedOperations.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center">
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Operations Found</h3>
              <p className="text-slate-400">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Start your first operation to see it here'}
              </p>
            </div>
          ) : (
            <div className="glass rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Operation</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Team</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Status</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Cost</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Time</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Date</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedOperations.map((operation) => (
                    <tr
                      key={operation.id}
                      className="border-b border-slate-800/50 hover:bg-[#1E293B]/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{operation.config.title}</div>
                        <div className="text-xs text-slate-500 font-mono">{operation.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex -space-x-2">
                          {operation.team.slice(0, 3).map((agent, idx) => (
                            <img
                              key={idx}
                              src={agent.photo_url}
                              alt={agent.name}
                              className="w-8 h-8 rounded-full border-2 border-[#020617] object-cover"
                              title={agent.name}
                            />
                          ))}
                          {operation.team.length > 3 && (
                            <div className="w-8 h-8 rounded-full border-2 border-[#020617] bg-slate-700 flex items-center justify-center text-xs text-white">
                              +{operation.team.length - 3}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusColor(operation.status)}`}>
                          {operation.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[#FDE047] font-semibold">${operation.cost.toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-300">{operation.timeTaken} min</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-400 text-sm">{formatDate(operation.timestamp)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => onViewOperation(operation.id)}
                          className="px-4 py-2 bg-[#6366F1] text-white text-sm font-medium rounded-lg hover:bg-[#5558E3] transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
