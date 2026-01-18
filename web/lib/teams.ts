// Teams Data Model - Multi-Workforce Management
import { teamAPI } from './api';

export interface Team {
  id: number; // Changed from string to number to match backend
  name: string;
  description: string | null;
  icon: string; // Emoji or icon identifier
  color: string; // Primary color for the team
  createdAt: Date;
  settings: {
    dailyBudgetCap?: number; // Hard cap in dollars
    requireApprovalThreshold?: number; // Require approval if operation exceeds this cost
    timezone: string;
    workingHours?: {
      start: string; // e.g., "09:00"
      end: string; // e.g., "17:00"
    };
  };
  stats: {
    totalAgents: number;
    activeAgents: number; // Currently "clocked in"
    totalOperations: number;
    operationsThisWeek: number;
    totalSpend: number;
    spendThisMonth: number;
    avgOperationCost: number;
  };
  status: 'active' | 'archived';
}

export interface TeamActivity {
  timestamp: Date;
  value: number; // Could be operations count, spend, etc.
}

// Demo Teams - Note: These are now only used as templates for creating backend teams
export const DEMO_TEAMS: Team[] = [
  {
    id: 0, // Will be assigned by backend
    name: 'Compliance Department',
    description: 'Regulatory compliance, risk assessment, and policy enforcement',
    icon: '⚖️',
    color: '#F59E0B',
    createdAt: new Date('2024-01-15'),
    settings: {
      dailyBudgetCap: 150,
      requireApprovalThreshold: 50,
      timezone: 'America/New_York',
      workingHours: {
        start: '09:00',
        end: '17:00',
      },
    },
    stats: {
      totalAgents: 8,
      activeAgents: 6,
      totalOperations: 142,
      operationsThisWeek: 12,
      totalSpend: 2847.32,
      spendThisMonth: 450.12,
      avgOperationCost: 20.05,
    },
    status: 'active',
  },
  {
    id: 0, // Will be assigned by backend
    name: 'Marketing Team',
    description: 'Content creation, social media management, and campaign execution',
    icon: '📢',
    color: '#EC4899',
    createdAt: new Date('2024-02-01'),
    settings: {
      dailyBudgetCap: 200,
      requireApprovalThreshold: 75,
      timezone: 'America/Los_Angeles',
    },
    stats: {
      totalAgents: 12,
      activeAgents: 9,
      totalOperations: 287,
      operationsThisWeek: 24,
      totalSpend: 5432.11,
      spendThisMonth: 892.45,
      avgOperationCost: 18.93,
    },
    status: 'active',
  },
  {
    id: 0, // Will be assigned by backend
    name: 'Research & Analysis',
    description: 'Market research, data analysis, and competitive intelligence',
    icon: '🔬',
    color: '#8B5CF6',
    createdAt: new Date('2024-01-20'),
    settings: {
      dailyBudgetCap: 100,
      requireApprovalThreshold: 40,
      timezone: 'America/New_York',
    },
    stats: {
      totalAgents: 5,
      activeAgents: 4,
      totalOperations: 98,
      operationsThisWeek: 8,
      totalSpend: 1923.67,
      spendThisMonth: 312.89,
      avgOperationCost: 19.63,
    },
    status: 'active',
  },
  {
    id: 0, // Will be assigned by backend
    name: 'Finance Operations',
    description: 'Accounting, financial analysis, and reporting',
    icon: '💰',
    color: '#10B981',
    createdAt: new Date('2024-02-10'),
    settings: {
      dailyBudgetCap: 80,
      requireApprovalThreshold: 30,
      timezone: 'America/Chicago',
      workingHours: {
        start: '08:00',
        end: '16:00',
      },
    },
    stats: {
      totalAgents: 6,
      activeAgents: 3,
      totalOperations: 64,
      operationsThisWeek: 5,
      totalSpend: 1205.44,
      spendThisMonth: 198.23,
      avgOperationCost: 18.83,
    },
    status: 'active',
  },
];

// Storage functions - Now integrated with backend
const STORAGE_KEY = 'evolvian_teams';
const ACTIVE_TEAM_KEY = 'evolvian_active_team';
const LAST_SYNC_KEY = 'evolvian_teams_last_sync';

/**
 * Sync teams from backend to localStorage cache
 * Returns true if sync was successful
 */
export async function syncTeamsFromBackend(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const backendTeams = await teamAPI.getTeams();

    // Convert backend response to Team format
    const teams: Team[] = backendTeams.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description || '',
      icon: t.icon,
      color: t.color,
      createdAt: new Date(t.created_at),
      settings: {
        dailyBudgetCap: t.settings.dailyBudgetCap,
        requireApprovalThreshold: t.settings.requireApprovalThreshold,
        timezone: t.settings.timezone || 'America/New_York',
        workingHours: t.settings.workingHours,
      },
      stats: {
        totalAgents: t.stats.totalAgents || 0,
        activeAgents: t.stats.activeAgents || 0,
        totalOperations: t.stats.totalOperations || 0,
        operationsThisWeek: t.stats.operationsThisWeek || 0,
        totalSpend: t.stats.totalSpend || 0,
        spendThisMonth: t.stats.spendThisMonth || 0,
        avgOperationCost: t.stats.avgOperationCost || 0,
      },
      status: (t.status as 'active' | 'archived') || 'active',
    }));

    localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    return true;
  } catch (error) {
    console.error('Failed to sync teams from backend:', error);
    return false;
  }
}

/**
 * Get all teams (from cache, with optional background sync)
 */
export function getTeams(): Team[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((t: any) => ({
        ...t,
        createdAt: new Date(t.createdAt),
      }));
    }
  } catch (error) {
    console.error('Failed to load teams:', error);
  }

  return [];
}

/**
 * Create a new team (via backend API)
 */
export async function createTeam(teamData: {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  settings?: Team['settings'];
}): Promise<Team | null> {
  try {
    const created = await teamAPI.createTeam(teamData);

    // Sync to get the latest teams
    await syncTeamsFromBackend();

    return {
      id: created.id,
      name: created.name,
      description: created.description || '',
      icon: created.icon,
      color: created.color,
      createdAt: new Date(created.created_at),
      settings: {
        dailyBudgetCap: created.settings.dailyBudgetCap,
        requireApprovalThreshold: created.settings.requireApprovalThreshold,
        timezone: created.settings.timezone || 'America/New_York',
        workingHours: created.settings.workingHours,
      },
      stats: {
        totalAgents: created.stats.totalAgents || 0,
        activeAgents: created.stats.activeAgents || 0,
        totalOperations: created.stats.totalOperations || 0,
        operationsThisWeek: created.stats.operationsThisWeek || 0,
        totalSpend: created.stats.totalSpend || 0,
        spendThisMonth: created.stats.spendThisMonth || 0,
        avgOperationCost: created.stats.avgOperationCost || 0,
      },
      status: (created.status as 'active' | 'archived') || 'active',
    };
  } catch (error) {
    console.error('Failed to create team:', error);
    return null;
  }
}

/**
 * Update a team (via backend API)
 */
export async function updateTeam(
  teamId: number,
  updates: Partial<Team>
): Promise<Team | null> {
  try {
    const updated = await teamAPI.updateTeam(teamId, {
      name: updates.name,
      description: updates.description || undefined,
      icon: updates.icon,
      color: updates.color,
      settings: updates.settings,
      stats: updates.stats,
      status: updates.status,
    });

    // Sync to get the latest teams
    await syncTeamsFromBackend();

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description || '',
      icon: updated.icon,
      color: updated.color,
      createdAt: new Date(updated.created_at),
      settings: {
        dailyBudgetCap: updated.settings.dailyBudgetCap,
        requireApprovalThreshold: updated.settings.requireApprovalThreshold,
        timezone: updated.settings.timezone || 'America/New_York',
        workingHours: updated.settings.workingHours,
      },
      stats: {
        totalAgents: updated.stats.totalAgents || 0,
        activeAgents: updated.stats.activeAgents || 0,
        totalOperations: updated.stats.totalOperations || 0,
        operationsThisWeek: updated.stats.operationsThisWeek || 0,
        totalSpend: updated.stats.totalSpend || 0,
        spendThisMonth: updated.stats.spendThisMonth || 0,
        avgOperationCost: updated.stats.avgOperationCost || 0,
      },
      status: (updated.status as 'active' | 'archived') || 'active',
    };
  } catch (error) {
    console.error('Failed to update team:', error);
    return null;
  }
}

export function getTeamById(teamId: number): Team | undefined {
  return getTeams().find((t) => t.id === teamId);
}

export function getActiveTeamId(): number | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(ACTIVE_TEAM_KEY);
    if (stored) {
      const id = parseInt(stored, 10);
      return isNaN(id) ? null : id;
    }
    return null;
  } catch (error) {
    console.error('Failed to get active team:', error);
    return null;
  }
}

export function setActiveTeamId(teamId: number | string): void {
  if (typeof window === 'undefined') return;

  try {
    // Convert to number if string
    const id = typeof teamId === 'string' ? parseInt(teamId, 10) : teamId;
    if (isNaN(id)) {
      console.error('Invalid team ID:', teamId);
      return;
    }
    localStorage.setItem(ACTIVE_TEAM_KEY, id.toString());
  } catch (error) {
    console.error('Failed to set active team:', error);
  }
}

export function getActiveTeam(): Team | null {
  const activeId = getActiveTeamId();
  if (!activeId) return null;
  return getTeamById(activeId) || null;
}

// Calculate aggregated metrics across all teams
export function getGlobalMetrics() {
  const teams = getTeams();

  const totalBurnRate = teams.reduce((sum, team) => {
    // Estimate burn rate: monthly spend / 30 days / 24 hours
    const hourlyRate = team.stats.spendThisMonth / 30 / 24;
    return sum + hourlyRate;
  }, 0);

  const totalActiveAgents = teams.reduce((sum, team) => sum + team.stats.activeAgents, 0);
  const totalAgents = teams.reduce((sum, team) => sum + team.stats.totalAgents, 0);
  const totalOperationsRunning = teams.reduce((sum, team) => sum + team.stats.operationsThisWeek, 0);
  const totalSpend = teams.reduce((sum, team) => sum + team.stats.totalSpend, 0);
  const totalSpendThisMonth = teams.reduce((sum, team) => sum + team.stats.spendThisMonth, 0);

  return {
    totalBurnRate,
    totalActiveAgents,
    totalAgents,
    totalOperationsRunning,
    totalSpend,
    totalSpendThisMonth,
    activeTeams: teams.filter(t => t.status === 'active').length,
  };
}

// Generate sparkline activity data for a team
export function getTeamActivity(teamId: string, days: number = 7): TeamActivity[] {
  // For demo, generate synthetic data
  const activities: TeamActivity[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Generate semi-random activity (higher during weekdays)
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const baseValue = isWeekend ? 2 : 5;
    const randomVariation = Math.random() * 3;

    activities.push({
      timestamp: date,
      value: baseValue + randomVariation,
    });
  }

  return activities;
}
