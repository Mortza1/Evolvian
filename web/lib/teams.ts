// Teams Data Model - Multi-Workforce Management

export interface Team {
  id: string;
  name: string;
  description: string;
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

// Demo Teams
export const DEMO_TEAMS: Team[] = [
  {
    id: 'team-compliance',
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
    id: 'team-marketing',
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
    id: 'team-research',
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
    id: 'team-finance',
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

// Storage functions
const STORAGE_KEY = 'evolvian_teams';
const ACTIVE_TEAM_KEY = 'evolvian_active_team';

export function getTeams(): Team[] {
  if (typeof window === 'undefined') return DEMO_TEAMS;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((t: any) => ({
        ...t,
        createdAt: new Date(t.createdAt),
      }));
    } else {
      // First time - initialize with demo teams
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_TEAMS));
      return DEMO_TEAMS;
    }
  } catch (error) {
    console.error('Failed to load teams:', error);
  }

  return DEMO_TEAMS;
}

export function saveTeam(team: Team): void {
  if (typeof window === 'undefined') return;

  try {
    const teams = getTeams();
    const existingIndex = teams.findIndex((t) => t.id === team.id);

    if (existingIndex >= 0) {
      teams[existingIndex] = team;
    } else {
      teams.push(team);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
  } catch (error) {
    console.error('Failed to save team:', error);
  }
}

export function getTeamById(teamId: string): Team | undefined {
  return getTeams().find((t) => t.id === teamId);
}

export function getActiveTeamId(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    return localStorage.getItem(ACTIVE_TEAM_KEY);
  } catch (error) {
    console.error('Failed to get active team:', error);
    return null;
  }
}

export function setActiveTeamId(teamId: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(ACTIVE_TEAM_KEY, teamId);
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
