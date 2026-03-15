"""Action extraction from translated government text."""

from __future__ import annotations


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
    for word in sentence.lower().split():
        if word.strip(" ,:;!?()[]{}\"'") in ACTION_VERBS:
            return True

    return False


def _extract_deadline(sentence: str) -> str | None:
    lowered_sentence = sentence.lower()
    for marker in DEADLINE_MARKERS:
        index = lowered_sentence.find(marker)
        if index >= 0:
            return sentence[index:].strip()

    return None


def extract_actions(english_text: str) -> list[dict[str, str | None]]:
    actions: list[dict[str, str | None]] = []

    for sentence in _split_sentences(english_text):
        if not _contains_action_verb(sentence):
            continue

        actions.append(
            {
                "action": sentence,
                "deadline": _extract_deadline(sentence),
                "requirement": sentence,
            }
        )

    return actions
