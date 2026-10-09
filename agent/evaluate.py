"""Automated evaluation runner comparing expected vs actual results across the 8 sample tickets."""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any

from google import genai

from agent.config import GEMINI_MODEL, get_client
from agent.loop import run_agent
from agent.state import TicketStore
from tests.sample_tickets import SAMPLE_TICKETS


@dataclass
class EvaluationRow:
    """Pass/Fail comparison result for a single sample test ticket."""

    test_id: str
    title: str
    passed: bool
    category_ok: bool
    tools_ok: bool
    escalation_ok: bool
    expected_categories: list[str]
    actual_category: str
    expected_tools: list[str]
    actual_tools: list[str]
    expected_needs_human: bool
    actual_needs_human: bool
    reply: str
    internal_note: str
    duration_ms: int
    error: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "test_id": self.test_id,
            "title": self.title,
            "passed": self.passed,
            "category_ok": self.category_ok,
            "tools_ok": self.tools_ok,
            "escalation_ok": self.escalation_ok,
            "expected_categories": self.expected_categories,
            "actual_category": self.actual_category,
            "expected_tools": self.expected_tools,
            "actual_tools": self.actual_tools,
            "expected_needs_human": self.expected_needs_human,
            "actual_needs_human": self.actual_needs_human,
            "reply": self.reply,
            "internal_note": self.internal_note,
            "duration_ms": self.duration_ms,
            "error": self.error,
        }


def evaluate_single_ticket(
    sample: dict[str, Any],
    store: TicketStore | None = None,
    client: genai.Client | None = None,
    model: str = GEMINI_MODEL,
) -> EvaluationRow:
    """Run `run_agent` on one sample test definition and evaluate pass/fail criteria."""
    active_store = store or TicketStore()
    active_client = client or get_client()

    t0 = time.perf_counter()
    ticket = active_store.create_ticket(
        customer_name=sample["customer_name"],
        customer_email=sample["customer_email"],
        initial_message=sample["message"],
    )
    output, _ = run_agent(ticket=ticket, client=active_client, model=model)
    elapsed_ms = int((time.perf_counter() - t0) * 1000)

    expected_cats: list[str] = sample["expected_categories"]
    expected_tools: list[str] = sample["expected_tools"]
    expected_human: bool = sample["expected_needs_human"]

    category_ok = output.category in expected_cats
    tools_ok = all(req in output.tools_used for req in expected_tools)
    escalation_ok = output.needs_human == expected_human

    passed = category_ok and tools_ok and escalation_ok

    return EvaluationRow(
        test_id=sample["id"],
        title=sample["title"],
        passed=passed,
        category_ok=category_ok,
        tools_ok=tools_ok,
        escalation_ok=escalation_ok,
        expected_categories=expected_cats,
        actual_category=output.category,
        expected_tools=expected_tools,
        actual_tools=output.tools_used,
        expected_needs_human=expected_human,
        actual_needs_human=output.needs_human,
        reply=output.reply,
        internal_note=output.internal_note,
        duration_ms=elapsed_ms,
    )


def run_all_tests(
    store: TicketStore | None = None,
    client: genai.Client | None = None,
    model: str = GEMINI_MODEL,
) -> list[EvaluationRow]:
    """Execute all 8 sample tickets sequentially and return their EvaluationRow results."""
    active_store = store or TicketStore()
    active_client = client or get_client()
    results: list[EvaluationRow] = []

    for sample in SAMPLE_TICKETS:
        row = evaluate_single_ticket(
            sample=sample,
            store=active_store,
            client=active_client,
            model=model,
        )
        results.append(row)

    return results
