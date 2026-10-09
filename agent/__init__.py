"""NovaShop AI Customer Support Agent package."""

from agent.config import GEMINI_MODEL, MissingAPIKeyError, get_client
from agent.loop import run_agent
from agent.router import RoutePlan, classify, route
from agent.schema import (
    AgentOutput,
    ClassificationResult,
    safe_default,
    validate_output,
)
from agent.state import Ticket, TicketStore
from agent.tools import TOOL_DECLARATIONS, execute_tool

__all__ = [
    "GEMINI_MODEL",
    "MissingAPIKeyError",
    "get_client",
    "run_agent",
    "RoutePlan",
    "classify",
    "route",
    "AgentOutput",
    "ClassificationResult",
    "validate_output",
    "safe_default",
    "Ticket",
    "TicketStore",
    "TOOL_DECLARATIONS",
    "execute_tool",
]
