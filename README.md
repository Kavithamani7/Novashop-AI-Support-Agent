# NovaShop AI Customer Support Agent

A complete AI Customer Support Agent for **NovaShop** (a fictional online electronics store) powered by the official **`google-genai` SDK** and **`gemini-2.5-flash`**.

## Core Workflow & 3-Call Gemini Architecture

```text
Ticket -> Classification -> Routing -> Agent Tool Loop -> Structured Output + Validation -> State Update
```

Because Gemini does not combine Function Calling and `response_schema` in a single API call, the hand-written loop in `agent/loop.py` uses **three distinct API phases**:

1. **Call #1 — Classification (`agent/router.py`)**:
   - Uses `response_mime_type="application/json"` with the `ClassificationResult` Pydantic v2 schema and **no tools**.
   - Classifies `category`, `priority`, `sentiment`, `is_prompt_injection`, and `has_legal_or_safety_threat`.
2. **Call #2 — Iterative Tool Loop (`agent/loop.py`, max 5 iterations)**:
   - Enables `tools=[types.Tool(function_declarations=TOOL_DECLARATIONS)]` with **no JSON schema**.
   - Disables automatic function calling via `types.AutomaticFunctionCallingConfig(disable=True)` so our hand-written loop controls tool execution and trace logging.
   - Appends the model's `Content` to history, executes each requested tool (`lookup_order`, `search_faq`, `check_refund_eligibility`, `escalate_to_human`), and appends results using `types.Part.from_function_response(...)` in a `"user"` role `Content`.
3. **Call #3 — Final Structured Synthesis (`agent/loop.py` + `agent/schema.py`)**:
   - Uses `response_mime_type="application/json"` with the `AgentOutput` Pydantic v2 schema and **no tools**, passing the executed tool results as plain text in the prompt.
   - Validates output via `validate_output()`. If validation fails, retries once with the validation error, then falls back to `safe_default()` which escalates to a human specialist.

---

## Project Structure

```text
novashop-ai-support-agent/
├── app.py                    # Streamlit UI
├── agent/
│   ├── __init__.py
│   ├── config.py             # env loading, client creation, retry backoff, MissingAPIKeyError
│   ├── prompts.py            # SYSTEM_PROMPT, CLASSIFIER_PROMPT, SYNTHESIS_PROMPT_TEMPLATE
│   ├── schema.py             # Pydantic v2 models, validate_output(), safe_default()
│   ├── tools.py              # tool functions, FunctionDeclarations, execute_tool()
│   ├── router.py             # classify() and route() -> RoutePlan
│   ├── state.py              # Ticket dataclass and TicketStore (in-memory)
│   ├── loop.py               # run_agent(): the full 3-call pipeline
│   └── evaluate.py           # run_all_tests() and pass/fail checks
├── data/
│   ├── orders.json           # 10 orders (1001-1010) with relative day offsets
│   └── faq.json              # 12 FAQ entries covering NovaShop policies
├── tests/
│   ├── __init__.py
│   ├── sample_tickets.py     # the 8 test tickets with expected results
│   ├── run_tests.py          # CLI: python -m tests.run_tests
│   └── test_agent_offline.py # pytest tests that need no API key
├── docs/screenshots/.gitkeep
├── TEST_CASES.md
├── README.md
├── requirements.txt
├── .env.example
├── .gitignore
└── LICENSE
```

---

## Setup & Usage

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   export GEMINI_API_KEY="your_api_key_here"
   ```

3. **Run the Streamlit UI:**
   ```bash
   streamlit run app.py
   ```

4. **Run Offline Unit Tests (no API key needed):**
   ```bash
   pytest tests/test_agent_offline.py
   ```

5. **Run Live CLI Evaluation Suite (all 8 sample tickets):**
   ```bash
   python -m tests.run_tests
   ```
