"""Streamlit UI for the NovaShop AI Customer Support Agent."""

from __future__ import annotations

import json
import streamlit as st

from agent.config import GEMINI_MODEL, MissingAPIKeyError
from agent.evaluate import run_all_tests
from agent.loop import run_agent
from agent.prompts import SYSTEM_PROMPT
from agent.state import Ticket, TicketStore
from agent.tools import ESCALATION_LOG, get_all_faqs, get_all_orders_with_dates
from tests.sample_tickets import SAMPLE_TICKETS

st.set_page_config(
    page_title="NovaShop AI Support Agent",
    page_icon="🎧",
    layout="wide",
)

# Initialize session state
if "ticket_store" not in st.session_state:
    st.session_state.ticket_store = TicketStore()
if "selected_ticket_id" not in st.session_state:
    st.session_state.selected_ticket_id = None
if "eval_results" not in st.session_state:
    st.session_state.eval_results = []
if "form_name" not in st.session_state:
    st.session_state.form_name = SAMPLE_TICKETS[0]["customer_name"]
if "form_email" not in st.session_state:
    st.session_state.form_email = SAMPLE_TICKETS[0]["customer_email"]
if "form_message" not in st.session_state:
    st.session_state.form_message = SAMPLE_TICKETS[0]["message"]

store: TicketStore = st.session_state.ticket_store

# ============================================================================
# SIDEBAR: Ticket History & Session Controls
# ============================================================================
with st.sidebar:
    st.title("NovaShop Support AI")
    st.caption(f"Model: `{GEMINI_MODEL}` · Hand-Written 3-Call Loop")

    if st.button("Run All 8 Sample Tests", type="primary", use_container_width=True):
        with st.spinner("Running all 8 sample test scenarios against Gemini..."):
            try:
                st.session_state.eval_results = run_all_tests(store=store)
                tickets_after = store.list_tickets()
                if tickets_after:
                    st.session_state.selected_ticket_id = tickets_after[0].ticket_id
            except MissingAPIKeyError as exc:
                st.error(str(exc))
            except Exception as exc:  # noqa: BLE001
                st.error(f"Test run failed: {exc}")

    st.divider()
    col_hdr1, col_hdr2 = st.columns([3, 1])
    col_hdr1.subheader("Ticket History")
    if col_hdr2.button("Clear", help="Clear session ticket history"):
        store.clear()
        st.session_state.selected_ticket_id = None
        st.session_state.eval_results = []
        st.rerun()

    tickets = store.list_tickets()
    if not tickets:
        st.info("No tickets submitted in this session yet.")
    else:
        for t in tickets:
            status_icon = {
                "resolved": "✅",
                "escalated": "🚨",
                "open": "⏳",
            }.get(t.status, "⏳")
            cat_label = t.latest_output.category.upper() if t.latest_output else "PENDING"
            btn_label = f"{status_icon} {t.ticket_id} · {t.customer_name} ({cat_label})"
            if st.button(
                btn_label,
                key=f"select_{t.ticket_id}",
                use_container_width=True,
                type="secondary" if t.ticket_id != st.session_state.selected_ticket_id else "primary",
            ):
                st.session_state.selected_ticket_id = t.ticket_id
                st.rerun()

# ============================================================================
# MAIN WORKSPACE
# ============================================================================
st.header("NovaShop Electronics — AI Customer Support Console")
st.markdown(
    "Workflow: **Ticket → Classification (JSON Schema) → Policy Routing → "
    "Agent Tool Loop (`disable=True`) → Structured Output & Validation → Multi-Turn State**"
)

tab_console, tab_tests, tab_data = st.tabs(
    ["Support Console & Trace", "Automated Test Suite (8 Tests)", "Mock Orders & FAQ Data"]
)

with tab_console:
    # Sample ticket selector
    sample_options = {"-- Custom Input --": None}
    for s in SAMPLE_TICKETS:
        sample_options[s["title"]] = s

    selected_sample_label = st.selectbox(
        "Load a Ready Sample Ticket (8 Scenarios):",
        options=list(sample_options.keys()),
        index=1,
    )

    if selected_sample_label != "-- Custom Input --":
        sample_obj = sample_options[selected_sample_label]
        if sample_obj and st.button("Populate Form with Selected Sample"):
            st.session_state.form_name = sample_obj["customer_name"]
            st.session_state.form_email = sample_obj["customer_email"]
            st.session_state.form_message = sample_obj["message"]
            st.rerun()

    with st.form("submit_ticket_form", clear_on_submit=False):
        c1, c2 = st.columns(2)
        customer_name = c1.text_input("Customer Name", value=st.session_state.form_name)
        customer_email = c2.text_input("Customer Email", value=st.session_state.form_email)
        ticket_message = st.text_area(
            "Support Ticket Message",
            value=st.session_state.form_message,
            height=100,
        )
        submitted = st.form_submit_button("Submit Ticket", type="primary")

    if submitted and ticket_message.strip():
        with st.spinner("Running Classification -> Routing -> Tool Loop -> Structured Synthesis..."):
            try:
                new_ticket = store.create_ticket(
                    customer_name=customer_name,
                    customer_email=customer_email,
                    initial_message=ticket_message,
                )
                run_agent(ticket=new_ticket)
                st.session_state.selected_ticket_id = new_ticket.ticket_id
                st.rerun()
            except MissingAPIKeyError as exc:
                st.error(str(exc))
            except Exception as exc:  # noqa: BLE001
                st.error(f"Error running agent: {exc}")

    st.divider()

    active_ticket: Ticket | None = None
    if st.session_state.selected_ticket_id:
        active_ticket = store.get_ticket(st.session_state.selected_ticket_id)
    elif store.list_tickets():
        active_ticket = store.list_tickets()[0]

    if active_ticket and active_ticket.latest_output:
        out = active_ticket.latest_output
        left_col, right_col = st.columns([7, 5])

        with left_col:
            st.subheader(f"Ticket {active_ticket.ticket_id} — {active_ticket.customer_name}")
            m1, m2, m3, m4 = st.columns(4)
            m1.metric("Category", out.category.upper())
            m2.metric("Priority", out.priority.upper())
            m3.metric("Sentiment", out.sentiment.upper())
            m4.metric("Status", active_ticket.status.upper())

            st.caption(
                f"**Tools Used:** `{', '.join(out.tools_used) if out.tools_used else 'None'}` · "
                f"**Needs Human:** `{out.needs_human}`"
            )

            # Conversation History
            for turn in active_ticket.messages:
                with st.chat_message("user" if turn.role == "customer" else "assistant"):
                    st.write(turn.content)
                    if turn.role == "agent" and turn.output:
                        with st.expander("Internal Support Note & Validated JSON Schema"):
                            st.warning(f"**Internal Note:** {turn.output.internal_note}")
                            st.json(turn.output.model_dump())

            # Multi-turn follow-up box
            with st.form(f"followup_form_{active_ticket.ticket_id}", clear_on_submit=True):
                followup_msg = st.text_input(
                    "Send Follow-Up Message (Multi-Turn Memory):",
                    placeholder="e.g., My order ID is #1004, it's the mechanical keyboard.",
                )
                followup_submit = st.form_submit_button("Send Follow-Up")

            if followup_submit and followup_msg.strip():
                with st.spinner("Processing multi-turn follow-up..."):
                    active_ticket.add_customer_message(followup_msg)
                    run_agent(ticket=active_ticket)
                    st.rerun()

        with right_col:
            st.subheader("Agent Trace")
            for idx, step in enumerate(active_ticket.trace, start=1):
                badge = step.step_type.upper()
                header = f"#{idx} [{badge}] {step.title}"
                if step.duration_ms:
                    header += f" ({step.duration_ms}ms)"
                with st.expander(header, expanded=step.step_type in ("tool_call", "final_answer", "error")):
                    if step.content:
                        st.code(step.content, language="json" if step.content.startswith("{") else "text")

with tab_tests:
    st.subheader("8 Sample Tickets Evaluation Matrix")
    if st.session_state.eval_results:
        rows_data = [
            {
                "Test": r.title,
                "Pass/Fail": "PASS" if r.passed else "FAIL",
                "Expected Category": "/".join(r.expected_categories),
                "Actual Category": r.actual_category,
                "Expected Tools": ", ".join(r.expected_tools) or "none",
                "Actual Tools": ", ".join(r.actual_tools) or "none",
                "Expected Escalation": r.expected_needs_human,
                "Actual Escalation": r.actual_needs_human,
                "Latency (ms)": r.duration_ms,
            }
            for r in st.session_state.eval_results
        ]
        st.dataframe(rows_data, use_container_width=True)
    else:
        st.info("Click 'Run All 8 Sample Tests' in the sidebar to populate the evaluation table.")

with tab_data:
    st.subheader("10 Mock Orders (with Runtime-Computed Dates)")
    st.dataframe(get_all_orders_with_dates(), use_container_width=True)

    st.subheader("12 FAQ Knowledge Base Articles")
    st.dataframe(get_all_faqs(), use_container_width=True)

    st.subheader("Session Escalation Records")
    st.json(ESCALATION_LOG)

    st.subheader("Agent System Prompt")
    st.code(SYSTEM_PROMPT)
