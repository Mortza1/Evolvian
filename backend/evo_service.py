"""
Evo Service - The AI Manager for Evolvian

Evo is the Chief Operating Officer of the AI workforce.
She analyzes tasks, suggests workflows, and coordinates agents.

This is a lightweight implementation that mirrors EvoAgentX patterns
but uses the existing llm_service for simplicity.
"""

import json
from typing import List, Dict, Any
from datetime import datetime, timezone

from llm_service import llm_service


# ============== Evo Prompts ==============

EVO_SYSTEM_PROMPT = """You are Evo, the AI Chief Operating Officer for Evolvian - a next-generation digital labor platform that replaces traditional human teams with a self-optimizing, hierarchical AI workforce.

Your personality:
- Professional yet approachable
- Proactive and solution-oriented
- Clear and concise in communication
- Always thinking about efficiency and quality
- You speak confidently but ask clarifying questions when needed

Your role:
1. Analyze user tasks and break them into manageable subtasks
2. Suggest which specialist agents would be best for each subtask
3. Identify assumptions and ask clarifying questions when information is missing
4. Design optimal workflows for task completion
5. Coordinate between agents and the user
6. Help users understand the Evolvian platform

When a user gives you a task:
- First understand what they're trying to achieve
- Break complex tasks into clear steps
- Suggest what kind of specialists (agents) would help
- Be upfront about what you're assuming
- Ask questions if critical information is missing

Remember: You're not just an assistant - you're the manager of an AI workforce. Guide users to get the best results from their team."""

TASK_ANALYSIS_PROMPT = """Analyze the following task and provide a structured breakdown.

Task: {task}

Team Context:
- Team Name: {team_name}
- Available Agents: {agents}
- Previous Context: {context}

Provide your analysis in the following JSON format:
{{
    "understanding": "Your clear understanding of what the user wants to accomplish",
    "subtasks": [
        {{"id": "1", "title": "Subtask name", "description": "What needs to be done", "agent_type": "Type of agent needed (e.g., Research Specialist, Content Writer, Data Analyst)"}}
    ],
    "suggested_agents": [
        {{"role": "Agent role title", "specialty": "What they specialize in", "reason": "Why this agent is needed for this task"}}
    ],
    "assumptions": ["List any assumptions you're making about the task"],
    "questions": ["List any clarifying questions you need answered before proceeding"],
    "estimated_complexity": "simple|moderate|complex",
    "confidence": 0.85
}}

Important:
- If the task is vague, add questions to the "questions" array
- Be specific about what type of agents would help
- Always explain your reasoning

Respond ONLY with valid JSON, no additional text or markdown."""

WORKFLOW_DESIGN_PROMPT = """Based on the task analysis, design an optimal workflow.

Task: {task}
Analysis: {analysis}
Available Agents: {agents}

Design a workflow with clear steps that can be executed by AI agents.

Respond in this JSON format:
{{
    "title": "Short workflow title",
    "description": "What this workflow accomplishes",
    "steps": [
        {{
            "id": "1",
            "name": "Step name",
            "description": "What happens in this step",
            "agent_role": "What type of agent handles this",
            "inputs": ["What information/resources are needed"],
            "outputs": ["What this step produces"],
            "depends_on": ["IDs of steps that must complete first"]
        }}
    ],
    "estimated_cost": 15.00,
    "estimated_time_minutes": 30
}}

Guidelines:
- Keep steps atomic and clear
- Identify dependencies between steps
- Be realistic about time and cost estimates
- Steps should flow logically

Respond ONLY with valid JSON, no additional text or markdown."""


# ============== Helper Functions ==============

def clean_json_response(response: str) -> str:
    """Clean LLM response to extract JSON"""
    clean = response.strip()
    print(f"[clean_json] Raw response length: {len(clean)}")

    # DeepSeek R1 often includes <think>...</think> tags with reasoning
    # Remove everything before the JSON
    if "<think>" in clean:
        # Find the end of thinking section
        think_end = clean.find("</think>")
        if think_end != -1:
            clean = clean[think_end + 8:].strip()
            print(f"[clean_json] Removed <think> section, new length: {len(clean)}")

    # Try to find JSON object boundaries
    json_start = clean.find("{")
    json_end = clean.rfind("}") + 1
    if json_start != -1 and json_end > json_start:
        clean = clean[json_start:json_end]
        print(f"[clean_json] Extracted JSON object, length: {len(clean)}")

    # Remove markdown code blocks if still present
    if clean.startswith("```"):
        lines = clean.split("\n")
        # Find the content between ``` markers
        start_idx = 1 if lines[0].startswith("```") else 0
        end_idx = len(lines)
        for i in range(len(lines) - 1, -1, -1):
            if lines[i].strip() == "```":
                end_idx = i
                break
        clean = "\n".join(lines[start_idx:end_idx])
        print(f"[clean_json] Removed markdown, new length: {len(clean)}")

    # Remove "json" language identifier if present
    if clean.startswith("json"):
        clean = clean[4:]

    return clean.strip()


def parse_json_safely(response: str, default: Dict = None) -> tuple[Dict, bool]:
    """Safely parse JSON from LLM response"""
    try:
        clean = clean_json_response(response)
        print(f"[parse_json] Attempting to parse: {clean[:500]}...")
        result = json.loads(clean)
        print(f"[parse_json] Success! Keys: {list(result.keys())}")
        return result, False
    except json.JSONDecodeError as e:
        print(f"[parse_json] FAILED to parse JSON: {e}")
        print(f"[parse_json] Raw content: {response[:500]}...")
        return default or {}, True


# ============== Evo Service ==============

class EvoService:
    """
    The Evo AI Manager service.

    Provides:
    - Intelligent conversation
    - Task analysis
    - Workflow design
    - Agent coordination suggestions
    """

    def __init__(self):
        # Use the existing llm_service
        self._llm = llm_service

        # Simple in-memory conversation cache (team_id -> messages)
        self._conversations: Dict[int, List[Dict]] = {}

    def _get_conversation(self, team_id: int) -> List[Dict]:
        """Get conversation history for a team"""
        if team_id not in self._conversations:
            self._conversations[team_id] = []
        return self._conversations[team_id]

    def _add_to_conversation(self, team_id: int, role: str, content: str):
        """Add a message to conversation history"""
        conv = self._get_conversation(team_id)
        conv.append({"role": role, "content": content})
        # Keep last 20 messages
        if len(conv) > 20:
            self._conversations[team_id] = conv[-20:]

    def chat(
        self,
        message: str,
        team_id: int,
        team_name: str = "Team",
        agents: List[Dict] = None,
        history: List[Dict] = None,
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Have a conversation with Evo.

        Args:
            message: User's message
            team_id: The team ID for context
            team_name: Name of the team
            agents: List of available agents
            history: Previous conversation history
            context: Additional context

        Returns:
            Dict with Evo's response and metadata
        """
        # Build agent context
        agent_info = "No agents hired yet."
        if agents:
            agent_lines = []
            for a in agents[:10]:
                name = a.get('name', 'Agent')
                role = a.get('role', 'Role')
                specialty = a.get('specialty', 'General')
                level = a.get('level', 1)
                agent_lines.append(f"- {name} (Level {level}): {role} - {specialty}")
            agent_info = "\n".join(agent_lines)

        # Build system prompt with context
        system_prompt = f"""{EVO_SYSTEM_PROMPT}

Current Team: {team_name}

Available Team Members:
{agent_info}

Guide the user to accomplish their goals using the available agents, or suggest hiring new specialists if needed."""

        try:
            response = self._llm.simple_chat(
                user_message=message,
                system_prompt=system_prompt
            )

            # Store in conversation
            self._add_to_conversation(team_id, "user", message)
            self._add_to_conversation(team_id, "evo", response)

            return {
                "success": True,
                "response": response,
                "team_id": team_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "response": "I apologize, but I encountered an issue processing your request. Please try again.",
                "team_id": team_id
            }

    def analyze_task(
        self,
        task: str,
        team_id: int,
        team_name: str = "Team",
        agents: List[Dict] = None,
        context: str = ""
    ) -> Dict[str, Any]:
        """
        Analyze a task and break it down into subtasks.

        This is Evo's core capability - understanding what the user wants
        and planning how to accomplish it.

        Args:
            task: The task description from user
            team_id: The team ID
            team_name: Name of the team
            agents: Available agents
            context: Previous context

        Returns:
            Analysis result with subtasks, suggested agents, etc.
        """
        print(f"\n{'='*60}")
        print(f"[EVO] analyze_task called")
        print(f"[EVO] Task: {task}")
        print(f"[EVO] Team: {team_name} (ID: {team_id})")
        print(f"[EVO] Agents: {len(agents) if agents else 0}")

        # Format agent info
        agent_info = "None available"
        if agents:
            agent_info = ", ".join([
                f"{a.get('name', 'Agent')} ({a.get('specialty', 'General')})"
                for a in agents[:10]
            ])
        print(f"[EVO] Agent info: {agent_info}")

        prompt = TASK_ANALYSIS_PROMPT.format(
            task=task,
            team_name=team_name,
            agents=agent_info,
            context=context or "No previous context"
        )
        print(f"[EVO] Prompt length: {len(prompt)}")

        try:
            print("[EVO] Calling LLM for analysis...")
            response = self._llm.simple_chat(
                user_message=prompt,
                system_prompt=EVO_SYSTEM_PROMPT
            )
            print(f"[EVO] LLM response length: {len(response)}")
            print(f"[EVO] LLM response preview: {response[:300]}...")

            # Parse JSON response
            analysis, parse_error = parse_json_safely(response, {
                "understanding": response,
                "subtasks": [],
                "suggested_agents": [],
                "assumptions": [],
                "questions": [],
                "estimated_complexity": "unknown",
                "confidence": 0.5
            })

            if parse_error:
                print(f"[EVO] WARNING: JSON parse failed, using defaults")
            else:
                print(f"[EVO] Analysis parsed successfully:")
                print(f"[EVO]   - Subtasks: {len(analysis.get('subtasks', []))}")
                print(f"[EVO]   - Suggested agents: {len(analysis.get('suggested_agents', []))}")
                print(f"[EVO]   - Assumptions: {len(analysis.get('assumptions', []))}")

            return {
                "success": True,
                "analysis": analysis,
                "raw_response": response,
                "team_id": team_id,
                "parse_error": parse_error
            }

        except Exception as e:
            print(f"[EVO] ERROR in analyze_task: {e}")
            return {
                "success": False,
                "error": str(e),
                "team_id": team_id
            }

    def suggest_workflow(
        self,
        task: str,
        analysis: Dict[str, Any],
        agents: List[Dict] = None
    ) -> Dict[str, Any]:
        """
        Design a workflow based on task analysis.

        Args:
            task: Original task
            analysis: Task analysis from analyze_task
            agents: Available agents

        Returns:
            Workflow suggestion with steps, costs, time estimates
        """
        print(f"\n{'='*60}")
        print(f"[EVO] suggest_workflow called")
        print(f"[EVO] Task: {task}")
        print(f"[EVO] Analysis subtasks: {len(analysis.get('subtasks', []))}")

        # Format agent info
        agent_info = "None available"
        if agents:
            agent_info = ", ".join([
                f"{a.get('name', 'Agent')} ({a.get('specialty', 'General')})"
                for a in agents[:10]
            ])
        print(f"[EVO] Agent info: {agent_info}")

        prompt = WORKFLOW_DESIGN_PROMPT.format(
            task=task,
            analysis=json.dumps(analysis, indent=2),
            agents=agent_info
        )
        print(f"[EVO] Prompt length: {len(prompt)}")

        try:
            print("[EVO] Calling LLM for workflow design...")
            response = self._llm.simple_chat(
                user_message=prompt,
                system_prompt=EVO_SYSTEM_PROMPT
            )
            print(f"[EVO] LLM response length: {len(response)}")
            print(f"[EVO] LLM response preview: {response[:500]}...")

            # Parse JSON response
            workflow, parse_error = parse_json_safely(response, {
                "title": "Custom Workflow",
                "description": response,
                "steps": [],
                "estimated_cost": 0,
                "estimated_time_minutes": 0
            })

            if parse_error:
                print(f"[EVO] WARNING: JSON parse failed for workflow, using defaults")
            else:
                print(f"[EVO] Workflow parsed successfully:")
                print(f"[EVO]   - Title: {workflow.get('title')}")
                print(f"[EVO]   - Steps: {len(workflow.get('steps', []))}")
                print(f"[EVO]   - Est. time: {workflow.get('estimated_time_minutes')} min")
                print(f"[EVO]   - Est. cost: ${workflow.get('estimated_cost')}")

            return {
                "success": True,
                "workflow": workflow,
                "raw_response": response,
                "parse_error": parse_error
            }

        except Exception as e:
            print(f"[EVO] ERROR in suggest_workflow: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def answer_assumption(
        self,
        team_id: int,
        question: str,
        answer: str,
        task_context: str = ""
    ) -> Dict[str, Any]:
        """
        Process a user's answer to an assumption/question.

        This enables the "Assumptions Inbox" feature where Evo
        asks clarifying questions and the user provides answers.

        Args:
            team_id: The team ID
            question: The original question Evo asked
            answer: User's answer
            task_context: Context about the task

        Returns:
            Evo's acknowledgment and any follow-up
        """
        prompt = f"""The user has answered a clarifying question about their task.

Original Question: {question}
User's Answer: {answer}
Task Context: {task_context}

Acknowledge their answer and:
1. Confirm you understand their response
2. If this changes your approach, explain how
3. If you need more clarification, ask a follow-up question
4. If you now have enough information, summarize the updated understanding

Be concise and helpful."""

        try:
            response = self._llm.simple_chat(
                user_message=prompt,
                system_prompt=EVO_SYSTEM_PROMPT
            )

            return {
                "success": True,
                "response": response,
                "team_id": team_id
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def clear_conversation(self, team_id: int):
        """Clear conversation history for a team"""
        if team_id in self._conversations:
            self._conversations[team_id] = []


# Singleton instance
evo_service = EvoService()
