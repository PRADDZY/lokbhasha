"""Action extraction from translated government text."""

from __future__ import annotations

import re


ACTION_PATTERN = re.compile(
    r"\b(submit|apply|register|visit|contact|provide|attach|pay|collect|report)\b",
    re.IGNORECASE,
)
DEADLINE_PATTERN = re.compile(
    r"\b(?:deadline|before|by|on or before)\b[^.\n]*",
    re.IGNORECASE,
)


def _split_sentences(text: str) -> list[str]:
    return [sentence.strip() for sentence in re.split(r"[.\n]+", text) if sentence.strip()]


def extract_actions(english_text: str) -> list[dict[str, str | None]]:
    actions: list[dict[str, str | None]] = []

    for sentence in _split_sentences(english_text):
        action_match = ACTION_PATTERN.search(sentence)
        if not action_match:
            continue

        deadline_match = DEADLINE_PATTERN.search(sentence)
        actions.append(
            {
                "action": sentence,
                "deadline": deadline_match.group(0).strip() if deadline_match else None,
                "requirement": sentence,
            }
        )

    return actions