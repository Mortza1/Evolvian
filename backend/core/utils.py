"""
Shared utilities for the Evolvian core.
"""


def infer_task_type(title: str, description: str) -> str:
    """
    Infer the task type from title and description.
    Used for grouping similar workflows for evolution comparison.
    """
    text = (title + " " + description).lower()

    if any(w in text for w in ["brand", "branding", "logo", "identity"]):
        return "branding"
    elif any(w in text for w in ["content", "blog", "article", "write", "writing"]):
        return "content_creation"
    elif any(w in text for w in ["social", "instagram", "twitter", "linkedin", "post"]):
        return "social_media"
    elif any(w in text for w in ["market", "research", "analysis", "analyze"]):
        return "research"
    elif any(w in text for w in ["design", "visual", "graphic", "ui", "ux"]):
        return "design"
    elif any(w in text for w in ["campaign", "marketing", "ads", "advertising"]):
        return "marketing"
    elif any(w in text for w in ["strategy", "plan", "planning"]):
        return "strategy"
    else:
        return "general"
