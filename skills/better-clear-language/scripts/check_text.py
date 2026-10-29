#!/usr/bin/env python3
"""Check plain text for mechanical clear-language issues."""

from __future__ import annotations

import re
import sys
from pathlib import Path


TERMS = {
    "actually": "empty intensifier",
    "genuinely": "empty intensifier",
    "really": "empty intensifier",
    "truly": "empty intensifier",
    "leverage": "corporate verb",
    "leverages": "corporate verb",
    "leveraged": "corporate verb",
    "leveraging": "corporate verb",
    "underscore": "corporate verb",
    "underscores": "corporate verb",
    "underscored": "corporate verb",
    "underscoring": "corporate verb",
    "reflect": "corporate verb",
    "reflects": "corporate verb",
    "reflected": "corporate verb",
    "reflecting": "corporate verb",
}

PATTERNS = (
    (re.compile(r"\bnot\s+[^.!?;:]{1,100}\bbut\b", re.IGNORECASE), "possible corrective contrast"),
    (re.compile(r"\b(?:on the other hand|that said|in conclusion|to summarize)\b", re.IGNORECASE), "rhetorical crutch"),
)


def line_number(text: str, index: int) -> int:
    return text.count("\n", 0, index) + 1


def check(text: str) -> list[str]:
    findings: list[str] = []

    for match in re.finditer("—", text):
        findings.append(f"line {line_number(text, match.start())}: em dash")

    for term, label in TERMS.items():
        for match in re.finditer(rf"\b{re.escape(term)}\b", text, re.IGNORECASE):
            findings.append(
                f"line {line_number(text, match.start())}: {label}: {match.group(0)!r}"
            )

    for pattern, label in PATTERNS:
        for match in pattern.finditer(text):
            excerpt = " ".join(match.group(0).split())
            findings.append(
                f"line {line_number(text, match.start())}: {label}: {excerpt!r}"
            )

    return findings


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: check_text.py <text-file>", file=sys.stderr)
        return 2

    path = Path(sys.argv[1])
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as error:
        print(f"error: {error}", file=sys.stderr)
        return 2

    findings = check(text)
    if findings:
        print("\n".join(findings))
        return 1

    print("Mechanical checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
