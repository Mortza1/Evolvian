export interface Agent {
  id: string;
  name: string;
  role: string;
  category: string;
  specialization: string;
  description: string;
  model: string;
  price_per_hour: number;
  level: number;
  rating: number;
  total_reviews: number;
  creator: string;
  creator_type: 'official' | 'community';
  tools: string[];
  photo_url: string;
  tags: string[];
}

export interface LearnedPreference {
  id: string;
  category: string; // e.g., "Tone", "Color Preference", "Target Audience"
  rule: string; // e.g., "Prefers 'Elite Authority' with conversational edge"
  learnedAt: Date;
  confidence: number; // 0-100, how confident the agent is about this preference
  appliedCount: number; // How many times this preference has been applied
}

export interface HiredAgent extends Agent {
  teamId: string;
  hiredAt: Date;
  tasksCompleted: number;
  accuracy: number;
  isOnline: boolean;
  agentLevel: number; // Override base level - agent's current level in this team (1-10)
  experience: number; // XP points towards next level (0-100)
  learnedPreferences: LearnedPreference[]; // What this agent has learned about the user
}

// Parse CSV data
export function parseAgentsCSV(csvText: string): Agent[] {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');

  return lines.slice(1).map(line => {
    // Handle quoted fields and commas within quotes
    const values: string[] = [];
    let currentValue = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue); // Push the last value

    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });

    return {
      id: obj.id?.trim() || '',
      name: obj.name?.trim() || '',
      role: obj.role?.trim() || '',
      category: obj.category?.trim() || '',
      specialization: obj.specialization?.trim() || '',
      description: obj.description?.trim() || '',
      model: obj.model?.trim() || '',
      price_per_hour: parseFloat(obj.price_per_hour) || 0,
      level: parseInt(obj.level) || 1,
      rating: parseFloat(obj.rating) || 0,
      total_reviews: parseInt(obj.total_reviews) || 0,
      creator: obj.creator?.trim() || '',
      creator_type: (obj.creator_type?.trim() as 'official' | 'community') || 'community',
      tools: obj.tools ? obj.tools.split(',').map((t: string) => t.trim()) : [],
      photo_url: obj.photo_url?.trim() || '',
      tags: obj.tags ? obj.tags.split(',').map((t: string) => t.trim()) : [],
    };
  });
}

export const AGENT_CSV_DATA = `id,name,role,category,specialization,description,model,price_per_hour,level,rating,total_reviews,creator,creator_type,tools,photo_url,tags
agent-001,Sarah Mitchell,Compliance Auditor,Compliance,GDPR & Data Privacy,Expert in European data protection regulations and cross-border compliance. Specializes in Article 44-50 interpretations.,gpt-4,1.20,12,4.9,247,Evolvian,official,"document_reader,web_search,risk_analyzer",https://i.pravatar.cc/150?img=1,"gdpr,compliance,legal,data-privacy"
agent-002,Marcus Chen,Document Scanner,Compliance,Contract Analysis,Rapidly analyzes legal documents and extracts key clauses with 99% accuracy. Trained on 10M+ contracts.,claude-3-opus,0.85,8,4.7,189,Evolvian,official,"document_reader,ocr,data_extractor",https://i.pravatar.cc/150?img=12,"contracts,legal,document-processing"
agent-003,Elena Rodriguez,Compliance Reporter,Compliance,Executive Reporting,Transforms complex compliance findings into clear executive summaries and presentations.,gpt-4-turbo,0.90,7,4.8,156,Evolvian,official,"document_writer,chart_generator",https://i.pravatar.cc/150?img=5,"reporting,executive-summary,presentations"
agent-004,James Park,SDR Lead Finder,Sales,B2B Prospecting,Identifies high-quality B2B leads using LinkedIn and company databases. 87% conversion rate to qualified leads.,gpt-4,1.00,9,4.6,324,@salesguru,community,"web_search,linkedin_scraper,crm_integration",https://i.pravatar.cc/150?img=13,"sales,b2b,lead-generation,prospecting"
agent-005,Priya Sharma,Lead Qualifier,Sales,Enterprise Sales,Specializes in qualifying enterprise leads ($100K+ deals). Uses BANT and MEDDIC frameworks.,gpt-4,1.30,11,4.9,412,@salesguru,community,"crm_integration,calendar,email",https://i.pravatar.cc/150?img=9,"sales,qualification,enterprise,bant"
agent-006,Alex Thompson,Outreach Specialist,Sales,Cold Email Campaigns,Crafts personalized cold emails with 45% open rates and 12% response rates. A/B testing expert.,claude-3-sonnet,0.90,8,4.5,278,@emailking,community,"email,ab_testing,analytics",https://i.pravatar.cc/150?img=14,"sales,email,outreach,copywriting"
agent-007,Sophia Williams,Content Strategist,Marketing,SEO & Blog Writing,Creates SEO-optimized long-form content that ranks in top 10. Expert in keyword research and SERP analysis.,gpt-4,1.00,10,4.8,567,@contentpro,community,"web_search,seo_tools,wordpress",https://i.pravatar.cc/150?img=10,"content,seo,blogging,marketing"
agent-008,David Kim,Social Media Manager,Marketing,Multi-Platform Management,Manages Instagram, Twitter, LinkedIn, TikTok. Specializes in B2B thought leadership and engagement.,gpt-4-turbo,0.80,8,4.4,203,Evolvian,official,"social_media_api,image_generator,scheduler",https://i.pravatar.cc/150?img=15,"social-media,b2b,engagement,content"
agent-009,Rachel Green,Campaign Analyst,Marketing,Performance Marketing,Analyzes campaign performance across Google Ads, Meta, LinkedIn. ROI optimization specialist.,claude-3-opus,0.70,9,4.7,189,@adspro,community,"analytics,google_ads_api,meta_api,dashboard",https://i.pravatar.cc/150?img=16,"analytics,ads,roi,performance"
agent-010,Michael Chen,Senior Code Reviewer,Engineering,Architecture & Best Practices,Reviews code for scalability and security. Expert in React, Node.js, Python. 15+ years experience patterns.,gpt-4,3.50,14,4.9,834,@devmaster,community,"github,code_analyzer,security_scanner",https://i.pravatar.cc/150?img=17,"code-review,architecture,security,senior"
agent-011,Lisa Anderson,QA Test Engineer,Engineering,Automated Testing,Creates comprehensive test suites. Specializes in Cypress, Jest, Playwright. 95% bug detection rate.,claude-3-sonnet,1.50,10,4.6,267,Evolvian,official,"test_runner,browser_automation,bug_tracker",https://i.pravatar.cc/150?img=18,"testing,qa,automation,cypress"
agent-012,Thomas Wright,Market Researcher,Operations,Competitive Intelligence,Conducts deep market research and competitive analysis. Expert in TAM/SAM/SOM calculations.,gpt-4,1.40,11,4.7,298,@bizanalyst,community,"web_search,data_scraper,spreadsheet",https://i.pravatar.cc/150?img=19,"research,competitive-analysis,market-intelligence"
agent-013,Nina Patel,Customer Support Agent,Support,Technical Troubleshooting,Handles technical support tickets with 92% first-response resolution. Expert in SaaS troubleshooting.,gpt-4-turbo,0.60,7,4.5,445,Evolvian,official,"knowledge_base,ticket_system,chat",https://i.pravatar.cc/150?img=20,"support,customer-service,troubleshooting"
agent-014,Carlos Rodriguez,Financial Analyst,Finance,Financial Modeling,Builds financial models and projections. Expert in DCF, LBO, and scenario analysis.,claude-3-opus,2.50,13,4.8,156,@financegeek,community,"spreadsheet,financial_apis,calculator",https://i.pravatar.cc/150?img=21,"finance,modeling,projections,analysis"
agent-015,Emma Taylor,HR Recruiter,HR,Technical Recruitment,Sources and screens technical candidates. Specializes in engineering roles. 78% offer acceptance rate.,gpt-4,1.10,9,4.6,234,@talentfinder,community,"linkedin_scraper,ats_integration,calendar",https://i.pravatar.cc/150?img=22,"hr,recruitment,technical-hiring"
agent-016,Kevin Liu,Data Scientist,Data,ML Model Training,Trains and deploys ML models. Expert in scikit-learn, TensorFlow, PyTorch. Handles tabular and text data.,gpt-4,2.80,13,4.9,389,@mlexpert,community,"python,jupyter,data_warehouse,ml_frameworks",https://i.pravatar.cc/150?img=23,"data-science,ml,ai,python"
agent-017,Amanda Brooks,Legal Contract Reviewer,Legal,M&A Transactions,Reviews M&A contracts and term sheets. Expert in deal structures and negotiations.,gpt-4,2.20,12,4.8,178,@legaltech,community,"document_reader,clause_library",https://i.pravatar.cc/150?img=24,"legal,ma,contracts,deals"
agent-018,Ryan Johnson,DevOps Engineer,Engineering,CI/CD & Infrastructure,Sets up and maintains CI/CD pipelines. Expert in AWS, GCP, Docker, Kubernetes.,claude-3-opus,2.00,11,4.7,312,Evolvian,official,"aws_api,docker,kubernetes,terraform",https://i.pravatar.cc/150?img=25,"devops,cicd,infrastructure,cloud"
agent-019,Olivia Martinez,Brand Copywriter,Marketing,Brand Voice & Messaging,Creates compelling brand copy and messaging frameworks. Expert in storytelling and positioning.,gpt-4-turbo,1.20,10,4.8,423,@wordsmith,community,"document_writer,grammar_checker",https://i.pravatar.cc/150?img=26,"copywriting,branding,messaging,storytelling"
agent-020,Daniel Foster,Product Manager,Product,Feature Prioritization,Helps prioritize features using RICE framework. Expert in roadmapping and stakeholder management.,gpt-4,1.60,11,4.6,267,@prodguru,community,"document_writer,analytics,roadmap_tool",https://i.pravatar.cc/150?img=27,"product-management,roadmap,prioritization"
agent-021,Jessica Turner,UX Researcher,Design,User Research & Testing,Conducts user interviews and usability tests. Expert in qualitative and quantitative research methods.,claude-3-sonnet,1.40,10,4.7,198,@uxmaster,community,"survey_tool,video_call,transcription",https://i.pravatar.cc/150?img=28,"ux,research,user-testing,interviews"
agent-022,Mark Stevens,Sales Forecaster,Sales,Pipeline Analytics,Analyzes sales pipelines and creates accurate forecasts. Expert in Salesforce and revenue operations.,gpt-4,1.50,10,4.5,234,@revops,community,"crm_integration,spreadsheet,analytics",https://i.pravatar.cc/150?img=29,"sales,forecasting,pipeline,analytics"
agent-023,Laura Davis,Email Marketer,Marketing,Email Campaign Management,Designs and executes email campaigns. Expert in Mailchimp, HubSpot. Average 28% open rate.,gpt-4-turbo,0.95,8,4.6,389,Evolvian,official,"email_platform,ab_testing,analytics",https://i.pravatar.cc/150?img=30,"email-marketing,campaigns,automation"
agent-024,Christopher Lee,Security Auditor,Security,Penetration Testing,Conducts security audits and penetration tests. Expert in OWASP Top 10 and compliance frameworks.,claude-3-opus,2.90,14,4.9,267,@securitypro,community,"vulnerability_scanner,network_tools,reporting",https://i.pravatar.cc/150?img=31,"security,pentesting,compliance,owasp"
agent-025,Samantha White,Partnership Manager,Partnerships,Strategic Alliances,Identifies and negotiates strategic partnerships. Expert in B2B partnership frameworks and agreements.,gpt-4,1.70,11,4.7,145,@partnershipguru,community,"crm_integration,document_writer,calendar",https://i.pravatar.cc/150?img=32,"partnerships,business-development,negotiations"
agent-026,Andrew Garcia,Technical Writer,Documentation,API Documentation,Creates clear technical documentation and API references. Expert in developer experience.,gpt-4,1.30,9,4.8,312,@docmaster,community,"markdown,code_examples,api_explorer",https://i.pravatar.cc/150?img=33,"documentation,technical-writing,api,developer"
agent-027,Michelle Brown,Conversion Optimizer,Marketing,CRO & A/B Testing,Optimizes landing pages and funnels. Expert in CRO frameworks and hypothesis testing.,claude-3-sonnet,1.10,9,4.5,278,@conversionpro,community,"analytics,ab_testing,heatmaps",https://i.pravatar.cc/150?img=34,"cro,conversion,optimization,ab-testing"
agent-028,Robert Taylor,Business Analyst,Operations,Process Optimization,Analyzes and optimizes business processes. Expert in Lean Six Sigma and process mapping.,gpt-4,1.80,12,4.6,189,@processexpert,community,"flowchart,analytics,documentation",https://i.pravatar.cc/150?img=35,"business-analysis,process,optimization,six-sigma"
agent-029,Victoria Adams,Grant Writer,Fundraising,Grant Applications,Writes compelling grant applications for nonprofits and research institutions. 73% success rate.,gpt-4,1.40,10,4.9,98,@grantwriter,community,"document_writer,research,budget_calculator",https://i.pravatar.cc/150?img=36,"grants,fundraising,nonprofit,writing"
agent-030,Jonathan Harris,Video Script Writer,Content,Video Production,Writes engaging video scripts for YouTube, TikTok, and corporate videos. Expert in storytelling.,gpt-4-turbo,1.00,8,4.7,356,@videocontent,community,"document_writer,research",https://i.pravatar.cc/150?img=37,"video,scripting,youtube,content-creation"
agent-031,Aurora,Color Oracle,Branding,Color Psychology & Palettes,Specialist in color psychology and brand palette strategy. Expert at creating emotionally resonant color schemes.,gpt-4,1.80,10,4.9,412,Evolvian,official,"color_analyzer,psychology,brand_strategy",https://i.pravatar.cc/150?img=38,"branding,color,psychology,design"
agent-032,Atlas,Brand Strategist,Branding,Market Positioning,Expert in brand positioning and competitive strategy. Specializes in high-end market differentiation.,gpt-4,2.00,11,4.9,534,Evolvian,official,"market_research,competitor_analysis,strategy",https://i.pravatar.cc/150?img=39,"branding,strategy,positioning,market-research"
agent-033,Lexis,Naming Expert,Branding,Linguistic Strategy,Specialist in brand nomenclature and linguistic positioning. Creates memorable and strategic brand names.,gpt-4,1.70,9,4.8,289,Evolvian,official,"linguistics,trademark_search,naming",https://i.pravatar.cc/150?img=40,"branding,naming,linguistics,strategy"
agent-034,Sage,Content Architect,Branding,Messaging Framework,Expert in brand messaging and content architecture. Creates comprehensive brand voice guidelines.,gpt-4-turbo,1.90,10,4.8,367,Evolvian,official,"content_strategy,messaging,copywriting",https://i.pravatar.cc/150?img=41,"branding,content,messaging,copywriting"`;

export function getAgents(): Agent[] {
  return parseAgentsCSV(AGENT_CSV_DATA);
}

// Hired Agents Storage
const HIRED_AGENTS_KEY = 'evolvian_hired_agents';

export function getHiredAgents(teamId?: string): HiredAgent[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(HIRED_AGENTS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const agents = parsed.map((a: any) => ({
        ...a,
        hiredAt: new Date(a.hiredAt),
        learnedPreferences: (a.learnedPreferences || []).map((pref: any) => ({
          ...pref,
          learnedAt: new Date(pref.learnedAt),
        })),
      }));

      // Filter by team if provided
      if (teamId) {
        return agents.filter((a: HiredAgent) => a.teamId === teamId);
      }

      return agents;
    }
  } catch (error) {
    console.error('Failed to load hired agents:', error);
  }

  return [];
}

export function hireAgent(agent: Agent, teamId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const hired = getHiredAgents();

    const hiredAgent: HiredAgent = {
      ...agent,
      teamId,
      hiredAt: new Date(),
      tasksCompleted: 0,
      accuracy: 85,
      isOnline: Math.random() > 0.3, // 70% chance of being online
      agentLevel: 1, // Start at level 1 for this team
      experience: 0, // 0 XP at start
      learnedPreferences: [], // No learned preferences yet
    };

    hired.push(hiredAgent);
    localStorage.setItem(HIRED_AGENTS_KEY, JSON.stringify(hired));
  } catch (error) {
    console.error('Failed to hire agent:', error);
  }
}

export function fireAgent(agentId: string, teamId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const hired = getHiredAgents();
    const filtered = hired.filter((a) => !(a.id === agentId && a.teamId === teamId));
    localStorage.setItem(HIRED_AGENTS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to fire agent:', error);
  }
}

export function isAgentHired(agentId: string, teamId: string): boolean {
  const hired = getHiredAgents(teamId);
  return hired.some((a) => a.id === agentId);
}

// Evolution Functions

export function addLearnedPreference(
  agentId: string,
  teamId: string,
  category: string,
  rule: string,
  confidence: number = 90
): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const allAgents = getHiredAgents();
    const agentIndex = allAgents.findIndex((a) => a.id === agentId && a.teamId === teamId);

    if (agentIndex === -1) return false;

    const newPreference: LearnedPreference = {
      id: `pref-${Date.now()}`,
      category,
      rule,
      learnedAt: new Date(),
      confidence,
      appliedCount: 0,
    };

    allAgents[agentIndex].learnedPreferences.push(newPreference);
    localStorage.setItem(HIRED_AGENTS_KEY, JSON.stringify(allAgents));

    return true;
  } catch (error) {
    console.error('Failed to add learned preference:', error);
    return false;
  }
}

export function levelUpAgent(agentId: string, teamId: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const allAgents = getHiredAgents();
    const agentIndex = allAgents.findIndex((a) => a.id === agentId && a.teamId === teamId);

    if (agentIndex === -1) return false;

    const agent = allAgents[agentIndex];

    // Level up (max level 10)
    if (agent.agentLevel < 10) {
      allAgents[agentIndex].agentLevel += 1;
      allAgents[agentIndex].experience = 0; // Reset XP
      allAgents[agentIndex].accuracy = Math.min(99, agent.accuracy + 2); // Increase accuracy

      localStorage.setItem(HIRED_AGENTS_KEY, JSON.stringify(allAgents));
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to level up agent:', error);
    return false;
  }
}

export function addExperience(agentId: string, teamId: string, xp: number): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const allAgents = getHiredAgents();
    const agentIndex = allAgents.findIndex((a) => a.id === agentId && a.teamId === teamId);

    if (agentIndex === -1) return false;

    allAgents[agentIndex].experience = Math.min(100, allAgents[agentIndex].experience + xp);
    localStorage.setItem(HIRED_AGENTS_KEY, JSON.stringify(allAgents));

    return true;
  } catch (error) {
    console.error('Failed to add experience:', error);
    return false;
  }
}

export function updateHiredAgent(agentId: string, teamId: string, updates: Partial<HiredAgent>): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const allAgents = getHiredAgents();
    const agentIndex = allAgents.findIndex((a) => a.id === agentId && a.teamId === teamId);

    if (agentIndex === -1) return false;

    allAgents[agentIndex] = { ...allAgents[agentIndex], ...updates };
    localStorage.setItem(HIRED_AGENTS_KEY, JSON.stringify(allAgents));

    return true;
  } catch (error) {
    console.error('Failed to update hired agent:', error);
    return false;
  }
}
