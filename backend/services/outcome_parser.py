"""판결문 원문(full_text)에서 판결 결과를 파싱한다.

결과값:
  원고승    — 원고 청구 인용 (지급하라, 인도하라, 이행하라, 말소 등)
  원고패    — 원고 청구 기각/항소 기각
  일부인용  — 청구 일부만 인용
  각하      — 소 각하
  파기환송  — 대법원이 원심 파기 후 환송
  파기자판  — 대법원이 원심 파기 후 직접 판결
  상고기각  — 대법원이 상고 기각 (원심 유지)
  상고각하  — 대법원이 상고 각하
"""

import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.models import Case


def backfill_court_names(db: Session) -> int:
    """case_number에서 법원명을 추출하여 빈 court_name을 채운다.

    case_number 형식: "서울행정법원-2023-구합-50424"
    """
    cases = db.execute(
        select(Case).where((Case.court_name.is_(None)) | (Case.court_name == ""))
    ).scalars().all()

    count = 0
    for case in cases:
        m = re.match(r"^(.+?)[-]\d{4}", case.case_number)
        if m:
            case.court_name = m.group(1)
            count += 1
    db.commit()
    return count

# 대법원 판단 패턴 (우선순위 순)
_SUPREME_PATTERNS: list[tuple[str, str]] = [
    (r"상고를\s*(모두\s*)?각하", "상고각하"),
    (r"파기.*?자판", "파기자판"),
    (r"(원심|원판결).*?파기.*?환송", "파기환송"),
    (r"파기하고.*?환송", "파기환송"),
    (r"상고를\s*(모두\s*)?기각", "상고기각"),
]

# 행정사건 decision_type 매핑
_ADMIN_MAPPING: dict[str, str] = {
    "처분청 패소": "원고승",
    "처분청 승소": "원고패",
    "처분청 일부 패소": "일부인용",
    "처분청 일부 승소": "일부인용",
}

# 하급심 주문 부분 패턴 (우선순위 순)
_LOWER_DISMISS = re.compile(r"(청구|신청)를?\s*(모두\s*)?각하")
_LOWER_REJECT = re.compile(r"(청구|항소|반소청구|신청|이의)를?\s*(모두\s*)?기각")
_LOWER_ACCEPT = re.compile(
    r"(지급하라|인도하라|이행하라|말소하라|말소|취소한다|취소하고"
    r"|무효로\s*한다|무효임을\s*확인|해제|해지|확인한다|배상하라|반환하라|인수하라)"
)

# 이유 섹션 마커 (공백 변형 포함)
_REASON_MARKERS = re.compile(r"【\s*이\s*유\s*】|▣\s*이\s*유")


def _extract_front(text: str) -> str:
    """판결문에서 이유 전까지(주문 포함)를 추출한다."""
    m = _REASON_MARKERS.search(text)
    if m:
        return text[:m.start()]
    # 이유 마커가 없으면 앞쪽 3000자
    return text[:3000]


def parse_outcome(case: Case) -> str | None:
    """단건 판결 결과를 파싱한다."""
    # 1) 행정사건: decision_type 매핑
    dt = (case.decision_type or "").strip()
    if dt in _ADMIN_MAPPING:
        return _ADMIN_MAPPING[dt]

    full = case.full_text or ""
    if not full:
        return None

    # 2) 대법원 (상고심)
    court = (case.court_name or "").strip()
    if court == "대법원" or "대법" in court:
        for pattern, outcome in _SUPREME_PATTERNS:
            if re.search(pattern, full):
                return outcome
        return None

    # 3) 하급심: 주문 부분에서 판단
    front = _extract_front(full)

    if _LOWER_DISMISS.search(front):
        return "각하"

    has_reject = bool(_LOWER_REJECT.search(front))
    has_accept = bool(_LOWER_ACCEPT.search(front))

    if has_reject and has_accept:
        return "일부인용"
    if has_reject:
        return "원고패"
    if has_accept:
        return "원고승"

    return None


def parse_all_outcomes(db: Session) -> dict[str, int]:
    """parsed_outcome이 NULL인 모든 케이스를 파싱한다.

    Returns:
        결과별 건수 딕셔너리
    """
    cases = db.execute(
        select(Case).where(Case.parsed_outcome.is_(None))
    ).scalars().all()

    stats: dict[str, int] = {}
    for case in cases:
        outcome = parse_outcome(case)
        if outcome:
            case.parsed_outcome = outcome
            stats[outcome] = stats.get(outcome, 0) + 1

    db.commit()

    total = len(cases)
    classified = sum(stats.values())
    stats["_total"] = total
    stats["_classified"] = classified
    stats["_unclassified"] = total - classified
    return stats
