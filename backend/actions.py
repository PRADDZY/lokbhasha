"""Action extraction from translated government text."""

from __future__ import annotations

from typing import TypedDict


ACTION_VERBS = {
    "submit",
    "apply",
    "register",
    "visit",
    "contact",
    "provide",
    "attach",
    "pay",
    "collect",
    "report",
}
DEADLINE_MARKERS = ("on or before", "deadline", "before", "by")
WORD_STRIP_CHARS = " ,:;!?()[]{}\"'"


class ActionItem(TypedDict):
    action: str
    deadline: str | None
    requirement: str


def _split_sentences(text: str) -> list[str]:
    sentences: list[str] = []
    current: list[str] = []

    for character in text:
        if character in ".\n":
            sentence = "".join(current).strip()
            if sentence:
                sentences.append(sentence)
            current = []
            continue

        current.append(character)

    final_sentence = "".join(current).strip()
    if final_sentence:
        sentences.append(final_sentence)

    return sentences


def _contains_action_verb(sentence: str) -> bool:
    contains_action = False
    for word in sentence.lower().split():
        if word.strip(WORD_STRIP_CHARS) in ACTION_VERBS:
            contains_action = True
            break

    return contains_action


def _marker_start(lowered_sentence: str, marker: str) -> int | None:
    marker_length = len(marker)
    marker_index: int | None = None

    for start_index in range(len(lowered_sentence) - marker_length + 1):
        if lowered_sentence[start_index : start_index + marker_length] == marker:
            marker_index = start_index
            break

    return marker_index


def _extract_deadline(sentence: str) -> str | None:
    lowered_sentence = sentence.lower()
    deadline: str | None = None
    for marker in DEADLINE_MARKERS:
        marker_index = _marker_start(lowered_sentence, marker)
        if marker_index is not None:
            deadline = sentence[marker_index:].strip()
            break

    return deadline


def extract_actions(english_text: str) -> list[ActionItem]:
    actions: list[ActionItem] = []

    for sentence in _split_sentences(english_text):
        if not _contains_action_verb(sentence):
            continue

        action_item = {
            "action": sentence,
            "deadline": _extract_deadline(sentence),
            "requirement": sentence,
        }
        actions.append(action_item)

    return actions
