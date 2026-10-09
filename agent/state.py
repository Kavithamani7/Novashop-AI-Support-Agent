"""Conversation state dataclasses and in-memory TicketStore for multi-turn tickets."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal

from agent.schema import AgentOutput, ClassificationResult

TicketStatus = Literal["open", "resolved", "escalated"]


@dataclass
class TraceStep:
    """Single step in the Agent Trace (classification, routing, thought, tool_call, tool_result, final_answer)."""

    step_type: Literal[
        "classification",
        "routing",
        "thought",
        "tool_call",
        "tool_result",
        "validation_retry",
        "final_answer",
        "error",
    ]
    title: str
    content: str = ""
    iteration: int = 0
    tool_name: str | None = None
    tool_args: dict[str, Any] | None = None
    tool_result: dict[str, Any] | None = None
    duration_ms: int = 0
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> dict[str, Any]:
        return {
            "step_type": self.step_type,
            "title": self.title,
            "content": self.content,
            "iteration": self.iteration,
            "tool_name": self.tool_name,
            "tool_args": self.tool_args,
            "tool_result": self.tool_result,
            "duration_ms": self.duration_ms,
            "timestamp": self.timestamp,
        }


@dataclass
class MessageTurn:
    """A single customer or agent turn in a ticket's conversation history."""

    role: Literal["customer", "agent"]
    content: str
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    output: AgentOutput | None = None
    trace: list[TraceStep] = field(default_factory=list)


@dataclass
class Ticket:
    """Complete state for a customer support ticket across multiple turns."""

    ticket_id: str
    customer_name: str
    customer_email: str
    status: TicketStatus = "open"
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    messages: list[MessageTurn] = field(default_factory=list)
    classification: ClassificationResult | None = None
    latest_output: AgentOutput | None = None
    tools_called: list[str] = field(default_factory=list)
    trace: list[TraceStep] = field(default_factory=list)

    def add_customer_message(self, text: str) -> None:
        now = datetime.now(timezone.utc).isoformat()
        self.messages.append(MessageTurn(role="customer", content=text.strip(), timestamp=now))
        self.updated_at = now

    def record_agent_turn(
        self,
        classification: ClassificationResult,
        output: AgentOutput,
        trace_steps: list[TraceStep],
    ) -> None:
        now = datetime.now(timezone.utc).isoformat()
        self.classification = classification
        self.latest_output = output
        self.updated_at = now

        for tool_name in output.tools_used:
            if tool_name not in self.tools_called:
                self.tools_called.append(tool_name)

        if output.needs_human or "escalate_to_human" in output.tools_used:
            self.status = "escalated"
        else:
            reply_lower = output.reply.lower()
            asks_for_order_id = any(
                phrase in reply_lower
                for phrase in ("order id", "order number", "provide your", "share your", "which device")
            )
            self.status = "open" if (asks_for_order_id and not output.tools_used) else "resolved"

        self.messages.append(
            MessageTurn(
                role="agent",
                content=output.reply,
                timestamp=now,
                output=output,
                trace=list(trace_steps),
            )
        )
        self.trace.extend(trace_steps)

    def format_history_for_prompt(self) -> str:
        """Render earlier turns as plain text context for multi-turn continuity."""
        if len(self.messages) <= 1:
            return ""
        lines: list[str] = []
        for turn in self.messages[:-1]:
            speaker = f"Customer ({self.customer_name})" if turn.role == "customer" else "NovaShop Agent"
            lines.append(f"{speaker}: {turn.content}")
        return "\n".join(lines)


class TicketStore:
    """In-memory session store managing all tickets."""

    def __init__(self) -> None:
        self._tickets: dict[str, Ticket] = {}
        self._counter: int = 2000

    def create_ticket(
        self,
        customer_name: str,
        customer_email: str,
        initial_message: str,
        ticket_id: str | None = None,
    ) -> Ticket:
        self._counter += 1
        tid = ticket_id or f"TKT-{self._counter}"
        ticket = Ticket(
            ticket_id=tid,
            customer_name=customer_name.strip() or "Customer",
            customer_email=customer_email.strip() or "customer@example.com",
        )
        ticket.add_customer_message(initial_message)
        self._tickets[tid] = ticket
        return ticket

    def get_ticket(self, ticket_id: str) -> Ticket | None:
        return self._tickets.get(ticket_id)

    def list_tickets(self) -> list[Ticket]:
        return sorted(
            self._tickets.values(),
            key=lambda t: t.updated_at,
            reverse=True,
        )

    def clear(self) -> None:
        self._tickets.clear()
