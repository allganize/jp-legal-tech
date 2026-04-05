"""Japanese judge name parser.

Extracts judge names and roles from the tail of judgment full text.
Uses a title-splitting approach: find all title keywords (裁判長裁判官, 裁判官,
裁判長判事, 判事), then extract names from segments between titles.

Handles three historical signature patterns:
  A) Modern multi-line: 裁判長裁判官  name / 裁判官  name
  B) Modern inline (Supreme Court): ( 裁判長裁判官  name  裁判官  name ... )
  C) Old-style (pre-1960s): 裁判長判事  name  判事  name
"""

import re
from dataclasses import dataclass


@dataclass
class ParsedJudge:
    name: str
    role: str  # '裁判長' or '陪席'
    is_supreme: bool


# Match title keywords. Order matters: longer matches first to avoid partial matches.
_TITLE_PATTERN = re.compile(r"(裁判長裁判官|裁判長判事|裁判官|判事)")


def _extract_name(segment: str) -> str | None:
    """Extract a valid judge name (2-5 CJK kanji) from a text segment.

    Returns None if the segment contains hiragana/katakana (indicating
    it's a sentence, not a name) or if the kanji count is outside 2-5.
    """
    # Reject segments containing hiragana, katakana, or digits — they're prose, not names
    if re.search(r"[\u3040-\u309F\u30A0-\u30FF0-9０-９]", segment):
        return None
    # Extract CJK kanji characters + iteration mark 々 (U+3005)
    kanji = re.sub(r"[^\u4E00-\u9FFF\u3400-\u4DBF\u3005]", "", segment)
    if 2 <= len(kanji) <= 5:
        return kanji
    return None


def parse_judges(full_text: str, trial_type: str | None = None) -> list[ParsedJudge]:
    """Extract judge names and roles from Japanese judgment text.

    Args:
        full_text: Full judgment text (contents field).
        trial_type: Optional trial_type from case metadata for supreme court detection.

    Scans the last 2000 characters where signatures typically appear.
    """
    if not full_text:
        return []

    tail = full_text[-2000:]

    # Detect Supreme Court
    if trial_type:
        is_supreme = trial_type == "SupremeCourt"
    else:
        is_supreme = "小法廷" in tail or "大法廷" in tail

    # Find all title keyword positions
    matches = list(_TITLE_PATTERN.finditer(tail))
    if not matches:
        return []

    judges: list[ParsedJudge] = []
    seen_names: set[str] = set()

    for i, m in enumerate(matches):
        title = m.group(1)
        is_presiding = title.startswith("裁判長")

        # Segment: text from end of this title to start of next title (or +30 chars)
        seg_start = m.end()
        if i + 1 < len(matches):
            seg_end = matches[i + 1].start()
        else:
            seg_end = min(seg_start + 30, len(tail))

        segment = tail[seg_start:seg_end]
        name = _extract_name(segment)

        if name and name not in seen_names:
            seen_names.add(name)
            judges.append(ParsedJudge(
                name=name,
                role="裁判長" if is_presiding else "陪席",
                is_supreme=is_supreme,
            ))

    return judges
