"""Hand-written 3-phase Gemini Agent Loop for NovaShop Customer Support.

Follows the strict 3-call architecture:
1. Classification Call: response_mime_type="application/json" + ClassificationResult schema, no tools.
2. Tool Loop Calls (max 5 iterations): tools enabled, AutomaticFunctionCallingConfig(disable=True),
   no JSON schema. Appends model Content to history, executes tools, and appends results via
   types.Part.from_function_response(...) in a "user" role Content.
3. Final Synthesis Call: response_mime_type="application/json" + AgentOutput schema, no tools.
   Passes tool results as plain text in the prompt, validates output with Pydantic v2, retries once
   on validation failure, or falls back to safe_default().
"""

from __future__ import annotations

import json
import time
from typing import Any

from google import genai
from google.genai import types

from agent.config import GEMINI_MODEL, MAX_ITERATIONS, call_with_retry, get_client
from agent.prompts import AGENT_SAFETY_RULES, SYNTHESIS_PROMPT_TEMPLATE, SYSTEM_PROMPT
from agent.router import RoutePlan, classify, route
from agent.schema import AgentOutput, ClassificationResult, safe_default, validate_output
from agent.state import Ticket, TraceStep
from agent.tools import GEMINI_TOOLS, execute_tool


def run_agent(
    ticket: Ticket,
    client: genai.Client | None = None,
    model: str = GEMINI_MODEL,
    max_iterations: int = MAX_ITERATIONS,
) -> tuple[AgentOutput, list[TraceStep]]:
    """Run the full 5-stage pipeline on the latest customer message in `ticket`."""
    trace_steps: list[TraceStep] = []
    tools_used: list[str] = []
    tool_transcript_entries: list[str] = []

    latest_message = ticket.messages[-1].content if ticket.messages else ""
    history_text = ticket.format_history_for_prompt()

    try:
        active_client = client or get_client()
    except Exception as exc:  # noqa: BLE001
        fallback = safe_default(reason=f"Client initialization failed: {exc}")
        trace_steps.append(
            TraceStep(
                step_type="error",
                title="Missing or Invalid API Key",
                content=str(exc),
            )
        )
        ticket.record_agent_turn(
            ClassificationResult(
                category="general",
                priority="high",
                sentiment="neutral",
                reasoning="Fallback classification due to client initialization error.",
            ),
            fallback,
            trace_steps,
        )
        return fallback, trace_steps

    # ========================================================================
    # PHASE 1: CLASSIFICATION CALL (JSON Schema, No Tools)
    # ========================================================================
    t0 = time.perf_counter()
    classification = classify(
        client=active_client,
        message=latest_message,
        history_summary=history_text,
        model=model,
    )
    classify_ms = int((time.perf_counter() - t0) * 1000)

    trace_steps.append(
        TraceStep(
            step_type="classification",
            title=f"Classified Ticket -> {classification.category.upper()}",
            content=json.dumps(classification.model_dump(), indent=2),
            duration_ms=classify_ms,
        )
    )

    # ========================================================================
    # PHASE 2: ROUTING POLICY
    # ========================================================================
    route_plan: RoutePlan = route(
        classification=classification,
        message=latest_message,
        history_text=history_text,
    )
    trace_steps.append(
        TraceStep(
            step_type="routing",
            title=f"RoutePlan -> Tools: {route_plan.recommended_tools or ['none']}",
            content=route_plan.routing_guidance,
        )
    )

    # ========================================================================
    # PHASE 3: HAND-WRITTEN TOOL LOOP (Tools Enabled, Automatic Function Calling Disabled)
    # ========================================================================
    full_system_instruction = f"{SYSTEM_PROMPT}\n\n{AGENT_SAFETY_RULES}"

    user_context_prompt = (
        f"Customer: {ticket.customer_name} <{ticket.customer_email}>\n"
        + (f"Previous Conversation History:\n{history_text}\n\n" if history_text else "")
        + f"Latest Customer Message:\n\"\"\"\n{latest_message}\n\"\"\"\n\n"
        + f"[Internal Routing Guidance]: {route_plan.routing_guidance}\n"
        + "Call the required tools to gather accurate order, refund eligibility, FAQ, or escalation data."
    )

    loop_contents: list[types.Content] = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=user_context_prompt)],
        )
    ]

    try:
        for iteration in range(1, max_iterations + 1):
            iter_start = time.perf_counter()
            response = call_with_retry(
                lambda: active_client.models.generate_content(
                    model=model,
                    contents=loop_contents,
                    config=types.GenerateContentConfig(
                        system_instruction=full_system_instruction,
                        temperature=0.1,
                        tools=GEMINI_TOOLS,
                        automatic_function_calling=types.AutomaticFunctionCallingConfig(
                            disable=True
                        ),
                    ),
                )
            )
            iter_ms = int((time.perf_counter() - iter_start) * 1000)

            candidate_content = (
                response.candidates[0].content
                if response.candidates and response.candidates[0].content
                else None
            )

            function_calls = response.function_calls or []

            # Extract any thought/reasoning text returned alongside or instead of function calls
            thought_texts: list[str] = []
            if candidate_content and candidate_content.parts:
                for part in candidate_content.parts:
                    if getattr(part, "text", None):
                        thought_texts.append(part.text.strip())
            combined_thought = "\n".join(t for t in thought_texts if t)

            if not function_calls:
                trace_steps.append(
                    TraceStep(
                        step_type="thought",
                        title=f"Tool Loop Completed (Iteration {iteration}/{max_iterations})",
                        content=combined_thought or "All necessary tool calls completed; ready for structured synthesis.",
                        iteration=iteration,
                        duration_ms=iter_ms,
                    )
                )
                break

            if combined_thought:
                trace_steps.append(
                    TraceStep(
                        step_type="thought",
                        title=f"Agent Reasoning (Iteration {iteration})",
                        content=combined_thought,
                        iteration=iteration,
                        duration_ms=iter_ms,
                    )
                )

            # 1. Append the model's response content to the history
            if candidate_content is not None:
                loop_contents.append(candidate_content)

            # 2. Execute each function call and build function_response parts
            response_parts: list[types.Part] = []
            for fc in function_calls:
                fn_name = fc.name or "unknown_tool"
                fn_args: dict[str, Any] = dict(fc.args) if fc.args else {}
                tools_used.append(fn_name)

                trace_steps.append(
                    TraceStep(
                        step_type="tool_call",
                        title=f"Tool Call: {fn_name}",
                        content=f"{fn_name}({json.dumps(fn_args)})",
                        iteration=iteration,
                        tool_name=fn_name,
                        tool_args=fn_args,
                    )
                )

                tool_t0 = time.perf_counter()
                tool_result = execute_tool(fn_name, fn_args)
                tool_ms = int((time.perf_counter() - tool_t0) * 1000)

                trace_steps.append(
                    TraceStep(
                        step_type="tool_result",
                        title=f"Tool Result: {fn_name}",
                        content=json.dumps(tool_result, indent=2),
                        iteration=iteration,
                        tool_name=fn_name,
                        tool_result=tool_result,
                        duration_ms=tool_ms,
                    )
                )

                tool_transcript_entries.append(
                    f"Tool `{fn_name}` called with args {json.dumps(fn_args)} -> Result: {json.dumps(tool_result)}"
                )

                response_parts.append(
                    types.Part.from_function_response(
                        name=fn_name,
                        response={"result": tool_result},
                    )
                )

            # 3. Append the results with types.Part.from_function_response(...) in a "user" role Content
            loop_contents.append(
                types.Content(
                    role="user",
                    parts=response_parts,
                )
            )

        # Deterministic Safety Guardrail: Ensure required route tools were executed if the LLM skipped any
        for req_tool in route_plan.recommended_tools:
            if req_tool not in tools_used:
                fallback_args: dict[str, Any] = {}
                if req_tool in ("lookup_order", "check_refund_eligibility") and route_plan.extracted_order_ids:
                    fallback_args = {"order_id": route_plan.extracted_order_ids[0]}
                elif req_tool == "search_faq":
                    fallback_args = {"query": latest_message[:120]}
                elif req_tool == "escalate_to_human":
                    fallback_args = {
                        "reason": (
                            "Prompt injection / unauthorized command attempt."
                            if route_plan.is_prompt_injection
                            else "Angry customer or legal/safety escalation policy triggered."
                        ),
                        "priority": route_plan.priority,
                    }
                else:
                    continue

                tools_used.append(req_tool)
                trace_steps.append(
                    TraceStep(
                        step_type="tool_call",
                        title=f"Router Policy Tool Call: {req_tool}",
                        content=f"{req_tool}({json.dumps(fallback_args)})",
                        tool_name=req_tool,
                        tool_args=fallback_args,
                    )
                )
                res_obj = execute_tool(req_tool, fallback_args)
                trace_steps.append(
                    TraceStep(
                        step_type="tool_result",
                        title=f"Tool Result: {req_tool}",
                        content=json.dumps(res_obj, indent=2),
                        tool_name=req_tool,
                        tool_result=res_obj,
                    )
                )
                tool_transcript_entries.append(
                    f"Tool `{req_tool}` called with args {json.dumps(fallback_args)} -> Result: {json.dumps(res_obj)}"
                )

        # ====================================================================
        # PHASE 4: FINAL SYNTHESIS CALL (JSON Schema, No Tools)
        # ====================================================================
        unique_tools = list(dict.fromkeys(tools_used))
        needs_human_flag = route_plan.force_escalation or ("escalate_to_human" in unique_tools)
        tool_results_plain_text = (
            "\n".join(tool_transcript_entries)
            if tool_transcript_entries
            else "No tools were called (e.g., missing Order ID or clarifying question needed)."
        )

        synthesis_prompt = SYNTHESIS_PROMPT_TEMPLATE.format(
            category=classification.category,
            priority=classification.priority,
            sentiment=classification.sentiment,
            force_escalation=route_plan.force_escalation,
            tools_used=", ".join(unique_tools) if unique_tools else "none",
            tool_results_text=tool_results_plain_text,
            needs_human_hint="true" if needs_human_flag else "false",
            tools_used_json=json.dumps(unique_tools),
        )

        synth_contents = [
            types.Content(
                role="user",
                parts=[
                    types.Part.from_text(
                        text=(
                            f"Customer ({ticket.customer_name}): {latest_message}\n\n"
                            f"{synthesis_prompt}"
                        )
                    )
                ],
            )
        ]

        synth_t0 = time.perf_counter()
        synth_response = call_with_retry(
            lambda: active_client.models.generate_content(
                model=model,
                contents=synth_contents,
                config=types.GenerateContentConfig(
                    system_instruction=full_system_instruction,
                    temperature=0.1,
                    response_mime_type="application/json",
                    response_schema=AgentOutput,
                ),
            )
        )
        synth_ms = int((time.perf_counter() - synth_t0) * 1000)
        raw_json = synth_response.text or ""

        validated, val_error = validate_output(raw_json)

        # If validation fails, retry ONCE with an error message to Gemini
        if validated is None:
            trace_steps.append(
                TraceStep(
                    step_type="validation_retry",
                    title="Schema Validation Failed — Retrying Once",
                    content=val_error or "Unknown validation error",
                )
            )
            retry_prompt = (
                f"Your previous JSON output was invalid:\n{val_error}\n\n"
                "Please correct the JSON so it strictly conforms to the AgentOutput schema."
            )
            retry_response = call_with_retry(
                lambda: active_client.models.generate_content(
                    model=model,
                    contents=[
                        *synth_contents,
                        types.Content(role="model", parts=[types.Part.from_text(text=raw_json)]),
                        types.Content(role="user", parts=[types.Part.from_text(text=retry_prompt)]),
                    ],
                    config=types.GenerateContentConfig(
                        system_instruction=full_system_instruction,
                        temperature=0.0,
                        response_mime_type="application/json",
                        response_schema=AgentOutput,
                    ),
                )
            )
            validated, val_error = validate_output(retry_response.text or "")

        if validated is not None:
            # Ensure tools_used and needs_human reflect actual execution
            final_output = AgentOutput(
                category=validated.category,
                priority=validated.priority,
                sentiment=validated.sentiment,
                needs_human=validated.needs_human or needs_human_flag,
                tools_used=unique_tools,
                reply=validated.reply,
                internal_note=validated.internal_note,
            )
            trace_steps.append(
                TraceStep(
                    step_type="final_answer",
                    title="Validated Structured Output (AgentOutput)",
                    content=json.dumps(final_output.model_dump(), indent=2),
                    duration_ms=synth_ms,
                )
            )
        else:
            if "escalate_to_human" not in unique_tools:
                execute_tool(
                    "escalate_to_human",
                    {"reason": f"Schema validation failed after retry: {val_error}", "priority": "high"},
                )
                unique_tools.append("escalate_to_human")

            final_output = safe_default(
                reason=f"Validation failed after retry: {val_error}",
                category=classification.category,
                priority=classification.priority,
                sentiment=classification.sentiment,
                tools_used=unique_tools,
            )
            trace_steps.append(
                TraceStep(
                    step_type="error",
                    title="Safe Fallback Escalation Triggered",
                    content=json.dumps(final_output.model_dump(), indent=2),
                )
            )

    except Exception as exc:  # noqa: BLE001
        unique_tools = list(dict.fromkeys(tools_used))
        if "escalate_to_human" not in unique_tools:
            execute_tool(
                "escalate_to_human",
                {"reason": f"Runtime API error: {exc}", "priority": "high"},
            )
            unique_tools.append("escalate_to_human")

        final_output = safe_default(
            reason=f"API or runtime exception: {exc}",
            category=classification.category,
            priority=classification.priority,
            sentiment=classification.sentiment,
            tools_used=unique_tools,
        )
        trace_steps.append(
            TraceStep(
                step_type="error",
                title="API Error — Safe Fallback Escalation",
                content=str(exc),
            )
        )

    # ========================================================================
    # PHASE 5: UPDATE TICKET STATE
    # ========================================================================
    ticket.record_agent_turn(classification, final_output, trace_steps)
    return final_output, trace_steps
