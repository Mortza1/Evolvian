/**
 * API utility functions for making authenticated requests to the backend
 */

const API_URL = 'http://localhost:8000';

/**
 * Get the authentication token from localStorage
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

/**
 * Make an authenticated API request
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  // Handle responses with no content (like DELETE requests)
  const contentLength = response.headers.get('Content-Length');
  if (response.status === 204 || contentLength === '0') {
    return undefined as unknown as T;
  }

  // Check if response has content
  const contentType = response.headers.get('Content-Type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  return response.json();
}

/**
 * Chat API functions
 */
export const chatAPI = {
  /**
   * Send a message to the AI Manager for a specific team
   */
  async sendManagerMessage(
    teamId: string | number,
    message: string,
    context?: any
  ): Promise<{
    success: boolean;
    response: string;
    team_id: number;
    team_name: string;
  }> {
    // Convert teamId to integer, handling various edge cases
    const teamIdInt = typeof teamId === 'string' ? parseInt(teamId, 10) : teamId;

    if (!teamIdInt || isNaN(teamIdInt)) {
      throw new Error('Invalid team ID');
    }

    return apiRequest('/api/chat/manager', {
      method: 'POST',
      body: JSON.stringify({
        message,
        team_id: teamIdInt,
        context,
      }),
    });
  },

  /**
   * Send a simple chat message
   */
  async sendSimpleMessage(
    message: string,
    systemPrompt?: string
  ): Promise<{
    success: boolean;
    response: string;
  }> {
    return apiRequest('/api/chat/simple', {
      method: 'POST',
      body: JSON.stringify({
        message,
        system_prompt: systemPrompt,
      }),
    });
  },

  /**
   * Send a full chat completion request
   */
  async sendChatCompletion(
    messages: Array<{ role: string; content: string }>,
    options?: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
    }
  ): Promise<{
    success: boolean;
    response: string;
    model: string;
    usage?: any;
  }> {
    return apiRequest('/api/chat/completion', {
      method: 'POST',
      body: JSON.stringify({
        messages,
        ...options,
      }),
    });
  },

  /**
   * Get chat history for a team
   */
  async getChatHistory(teamId: string | number, limit?: number): Promise<{
    success: boolean;
    team_id: number;
    messages: Array<{
      id: number;
      role: string;
      content: string;
      created_at: string;
      context?: any;
    }>;
  }> {
    const teamIdInt = typeof teamId === 'string' ? parseInt(teamId, 10) : teamId;

    if (!teamIdInt || isNaN(teamIdInt)) {
      throw new Error('Invalid team ID');
    }

    const url = `/api/chat/history/${teamIdInt}${limit ? `?limit=${limit}` : ''}`;
    return apiRequest(url);
  },
};

/**
 * Team API functions
 */
export const teamAPI = {
  /**
   * Get all teams for the current user
   */
  async getTeams(): Promise<Array<{
    id: number;
    name: string;
    description: string | null;
    icon: string;
    color: string;
    created_at: string;
    settings: Record<string, any>;
    stats: Record<string, any>;
    status: string;
  }>> {
    return apiRequest('/api/teams');
  },

  /**
   * Get a specific team by ID
   */
  async getTeam(teamId: number): Promise<{
    id: number;
    name: string;
    description: string | null;
    icon: string;
    color: string;
    created_at: string;
    settings: Record<string, any>;
    stats: Record<string, any>;
    status: string;
  }> {
    return apiRequest(`/api/teams/${teamId}`);
  },

  /**
   * Create a new team
   */
  async createTeam(data: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    settings?: {
      dailyBudgetCap?: number;
      requireApprovalThreshold?: number;
      timezone?: string;
      workingHours?: { start: string; end: string };
    };
  }): Promise<{
    id: number;
    name: string;
    description: string | null;
    icon: string;
    color: string;
    created_at: string;
    settings: Record<string, any>;
    stats: Record<string, any>;
    status: string;
  }> {
    return apiRequest('/api/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a team
   */
  async updateTeam(
    teamId: number,
    data: {
      name?: string;
      description?: string;
      icon?: string;
      color?: string;
      settings?: Record<string, any>;
      stats?: Record<string, any>;
      status?: string;
    }
  ): Promise<{
    id: number;
    name: string;
    description: string | null;
    icon: string;
    color: string;
    created_at: string;
    settings: Record<string, any>;
    stats: Record<string, any>;
    status: string;
  }> {
    return apiRequest(`/api/teams/${teamId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a team
   */
  async deleteTeam(teamId: number): Promise<void> {
    return apiRequest(`/api/teams/${teamId}`, {
      method: 'DELETE',
    });
  },
};
