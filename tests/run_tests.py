"""CLI runner for executing all 8 sample test tickets against the live Gemini API.

Usage:
    python -m tests.run_tests
"""

from __future__ import annotations

import sys

from agent.config import GEMINI_MODEL, MissingAPIKeyError
from agent.evaluate import run_all_tests


def main() -> int:
    print("=" * 88)
    print(f"NovaShop AI Customer Support Agent — Live Evaluation Suite (Model: {GEMINI_MODEL})")
    print("=" * 88)

    try:
        rows = run_all_tests()
    except MissingAPIKeyError as exc:
        print(f"\n[ERROR] {exc}", file=sys.stderr)
        return 1

    passed_count = 0
    for row in rows:
        status_str = "PASS" if row.passed else "FAIL"
        if row.passed:
            passed_count += 1
        print(f"\n[{status_str}] {row.title} ({row.duration_ms} ms)")
        print(f"  Category   : expected={row.expected_categories} | actual='{row.actual_category}' (ok={row.category_ok})")
        print(f"  Tools Used : expected={row.expected_tools} | actual={row.actual_tools} (ok={row.tools_ok})")
        print(f"  Needs Human: expected={row.expected_needs_human} | actual={row.actual_needs_human} (ok={row.escalation_ok})")
        print(f"  Reply      : {row.reply[:140]}{'...' if len(row.reply) > 140 else ''}")

    print("\n" + "=" * 88)
    print(f"Summary: {passed_count}/{len(rows)} scenarios passed.")
    print("=" * 88)
    return 0 if passed_count == len(rows) else 1


if __name__ == "__main__":
    raise SystemExit(main())
