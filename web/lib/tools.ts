// Tools & Integrations Data Model

export type ToolCategory =
  | 'research'
  | 'communication'
  | 'analysis'
  | 'legal'
  | 'data'
  | 'automation';

export type ToolPricingModel =
  | 'free'
  | 'per_use'
  | 'subscription'
  | 'enterprise';

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: string;
  developer: string;
  developerType: 'official' | 'certified' | 'community';
  version: string;
  pricingModel: ToolPricingModel;
  pricing: {
    amount: number;
    unit: string; // e.g., "per query", "per month", "per document"
  };
  capabilities: string[];
  requiresConfig: boolean;
  configFields?: {
    name: string;
    label: string;
    type: 'text' | 'password' | 'oauth' | 'select';
    required: boolean;
    placeholder?: string;
    options?: string[];
  }[];
  status?: 'available' | 'beta' | 'coming_soon';
}

export interface InstalledTool {
  toolId: string;
  tool: Tool;
  installedAt: Date;
  configuration: Record<string, any>;
  status: 'connected' | 'disconnected' | 'error';
  assignedAgents: string[]; // Agent IDs
  usagePolicy: {
    dailyBudget?: number;
    requireApproval?: boolean;
    allowedOperations?: string[];
    permissions: 'read' | 'write' | 'full';
  };
  usage: {
    totalCalls: number;
    totalCost: number;
    lastUsed?: Date;
  };
}

// Demo Tools Data
export const DEMO_TOOLS: Tool[] = [
  {
    id: 'tool-websearch',
    name: 'Web Search',
    description: 'Real-time web search powered by multiple search engines. Perfect for research and fact-checking.',
    category: 'research',
    icon: '🔍',
    developer: 'Evolvian',
    developerType: 'official',
    version: '2.1.0',
    pricingModel: 'per_use',
    pricing: {
      amount: 0.02,
      unit: 'per query',
    },
    capabilities: ['Search web', 'Extract snippets', 'Follow links', 'Fact verification'],
    requiresConfig: false,
    status: 'available',
  },
  {
    id: 'tool-email',
    name: 'Email Connector',
    description: 'Connect to Gmail, Outlook, or IMAP. Read, draft, and send emails on behalf of your team.',
    category: 'communication',
    icon: '📧',
    developer: 'Evolvian',
    developerType: 'official',
    version: '1.5.2',
    pricingModel: 'free',
    pricing: {
      amount: 0,
      unit: 'included',
    },
    capabilities: ['Read emails', 'Draft emails', 'Send emails', 'Search inbox', 'Attachments'],
    requiresConfig: true,
    configFields: [
      {
        name: 'provider',
        label: 'Email Provider',
        type: 'select',
        required: true,
        options: ['Gmail', 'Outlook', 'IMAP'],
      },
      {
        name: 'email',
        label: 'Email Address',
        type: 'text',
        required: true,
        placeholder: 'your@email.com',
      },
      {
        name: 'oauth_token',
        label: 'Authorization',
        type: 'oauth',
        required: true,
      },
    ],
    status: 'available',
  },
  {
    id: 'tool-python',
    name: 'Python Interpreter',
    description: 'Execute Python code in a secure sandbox. Perfect for data analysis, calculations, and automation.',
    category: 'analysis',
    icon: '🐍',
    developer: 'Evolvian',
    developerType: 'official',
    version: '3.11.0',
    pricingModel: 'per_use',
    pricing: {
      amount: 0.05,
      unit: 'per execution',
    },
    capabilities: ['Execute Python', 'Data analysis', 'Create visualizations', 'File processing'],
    requiresConfig: false,
    status: 'available',
  },
  {
    id: 'tool-excel',
    name: 'Excel Processor',
    description: 'Read, write, and analyze Excel files. Create reports, pivot tables, and complex formulas.',
    category: 'analysis',
    icon: '📊',
    developer: 'Evolvian',
    developerType: 'official',
    version: '2.0.1',
    pricingModel: 'free',
    pricing: {
      amount: 0,
      unit: 'included',
    },
    capabilities: ['Read Excel files', 'Write Excel files', 'Create charts', 'Pivot tables', 'Formulas'],
    requiresConfig: false,
    status: 'available',
  },
  {
    id: 'tool-sec-edgar',
    name: 'SEC EDGAR Database',
    description: 'Access all SEC filings, 10-Ks, 10-Qs, and more. Real-time updates on public company filings.',
    category: 'legal',
    icon: '⚖️',
    developer: 'Evolvian',
    developerType: 'official',
    version: '1.2.0',
    pricingModel: 'subscription',
    pricing: {
      amount: 49,
      unit: 'per month',
    },
    capabilities: ['Search filings', 'Download 10-Ks', 'Download 10-Qs', 'Real-time alerts', 'Historical data'],
    requiresConfig: false,
    status: 'available',
  },
  {
    id: 'tool-gdpr-db',
    name: 'Global Legal Database',
    description: 'Access to GDPR, CCPA, and international compliance regulations. Updated daily with new rulings.',
    category: 'legal',
    icon: '🌍',
    developer: 'LegalTech Partners',
    developerType: 'certified',
    version: '4.5.0',
    pricingModel: 'subscription',
    pricing: {
      amount: 199,
      unit: 'per month',
    },
    capabilities: ['Search regulations', 'Case law', 'Compliance updates', 'Jurisdiction mapping', 'Risk assessment'],
    requiresConfig: true,
    configFields: [
      {
        name: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'Enter your LegalTech API key',
      },
    ],
    status: 'available',
  },
  {
    id: 'tool-slack',
    name: 'Slack Integration',
    description: 'Send notifications, read messages, and interact with your Slack workspace.',
    category: 'communication',
    icon: '💬',
    developer: 'Evolvian',
    developerType: 'official',
    version: '1.0.3',
    pricingModel: 'free',
    pricing: {
      amount: 0,
      unit: 'included',
    },
    capabilities: ['Send messages', 'Read channels', 'File uploads', 'Thread responses', 'Mentions'],
    requiresConfig: true,
    configFields: [
      {
        name: 'workspace_url',
        label: 'Workspace URL',
        type: 'text',
        required: true,
        placeholder: 'your-workspace.slack.com',
      },
      {
        name: 'oauth_token',
        label: 'Authorization',
        type: 'oauth',
        required: true,
      },
    ],
    status: 'available',
  },
  {
    id: 'tool-sql',
    name: 'SQL Database Connector',
    description: 'Connect to PostgreSQL, MySQL, or SQL Server. Query and analyze your database directly.',
    category: 'data',
    icon: '🗄️',
    developer: 'Evolvian',
    developerType: 'official',
    version: '2.3.1',
    pricingModel: 'free',
    pricing: {
      amount: 0,
      unit: 'included',
    },
    capabilities: ['Execute queries', 'Read tables', 'Write data', 'Schema analysis', 'Performance monitoring'],
    requiresConfig: true,
    configFields: [
      {
        name: 'db_type',
        label: 'Database Type',
        type: 'select',
        required: true,
        options: ['PostgreSQL', 'MySQL', 'SQL Server'],
      },
      {
        name: 'host',
        label: 'Host',
        type: 'text',
        required: true,
        placeholder: 'localhost',
      },
      {
        name: 'port',
        label: 'Port',
        type: 'text',
        required: true,
        placeholder: '5432',
      },
      {
        name: 'database',
        label: 'Database Name',
        type: 'text',
        required: true,
      },
      {
        name: 'username',
        label: 'Username',
        type: 'text',
        required: true,
      },
      {
        name: 'password',
        label: 'Password',
        type: 'password',
        required: true,
      },
    ],
    status: 'available',
  },
  {
    id: 'tool-translator',
    name: 'Language Translator',
    description: 'Translate text between 100+ languages. Preserves formatting and context.',
    category: 'communication',
    icon: '🌐',
    developer: 'Evolvian',
    developerType: 'official',
    version: '1.8.0',
    pricingModel: 'per_use',
    pricing: {
      amount: 0.01,
      unit: 'per 1000 chars',
    },
    capabilities: ['Translate text', 'Auto-detect language', 'Preserve formatting', 'Context awareness'],
    requiresConfig: false,
    status: 'available',
  },
  {
    id: 'tool-ocr',
    name: 'OCR Document Scanner',
    description: 'Extract text from images and PDFs with 99% accuracy. Supports handwriting recognition.',
    category: 'data',
    icon: '📷',
    developer: 'Evolvian',
    developerType: 'official',
    version: '3.0.0',
    pricingModel: 'per_use',
    pricing: {
      amount: 0.10,
      unit: 'per page',
    },
    capabilities: ['Extract text', 'Handwriting recognition', 'Table extraction', 'Layout preservation', 'Multi-language'],
    requiresConfig: false,
    status: 'available',
  },
  {
    id: 'tool-api-maker',
    name: 'Custom API Builder',
    description: 'Create custom API integrations for any service. No coding required.',
    category: 'automation',
    icon: '🔌',
    developer: 'Evolvian',
    developerType: 'official',
    version: '1.1.0',
    pricingModel: 'subscription',
    pricing: {
      amount: 29,
      unit: 'per month',
    },
    capabilities: ['REST API calls', 'GraphQL', 'Webhooks', 'Authentication', 'Rate limiting'],
    requiresConfig: true,
    configFields: [
      {
        name: 'api_endpoint',
        label: 'API Endpoint',
        type: 'text',
        required: true,
        placeholder: 'https://api.example.com',
      },
      {
        name: 'auth_type',
        label: 'Authentication Type',
        type: 'select',
        required: true,
        options: ['None', 'API Key', 'Bearer Token', 'OAuth'],
      },
      {
        name: 'api_key',
        label: 'API Key',
        type: 'password',
        required: false,
      },
    ],
    status: 'beta',
  },
  {
    id: 'tool-realtime-data',
    name: 'Real-Time Market Data',
    description: 'Live stock prices, crypto, forex, and commodities. Professional-grade financial data.',
    category: 'data',
    icon: '📈',
    developer: 'FinData Corp',
    developerType: 'certified',
    version: '5.2.0',
    pricingModel: 'subscription',
    pricing: {
      amount: 299,
      unit: 'per month',
    },
    capabilities: ['Live stock prices', 'Historical data', 'Technical indicators', 'News feed', 'Alerts'],
    requiresConfig: true,
    configFields: [
      {
        name: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'Enter your FinData API key',
      },
    ],
    status: 'available',
  },
];

// Storage functions
const STORAGE_KEY = 'evolvian_installed_tools';

export function getInstalledTools(): InstalledTool[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((t: any) => ({
        ...t,
        installedAt: new Date(t.installedAt),
        usage: {
          ...t.usage,
          lastUsed: t.usage.lastUsed ? new Date(t.usage.lastUsed) : undefined,
        },
      }));
    }
  } catch (error) {
    console.error('Failed to load installed tools:', error);
  }

  return [];
}

export function saveInstalledTool(installedTool: InstalledTool): void {
  if (typeof window === 'undefined') return;

  try {
    const tools = getInstalledTools();
    const existingIndex = tools.findIndex((t) => t.toolId === installedTool.toolId);

    if (existingIndex >= 0) {
      tools[existingIndex] = installedTool;
    } else {
      tools.push(installedTool);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(tools));
  } catch (error) {
    console.error('Failed to save installed tool:', error);
  }
}

export function uninstallTool(toolId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const tools = getInstalledTools();
    const filtered = tools.filter((t) => t.toolId !== toolId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to uninstall tool:', error);
  }
}

export function getToolById(toolId: string): Tool | undefined {
  return DEMO_TOOLS.find((t) => t.id === toolId);
}

export function getCategoryColor(category: ToolCategory): string {
  const colors: Record<ToolCategory, string> = {
    research: '#06B6D4',      // Teal
    communication: '#6366F1',  // Indigo
    analysis: '#8B5CF6',       // Purple
    legal: '#F59E0B',          // Amber
    data: '#10B981',           // Green
    automation: '#EC4899',     // Pink
  };
  return colors[category];
}
