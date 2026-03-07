"""
Enterprise Research-to-Report benchmark: 10 structured research briefs.

Each brief specifies a topic, required sections, specific questions to answer,
and a complexity rating. The system must produce a complete report addressing
all sections and questions.
"""
from dataclasses import dataclass, field
from typing import List


@dataclass
class ResearchBrief:
    id: int
    title: str
    topic: str
    required_sections: List[str]
    specific_questions: List[str]
    complexity: str  # "medium" | "high"

    def as_prompt_text(self) -> str:
        """Format brief as a prompt string for agents."""
        sections = "\n".join(f"  - {s}" for s in self.required_sections)
        questions = "\n".join(f"  {i+1}. {q}" for i, q in enumerate(self.specific_questions))
        return (
            f"RESEARCH BRIEF: {self.title}\n"
            f"{'='*60}\n\n"
            f"TOPIC:\n{self.topic}\n\n"
            f"REQUIRED SECTIONS (all must be present):\n{sections}\n\n"
            f"SPECIFIC QUESTIONS TO ANSWER (all must be addressed):\n{questions}\n\n"
            f"QUALITY REQUIREMENT: The report must be analytical, not descriptive. "
            f"Claims must be supported with reasoning. Recommendations must follow "
            f"from the analysis."
        )

    def section_count(self) -> int:
        return len(self.required_sections)

    def question_count(self) -> int:
        return len(self.specific_questions)


ENTERPRISE_BRIEFS: List[ResearchBrief] = [
    ResearchBrief(
        id=1,
        title="AI Agent Framework Competitive Analysis",
        topic=(
            "Competitive analysis of AI agent frameworks for a mid-size fintech company "
            "evaluating whether to build internal automation using an open-source framework "
            "or a commercial platform."
        ),
        required_sections=[
            "Executive Summary",
            "Market Overview (5+ frameworks covered)",
            "Feature Comparison Matrix",
            "Pricing Analysis",
            "Risk Assessment",
            "Recommendation",
        ],
        specific_questions=[
            "Which frameworks support multi-agent orchestration natively?",
            "What are the total cost of ownership differences between open-source and commercial options?",
            "Which framework is best suited for a regulated financial services environment?",
            "What are the primary integration risks for each shortlisted framework?",
            "What is the recommended framework and why?",
        ],
        complexity="high",
    ),
    ResearchBrief(
        id=2,
        title="EU AI Act Compliance Impact on a UK SaaS Startup",
        topic=(
            "Analysis of the EU AI Act's impact on a UK-based SaaS startup that uses "
            "large language models for customer-facing features, including a risk assessment "
            "and an implementation roadmap."
        ),
        required_sections=[
            "Regulatory Summary",
            "Compliance Requirements for LLM-based Products",
            "Technical Gaps in Current Product Architecture",
            "Implementation Roadmap",
            "Cost Estimate",
            "Risk Matrix",
        ],
        specific_questions=[
            "Does the company's LLM usage fall under high-risk or limited-risk classification?",
            "What specific technical controls are required under Article 13 (transparency)?",
            "What is the estimated compliance cost range for a 20-person startup?",
            "What are the consequences of non-compliance for companies serving EU customers from outside the EU?",
            "Which compliance steps should be prioritised in the first 90 days?",
        ],
        complexity="high",
    ),
    ResearchBrief(
        id=3,
        title="Build vs Buy: Customer Support Chatbot",
        topic=(
            "Build-vs-buy analysis for a customer support chatbot for an e-commerce company "
            "handling 5,000 support tickets per month, with a current team of 8 support agents."
        ),
        required_sections=[
            "Requirements Specification",
            "Build Option (tech stack, team size, timeline, cost)",
            "Buy Option (3+ vendors compared)",
            "Risk Comparison",
            "Total Cost of Ownership over 3 Years",
            "Recommendation",
        ],
        specific_questions=[
            "What are the minimum functional requirements for the chatbot?",
            "What engineering team and timeline would be needed to build a comparable system in-house?",
            "How do Intercom, Zendesk AI, and Freshdesk compare on features and pricing?",
            "What is the 3-year TCO difference between the build and the recommended buy option?",
            "What is the recommended option and what are the top three risks?",
        ],
        complexity="high",
    ),
    ResearchBrief(
        id=4,
        title="EV Charging Market Entry Strategy — Southeast Asia",
        topic=(
            "Market entry strategy for a European EV charging infrastructure company "
            "considering expansion into Southeast Asia, with a focus on Thailand, Vietnam, "
            "and Indonesia."
        ),
        required_sections=[
            "Market Size and Growth by Country",
            "Regulatory Landscape by Country",
            "Competitor Analysis",
            "Infrastructure Assessment",
            "Go-to-Market Strategy",
            "Financial Projections (3-year)",
        ],
        specific_questions=[
            "What is the current EV adoption rate and projected growth in each target country?",
            "Which country has the most favourable regulatory environment for foreign charging operators?",
            "Who are the dominant local competitors in each market?",
            "What charging infrastructure gaps represent the largest opportunities?",
            "What is the recommended market entry sequence and why?",
        ],
        complexity="high",
    ),
    ResearchBrief(
        id=5,
        title="Q1 2026 Technology Trends Report for VC Investment Committee",
        topic=(
            "Quarterly technology trends report for a venture capital firm's investment "
            "committee, covering the five most significant emerging technology trends "
            "with investment implications."
        ),
        required_sections=[
            "Top 5 Emerging Trends with Supporting Evidence",
            "Market Size Estimates per Trend",
            "Notable Early-Stage Startups per Trend",
            "Investment Opportunities and Entry Points",
            "Risk Factors and Contrarian Views",
        ],
        specific_questions=[
            "What evidence suggests each trend is investable rather than speculative?",
            "What is the estimated total addressable market for each trend by 2028?",
            "Which startups in each trend category have raised Series A or later in the past 12 months?",
            "At what stage and valuation range should a VC firm consider entering each trend?",
            "What is the single biggest risk to each trend materialising as expected?",
        ],
        complexity="high",
    ),
    ResearchBrief(
        id=6,
        title="SOC2 Compliance Preparation Report",
        topic=(
            "Security audit preparation report for a 50-person B2B SaaS company "
            "preparing for its first SOC2 Type II audit, with a target completion "
            "date of 6 months from now."
        ),
        required_sections=[
            "Current Security Posture Assessment",
            "Gap Analysis Against SOC2 Trust Service Criteria",
            "Remediation Priority Matrix",
            "Timeline and Resource Requirements",
            "Vendor Tool Recommendations",
        ],
        specific_questions=[
            "Which SOC2 Trust Service Criteria are most commonly failed by SaaS companies of this size?",
            "What are the top 5 highest-priority gaps to remediate before the audit?",
            "What is a realistic timeline to achieve audit readiness from a standing start?",
            "What internal headcount is required to manage the compliance programme?",
            "Which compliance automation tools (Vanta, Drata, Secureframe) best fit a 50-person company?",
        ],
        complexity="medium",
    ),
    ResearchBrief(
        id=7,
        title="Employee Onboarding Process Redesign Proposal",
        topic=(
            "Proposal to redesign the employee onboarding process for a 200-person "
            "technology company based on an internal survey showing 68% of new hires "
            "feel under-supported in their first 90 days."
        ),
        required_sections=[
            "Survey Findings Summary",
            "Root Cause Analysis of Pain Points",
            "Industry Benchmarks and Best Practices",
            "Proposed New Onboarding Process",
            "Implementation Plan",
            "Success Metrics",
        ],
        specific_questions=[
            "What are the three most common complaints from new hires in the survey data?",
            "What do high-performing companies do differently in their first-90-day programmes?",
            "What is the estimated cost per bad hire for a 200-person tech company?",
            "What changes to the onboarding process would have the highest impact with the least disruption?",
            "How should success be measured and over what timeframe?",
        ],
        complexity="medium",
    ),
    ResearchBrief(
        id=8,
        title="Technical Due Diligence: Series B SaaS Acquisition Target",
        topic=(
            "Technical due diligence summary for a private equity firm evaluating the "
            "acquisition of a Series B SaaS company with $8M ARR and a 15-person "
            "engineering team, built on a microservices architecture."
        ),
        required_sections=[
            "Architecture Review",
            "Technical Debt Assessment",
            "Engineering Team Capability Analysis",
            "Integration Complexity with Acquirer's Stack",
            "IP and Licensing Review",
            "Risk and Opportunity Summary",
        ],
        specific_questions=[
            "What are the three most significant architectural risks in the current system?",
            "How much technical debt exists and what is the estimated cost to remediate?",
            "Is the engineering team a retention risk post-acquisition?",
            "How complex would integration with a monolithic acquirer be and what are the key blockers?",
            "Are there any open-source licence obligations that could create IP risk?",
        ],
        complexity="high",
    ),
    ResearchBrief(
        id=9,
        title="B2B Cybersecurity Content Marketing Strategy",
        topic=(
            "Content marketing strategy for a B2B cybersecurity company targeting "
            "CISOs and IT directors at mid-market companies (500–5,000 employees), "
            "with a goal of doubling inbound pipeline in 12 months."
        ),
        required_sections=[
            "Audience Analysis",
            "Content Pillar Recommendations",
            "Channel Strategy",
            "Competitive Content Analysis",
            "90-Day Content Calendar",
            "KPI Framework",
        ],
        specific_questions=[
            "What content formats do CISOs and IT directors engage with most?",
            "What are the three most effective content pillars for a cybersecurity brand?",
            "Which channels (LinkedIn, email, webinars, SEO) deliver the best ROI for B2B cybersecurity?",
            "What content gaps exist in the competitive landscape that represent differentiation opportunities?",
            "What KPIs should be tracked to measure pipeline attribution from content?",
        ],
        complexity="medium",
    ),
    ResearchBrief(
        id=10,
        title="Annual Engineering Department Review and 2026 Planning",
        topic=(
            "Annual performance review and forward planning document for an engineering "
            "department at a 300-person SaaS company, covering 2025 performance against "
            "targets and 2026 objectives and resource requests."
        ),
        required_sections=[
            "2025 Key Metrics vs Targets",
            "Achievement Highlights",
            "Underperformance Analysis with Root Causes",
            "Lessons Learned",
            "2026 Objectives and Key Results",
            "Resource Request and Justification",
        ],
        specific_questions=[
            "Which metrics fell below target and what were the primary root causes?",
            "What were the top three engineering achievements in 2025?",
            "What process changes would have the most impact on delivery velocity in 2026?",
            "How does the proposed headcount increase map to specific planned capabilities?",
            "What is the single most important change needed to improve engineering performance in 2026?",
        ],
        complexity="medium",
    ),
]


def get_brief(brief_id: int) -> ResearchBrief:
    for b in ENTERPRISE_BRIEFS:
        if b.id == brief_id:
            return b
    raise KeyError(f"Brief ID {brief_id} not found")


def get_all_briefs() -> List[ResearchBrief]:
    return ENTERPRISE_BRIEFS
