"""
Evolvian Workflow Builder

This is Evo's brain - the logic that decomposes tasks into workflows.
Uses the LLM to analyze tasks and create executable workflow graphs.
"""

import json
from typing import List, Dict, Any, Optional

from .base import WorkflowGraph, WorkflowNode


# Workflow building prompts
DECOMPOSE_TASK_PROMPT = """You are Evo, the AI Chief Operating Officer. Decompose this task into executable steps.

Task: {task}

Available Agent Roles:
{agent_roles}

Team Context:
{context}

Create a workflow by breaking this task into clear, atomic steps.
Each step should:
1. Have a clear purpose
2. Be assignable to a specific agent role
3. Define what inputs it needs
4. Define what outputs it produces
5. Specify dependencies on other steps

Respond with a JSON object in this exact format:
{{
    "title": "Brief workflow title",
    "description": "What this workflow accomplishes",
    "steps": [
        {{
            "id": "1",
            "name": "Step name",
            "description": "Detailed description of what to do",
            "agent_role": "Role name from available roles",
            "inputs": ["input1", "input2"],
            "outputs": ["output1"],
            "depends_on": []
        }},
        {{
            "id": "2",
            "name": "Next step",
            "description": "What this step does",
            "agent_role": "Another role",
            "inputs": ["output1"],
            "outputs": ["final_output"],
            "depends_on": ["1"]
        }}
    ],
    "estimated_time_minutes": 15,
    "estimated_cost": 5.00
}}

Rules:
- Steps should flow logically with clear dependencies
- Use available agent roles when possible
- Keep steps atomic and focused
- The first step(s) should have empty depends_on arrays
- Later steps should depend on earlier ones where needed

Respond ONLY with valid JSON, no additional text."""


ROLE_ASSIGNMENT_PROMPT = """Given these workflow steps and available agents, assign the best agent to each step.

Workflow Steps:
{steps}

Available Agents:
{agents}

For each step, select the most suitable agent based on their specialty and skills.
If no perfect match exists, pick the closest match.

Respond with a JSON object mapping step IDs to agent names:
{{
    "1": "Agent Name",
    "2": "Another Agent",
    ...
}}

Respond ONLY with valid JSON, no additional text."""


def _clean_json_response(response: str) -> str:
    """Clean LLM response to extract JSON"""
    clean = response.strip()

    # Remove markdown code blocks
    if clean.startswith("```"):
        lines = clean.split("\n")
        start_idx = 1 if lines[0].startswith("```") else 0
        end_idx = len(lines)
        for i in range(len(lines) - 1, -1, -1):
            if lines[i].strip() == "```":
                end_idx = i
                break
        clean = "\n".join(lines[start_idx:end_idx])

    if clean.startswith("json"):
        clean = clean[4:]

    return clean.strip()


def _parse_json_safely(response: str, default: Dict = None) -> Dict:
    """Safely parse JSON from LLM response"""
    try:
        clean = _clean_json_response(response)
        return json.loads(clean)
    except json.JSONDecodeError:
        return default or {}


class WorkflowBuilder:
    """
    Builds executable workflows from task descriptions.

    This is the core of Evo's intelligence - analyzing tasks,
    decomposing them into steps, and creating executable graphs.
    """

    def __init__(self, llm_service=None, agent_registry=None):
        """
        Initialize the workflow builder.

        Args:
            llm_service: The LLM service for task decomposition
            agent_registry: Registry of available agents
        """
        self._llm = llm_service
        self._registry = agent_registry

    def build(
        self,
        task: str,
        context: Dict[str, Any] = None,
        available_agents: List[Dict] = None,
    ) -> WorkflowGraph:
        """
        Build a workflow graph from a task description.

        This is the main entry point - takes a natural language task
        and produces an executable WorkflowGraph.

        Args:
            task: Natural language task description
            context: Additional context (team info, preferences, etc.)
            available_agents: List of available agents

        Returns:
            WorkflowGraph ready for execution
        """
        # Get available roles from registry or agents
        agent_roles = self._get_available_roles(available_agents)

        # Decompose task into workflow via LLM
        workflow_dict = self._decompose_task(task, agent_roles, context)

        # Create the graph
        graph = WorkflowGraph.from_workflow_dict(workflow_dict)

        # Assign agents to nodes if possible
        if available_agents or self._registry:
            self._assign_agents(graph, available_agents)

        return graph

    def build_from_analysis(
        self,
        task: str,
        analysis: Dict[str, Any],
        available_agents: List[Dict] = None,
    ) -> WorkflowGraph:
        """
        Build a workflow from an existing Evo task analysis.

        Use this when you already have analysis from evo_service.analyze_task().

        Args:
            task: Original task description
            analysis: Analysis from evo_service
            available_agents: Available agents

        Returns:
            WorkflowGraph ready for execution
        """
        # Convert analysis subtasks to workflow steps
        steps = []
        for i, subtask in enumerate(analysis.get("subtasks", [])):
            step = {
                "id": subtask.get("id", str(i + 1)),
                "name": subtask.get("title", f"Step {i + 1}"),
                "description": subtask.get("description", ""),
                "agent_role": subtask.get("agent_type", "General"),
                "inputs": [],
                "outputs": [f"output_{i + 1}"],
                "depends_on": [str(i)] if i > 0 else [],  # Simple linear dependency
            }
            steps.append(step)

        workflow_dict = {
            "title": f"Workflow for: {task[:50]}...",
            "description": analysis.get("understanding", task),
            "steps": steps,
        }

        graph = WorkflowGraph.from_workflow_dict(workflow_dict)

        if available_agents or self._registry:
            self._assign_agents(graph, available_agents)

        return graph

    def build_simple(
        self,
        task: str,
        agents: List[Any],
    ) -> WorkflowGraph:
        """
        Build a simple linear workflow with given agents.

        This is the simplest form - just runs agents in sequence.
        Useful for quick tasks or when you already know the agents.

        Args:
            task: Task description
            agents: List of EvolvianAgent instances in execution order

        Returns:
            WorkflowGraph with linear execution
        """
        graph = WorkflowGraph(goal=task)

        for i, agent in enumerate(agents):
            node = WorkflowNode(
                id=str(i + 1),
                name=f"{agent.name}'s Task",
                description=task if i == 0 else f"Continue work on: {task}",
                agent_role=agent.metadata.role if hasattr(agent, 'metadata') else "Agent",
                inputs=[f"output_{i}"] if i > 0 else [],
                outputs=[f"output_{i + 1}"],
                depends_on=[str(i)] if i > 0 else [],
            )
            node.assigned_agent = agent.name
            graph.add_node(node)

        return graph

    def _get_available_roles(self, agents: List[Dict] = None) -> str:
        """Get formatted list of available agent roles"""
        roles = []

        # From provided agents list
        if agents:
            for agent in agents:
                name = agent.get("name", "Agent")
                role = agent.get("role", "General")
                specialty = agent.get("specialty", "")
                roles.append(f"- {role}: {specialty} (e.g., {name})")

        # From registry
        if self._registry:
            for template_id, template in self._registry._templates.items():
                role_str = f"- {template.role}: {template.specialty}"
                if role_str not in roles:
                    roles.append(role_str)

        if not roles:
            # Default roles if nothing available
            roles = [
                "- Research Specialist: Information gathering and analysis",
                "- Content Writer: Writing and editing content",
                "- Data Analyst: Data processing and insights",
                "- Creative Designer: Visual design and branding",
                "- Project Manager: Coordination and planning",
            ]

        return "\n".join(roles)

    def _decompose_task(
        self,
        task: str,
        agent_roles: str,
        context: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """Use LLM to decompose task into workflow steps"""
        if not self._llm:
            # Fallback: single-step workflow
            return {
                "title": "Execute Task",
                "description": task,
                "steps": [{
                    "id": "1",
                    "name": "Execute Task",
                    "description": task,
                    "agent_role": "General",
                    "inputs": [],
                    "outputs": ["result"],
                    "depends_on": [],
                }],
            }

        context_str = json.dumps(context or {}, indent=2)

        prompt = DECOMPOSE_TASK_PROMPT.format(
            task=task,
            agent_roles=agent_roles,
            context=context_str,
        )

        try:
            response = self._llm.simple_chat(user_message=prompt)
            workflow = _parse_json_safely(response, {})

            # Validate we got steps
            if not workflow.get("steps"):
                # Fallback to single step
                workflow = {
                    "title": "Execute Task",
                    "description": task,
                    "steps": [{
                        "id": "1",
                        "name": "Execute Task",
                        "description": task,
                        "agent_role": "General",
                        "inputs": [],
                        "outputs": ["result"],
                        "depends_on": [],
                    }],
                }

            return workflow

        except Exception as e:
            # Fallback on error
            return {
                "title": "Execute Task",
                "description": task,
                "steps": [{
                    "id": "1",
                    "name": "Execute Task",
                    "description": task,
                    "agent_role": "General",
                    "inputs": [],
                    "outputs": ["result"],
                    "depends_on": [],
                }],
                "error": str(e),
            }

    def _assign_agents(
        self,
        graph: WorkflowGraph,
        available_agents: List[Dict] = None,
    ):
        """Assign specific agents to workflow nodes"""
        for node in graph.nodes:
            agent = self._find_best_agent(node.agent_role, available_agents)
            if agent:
                node.assigned_agent = agent.get("name") if isinstance(agent, dict) else agent.name

    def _find_best_agent(
        self,
        role: str,
        available_agents: List[Dict] = None,
    ) -> Optional[Any]:
        """Find the best agent for a given role"""
        role_lower = role.lower()

        # Search in provided agents
        if available_agents:
            for agent in available_agents:
                agent_role = agent.get("role", "").lower()
                agent_specialty = agent.get("specialty", "").lower()
                if role_lower in agent_role or role_lower in agent_specialty:
                    return agent

            # Return first available if no match
            if available_agents:
                return available_agents[0]

        # Search in registry
        if self._registry:
            for template_id, template in self._registry._templates.items():
                if role_lower in template.role.lower() or role_lower in template.specialty.lower():
                    return {"name": template.name, "role": template.role}

        return None


# Factory function for easy creation
def create_workflow_builder(llm_service=None, agent_registry=None) -> WorkflowBuilder:
    """
    Create a workflow builder with optional dependencies.

    If not provided, will attempt to import from standard locations.
    """
    # Try to import defaults if not provided
    if llm_service is None:
        try:
            from llm_service import llm_service as default_llm
            llm_service = default_llm
        except ImportError:
            pass

    if agent_registry is None:
        try:
            from core.agents import AGENT_REGISTRY
            agent_registry = AGENT_REGISTRY
        except ImportError:
            pass

    return WorkflowBuilder(llm_service=llm_service, agent_registry=agent_registry)
