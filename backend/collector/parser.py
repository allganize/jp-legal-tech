import re
from dataclasses import dataclass


@dataclass
class ParsedJudge:
    name: str
    role: str | None  # '재판장', '주심', '배석', None
    is_supreme: bool


# Korean name: 2-4 syllable Hangul
_NAME = r"([\uAC00-\uD7A3]{2,4})"
_ROLE = r"(?:\(([^)]+)\))?"  # optional (재판장) or (주심)

# Pattern 1: 대법관 (Supreme Court) — typically 4 justices
_SUPREME_PATTERN = re.compile(
    r"대법관\s+" + _NAME + r"\s*" + _ROLE + r"\s+" + _NAME + r"\s*" + _ROLE
    + r"\s+" + _NAME + r"\s*" + _ROLE + r"\s+" + _NAME + r"\s*" + _ROLE
)

# Pattern 2: 대법관 with flexible count (2-6 names on same line)
_SUPREME_FLEX = re.compile(
    r"대법관\s+((?:[\uAC00-\uD7A3]{2,4}\s*(?:\([^)]*\))?\s*)+)"
)

# Pattern 3: 판사 (lower court) — panel or single
_JUDGE_LINE = re.compile(
    r"(?:부장판사|판사)\s+((?:[\uAC00-\uD7A3]{2,4}\s*(?:\([^)]*\))?\s*)+)"
)

# Pattern 4: Old-style "관여 법관" — some older cases list names differently
_OLD_STYLE = re.compile(
    r"(?:관여\s*법관|관여\s*대법관)\s*((?:[\uAC00-\uD7A3]{2,4}\s*(?:\([^)]*\))?\s*)+)"
)

# Individual name+role extractor
_NAME_ROLE = re.compile(r"([\uAC00-\uD7A3]{2,4})\s*(?:\(([^)]*)\))?")


def _strip_html(text: str) -> str:
    """Remove HTML tags and normalize whitespace."""
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"&nbsp;", " ", text)
    return text.strip()


def parse_judges(full_text: str) -> list[ParsedJudge]:
    """판례 본문에서 판사/대법관 정보를 추출한다.

    본문 마지막 1000자를 대상으로 파싱한다.
    """
    if not full_text:
        return []

    text = _strip_html(full_text)
    # Focus on the end of the document where judge names appear
    tail = text[-1000:]

    judges: list[ParsedJudge] = []

    # Try Supreme Court pattern first
    match = _SUPREME_FLEX.search(tail)
    if match:
        names_str = match.group(1)
        for m in _NAME_ROLE.finditer(names_str):
            name, role = m.group(1), m.group(2)
            judges.append(ParsedJudge(
                name=name,
                role=role,
                is_supreme=True,
            ))
        if judges:
            return _assign_default_roles(judges)

    # Try lower court pattern
    match = _JUDGE_LINE.search(tail)
    if match:
        names_str = match.group(1)
        for m in _NAME_ROLE.finditer(names_str):
            name, role = m.group(1), m.group(2)
            judges.append(ParsedJudge(
                name=name,
                role=role,
                is_supreme=False,
            ))
        if judges:
            return _assign_default_roles(judges)

    # Try old-style pattern (구형 판례)
    match = _OLD_STYLE.search(tail)
    if match:
        names_str = match.group(1)
        for m in _NAME_ROLE.finditer(names_str):
            name, role = m.group(1), m.group(2)
            judges.append(ParsedJudge(
                name=name,
                role=role,
                is_supreme="대법관" in match.group(0),
            ))
        if judges:
            return _assign_default_roles(judges)

    return judges


def _assign_default_roles(judges: list[ParsedJudge]) -> list[ParsedJudge]:
    """역할이 없는 판사에게 '배석' 역할을 부여한다."""
    for j in judges:
        if j.role is None:
            j.role = "배석"
    return judges
