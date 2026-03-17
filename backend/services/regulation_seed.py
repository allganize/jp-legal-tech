"""규제 에이전트 Mock 데이터 시딩."""

import json
from datetime import date, datetime

from sqlalchemy.orm import Session

from backend.models import Client, ClientImpact, RegulationItem


def _already_seeded(db: Session) -> bool:
    return db.query(RegulationItem).first() is not None


REGULATIONS = [
    # ── AI규제 ──
    {
        "title": "인공지능 기본법 시행령(안) 입법예고",
        "source": "과학기술정보통신부",
        "category": "AI규제",
        "reg_type": "입법예고",
        "impact_level": "높음",
        "summary": "고위험 AI 시스템의 분류 기준, 영향평가 의무, 인증 절차 등 인공지능 기본법의 세부 시행 사항을 규정하는 시행령안이 입법예고되었다.",
        "detail_text": "인공지능 기본법(2025.1.21. 시행)에 따라 고위험 AI 시스템을 ① 생명·신체 안전, ② 기본권 침해, ③ 사회적 차별 초래 가능성 기준으로 분류하고, 해당 AI의 개발·운영자에게 사전 영향평가, 위험관리체계 구축, 투명성 보고서 제출 의무를 부과한다. 금융·의료·채용 분야 AI 서비스는 고위험으로 분류될 가능성이 높다.",
        "published_date": date(2026, 2, 15),
        "effective_date": date(2026, 8, 1),
        "lifecycle_stage": "입법예고",
        "affected_industries": ["AI/SaaS", "핀테크"],
        "affected_licenses": [],
        "affected_services": ["AI 신용평가", "AI 추천", "생성형 AI", "AI OCR", "AI STT", "대화형 AI", "AI 검색", "AI 심사"],
    },
    {
        "title": "AI 기반 금융서비스 감독 가이드라인",
        "source": "금융위원회",
        "category": "AI규제",
        "reg_type": "가이드라인",
        "impact_level": "높음",
        "summary": "금융회사의 AI 모델 활용 시 설명가능성(XAI), 공정성 검증, 모델 리스크 관리(MRM) 프레임워크 도입을 권고하는 감독 가이드라인이 공표되었다.",
        "detail_text": "금융회사 및 전자금융업자가 AI를 활용한 신용평가, 투자추천, 보험심사, 이상거래탐지 등 금융서비스를 제공할 때 ① AI 모델의 의사결정 근거를 고객에게 설명할 수 있는 체계(XAI) 구축, ② 성별·연령·지역 등에 의한 차별 여부 사전·사후 점검, ③ 모델 검증·모니터링·폐기까지의 생애주기 관리 체계(MRM) 수립을 의무화한다.",
        "published_date": date(2026, 1, 20),
        "effective_date": None,
        "lifecycle_stage": "시행",
        "affected_industries": ["핀테크"],
        "affected_licenses": ["전자금융업", "여신금융업", "보험대리점"],
        "affected_services": ["AI 신용평가", "AI 추천", "AI 심사", "간편결제"],
    },
    {
        "title": "생성형 AI 이용자 보호 가이드라인 개정",
        "source": "방송통신위원회",
        "category": "AI규제",
        "reg_type": "가이드라인",
        "impact_level": "중간",
        "summary": "생성형 AI 서비스의 허위정보 생성 방지, 딥페이크 표시 의무, 미성년자 보호 조치 등을 강화하는 가이드라인 개정안이 발표되었다.",
        "detail_text": "생성형 AI 서비스 사업자에 대해 ① AI 생성 콘텐츠(AIGC) 워터마크 삽입 의무, ② 딥페이크 콘텐츠 자동 탐지·차단 시스템 구축, ③ 미성년자 대상 서비스 제한 및 보호자 동의 절차 강화, ④ 허위정보 생성에 대한 사업자 책임 범위 확대 등을 규정한다.",
        "published_date": date(2026, 3, 1),
        "effective_date": date(2026, 6, 1),
        "lifecycle_stage": "시행령공포",
        "affected_industries": ["AI/SaaS"],
        "affected_licenses": [],
        "affected_services": ["생성형 AI", "대화형 AI", "생성형 AI 서비스", "AI 검색"],
    },
    {
        "title": "AI 윤리 자율점검표 시행 안내",
        "source": "과학기술정보통신부",
        "category": "AI규제",
        "reg_type": "가이드라인",
        "impact_level": "낮음",
        "summary": "AI 개발·운영 기업이 자율적으로 윤리 기준 준수 여부를 점검할 수 있는 표준 체크리스트와 시행 안내서가 배포되었다.",
        "detail_text": "67개 항목의 자율점검표를 통해 AI 서비스의 투명성, 공정성, 안전성, 책임성 등 4대 원칙 준수 여부를 자가 진단하고, 점검 결과를 연 1회 공시하도록 권고한다.",
        "published_date": date(2026, 3, 10),
        "effective_date": None,
        "lifecycle_stage": "시행",
        "affected_industries": ["AI/SaaS"],
        "affected_licenses": [],
        "affected_services": ["AI 인프라", "클라우드 GPU", "MLOps", "생성형 AI"],
    },
    # ── 데이터보호 ──
    {
        "title": "개인정보 보호법 시행령 일부개정령(안)",
        "source": "개인정보보호위원회",
        "category": "데이터보호",
        "reg_type": "시행령",
        "impact_level": "높음",
        "summary": "자동화된 의사결정에 대한 정보주체의 거부권·설명요구권 행사 절차와 개인정보 국외이전 시 적정성 평가 기준을 구체화하는 시행령 개정안이 공포되었다.",
        "detail_text": "① 프로파일링 등 자동화된 의사결정에 대해 정보주체가 거부·설명을 요구할 수 있는 권리의 행사 방법과 사업자 대응 기한(30일 이내)을 규정, ② 개인정보 국외이전 적정성 평가 시 이전국의 법제, 독립적 감독기구 존재, 데이터 주체 구제 수단 등 6가지 기준을 명시, ③ 개인정보 처리방침의 공개 항목에 AI 활용 여부와 자동화 의사결정 적용 범위를 추가한다.",
        "published_date": date(2026, 1, 10),
        "effective_date": date(2026, 7, 1),
        "lifecycle_stage": "시행령공포",
        "affected_industries": ["핀테크", "AI/SaaS", "마이데이터", "데이터"],
        "affected_licenses": ["본인신용정보관리업", "신용정보업"],
        "affected_services": ["마이데이터", "AI 추천", "AI 신용평가", "스크래핑", "데이터 중계"],
    },
    {
        "title": "EU 적정성 결정 갱신 대응 가이드",
        "source": "개인정보보호위원회",
        "category": "데이터보호",
        "reg_type": "가이드라인",
        "impact_level": "중간",
        "summary": "EU-한국 간 개인정보 이전 적정성 결정 갱신 협상에 따른 국내 기업의 대응 사항을 안내하는 가이드가 발표되었다.",
        "detail_text": "EU 적정성 결정 갱신 시 ① GDPR 동등 수준의 DPO 지정 의무, ② 데이터 처리 활동 기록(ROPA) 관리, ③ 72시간 내 침해사고 통지 체계 구축 등이 요구될 수 있으며, 국내 기업의 사전 준비 사항을 안내한다.",
        "published_date": date(2026, 2, 20),
        "effective_date": None,
        "lifecycle_stage": "입법예고",
        "affected_industries": ["AI/SaaS", "데이터"],
        "affected_licenses": [],
        "affected_services": ["클라우드 GPU", "AI 인프라", "데이터 중계", "오픈API"],
    },
    {
        "title": "마이데이터 사업자 제재 — (주)OO데이터 과징금 3억원",
        "source": "개인정보보호위원회",
        "category": "데이터보호",
        "reg_type": "제재사례",
        "impact_level": "중간",
        "summary": "마이데이터 사업자 (주)OO데이터가 정보주체 동의 범위를 초과하여 금융정보를 제3자에게 제공한 혐의로 과징금 3억원이 부과되었다.",
        "detail_text": "해당 사업자는 본인신용정보관리업 인가를 받아 마이데이터 서비스를 운영하면서, 이용자 동의 시 명시하지 않은 항목(보험 가입 이력, 카드 사용 패턴)을 보험사·카드사에 마케팅 목적으로 제공한 사실이 적발되었다. 유사 사업 운영 기업의 동의 체계 재검토가 필요하다.",
        "published_date": date(2026, 2, 28),
        "effective_date": None,
        "lifecycle_stage": "시행",
        "affected_industries": ["마이데이터", "핀테크", "데이터"],
        "affected_licenses": ["본인신용정보관리업", "신용정보업"],
        "affected_services": ["마이데이터", "자산관리", "스크래핑", "데이터 중계", "마이데이터 연동"],
    },
    {
        "title": "가명정보 결합 전문기관 지정 고시 개정",
        "source": "개인정보보호위원회",
        "category": "데이터보호",
        "reg_type": "시행령",
        "impact_level": "낮음",
        "summary": "가명정보 결합 전문기관의 지정 요건과 결합 절차를 간소화하는 고시 개정안이 시행되었다.",
        "detail_text": "기존 6개월이던 결합 승인 절차를 3개월로 단축하고, 전문기관 지정 시 보안 시설 요건을 완화하여 중소 데이터 기업도 전문기관으로 지정받을 수 있도록 문턱을 낮췄다.",
        "published_date": date(2026, 3, 5),
        "effective_date": date(2026, 4, 1),
        "lifecycle_stage": "시행령공포",
        "affected_industries": ["데이터"],
        "affected_licenses": [],
        "affected_services": ["데이터 중계", "오픈API"],
    },
    # ── 금융규제 ──
    {
        "title": "금융분야 AI 활용 건전성 감독 규정(안)",
        "source": "금융감독원",
        "category": "금융규제",
        "reg_type": "입법예고",
        "impact_level": "높음",
        "summary": "금융회사의 AI 모델 활용에 대한 건전성 감독 기준을 신설하여, AI 기반 여신심사·투자추천 등에 대한 자본 적정성 및 리스크 관리 의무를 부과하는 규정안이 입법예고되었다.",
        "detail_text": "① AI 모델 기반 여신심사 시 모델 리스크 가중치(10~30%) 추가 적용, ② AI 투자추천·자문 서비스의 고객 적합성 평가 강화, ③ AI 이상거래탐지 시스템의 성능 기준(정밀도 95%+, 재현율 90%+) 설정, ④ AI 모델 변경 시 금감원 사전 보고 의무 등을 규정한다.",
        "published_date": date(2026, 2, 1),
        "effective_date": date(2026, 9, 1),
        "lifecycle_stage": "입법예고",
        "affected_industries": ["핀테크"],
        "affected_licenses": ["전자금융업", "여신금융업", "보험대리점", "대출모집법인"],
        "affected_services": ["AI 신용평가", "AI 심사", "투자", "보험", "대출비교"],
    },
    {
        "title": "전자금융거래법 전부개정법률안 국회 통과",
        "source": "금융위원회",
        "category": "금융규제",
        "reg_type": "시행령",
        "impact_level": "높음",
        "summary": "1차 전자금융업 허가제에서 등록제로 전환하고, 빅테크의 금융업 진출에 대한 규율 체계를 마련하는 전자금융거래법 전부개정안이 국회를 통과했다.",
        "detail_text": "① 전자금융업의 허가제→등록제 전환으로 진입 장벽 완화, ② 결제한도 상향(30만원→100만원), ③ 빅테크 자회사의 금융업 겸영 제한 규정 신설, ④ 전자금융사고 시 배상 책임 한도 상향, ⑤ 클라우드 기반 금융인프라 이용 기준 마련 등을 포함한다.",
        "published_date": date(2026, 1, 15),
        "effective_date": date(2026, 7, 15),
        "lifecycle_stage": "시행령공포",
        "affected_industries": ["핀테크"],
        "affected_licenses": ["전자금융업"],
        "affected_services": ["간편결제", "간편송금", "간편결제"],
    },
    {
        "title": "가상자산 이용자 보호법 시행령 개정안",
        "source": "금융위원회",
        "category": "금융규제",
        "reg_type": "시행령",
        "impact_level": "높음",
        "summary": "가상자산 사업자의 이용자 예치금 보호 의무, 불공정거래 규제, 시장 조성 기준 등을 강화하는 시행령 개정안이 공포되었다.",
        "detail_text": "① 이용자 예치금의 100% 콜드월렛 보관 의무(기존 80%), ② 내부자 거래·시세 조종 등 불공정 거래에 대한 과징금 상한 50억원으로 상향, ③ 토큰 상장 심사 기준 강화(백서 검증, 유동성 기준), ④ 사업자 보험 가입 의무화 등을 규정한다.",
        "published_date": date(2026, 3, 1),
        "effective_date": date(2026, 9, 1),
        "lifecycle_stage": "시행령공포",
        "affected_industries": ["가상자산"],
        "affected_licenses": ["가상자산사업자"],
        "affected_services": ["가상자산거래", "커스터디"],
    },
    {
        "title": "OO증권 내부통제 미비 제재 — 과태료 5억원",
        "source": "금융감독원",
        "category": "금융규제",
        "reg_type": "제재사례",
        "impact_level": "중간",
        "summary": "OO증권이 AI 기반 투자추천 시스템의 내부통제 체계 미비로 부적합 투자권유가 발생하여 과태료 5억원이 부과되었다.",
        "detail_text": "해당 증권사는 AI 로보어드바이저를 통한 투자추천 시 고객 투자성향 평가를 형식적으로 운영하고, AI 모델의 추천 근거에 대한 내부 검증 절차가 부재하여 고위험 상품이 안정형 고객에게 추천된 사례가 다수 적발되었다.",
        "published_date": date(2026, 2, 10),
        "effective_date": None,
        "lifecycle_stage": "시행",
        "affected_industries": ["핀테크"],
        "affected_licenses": ["여신금융업", "보험대리점"],
        "affected_services": ["투자", "AI 추천", "보험"],
    },
    # ── 전자금융 ──
    {
        "title": "전자금융업 인가 심사기준 강화 고시",
        "source": "금융위원회",
        "category": "전자금융",
        "reg_type": "시행령",
        "impact_level": "높음",
        "summary": "전자금융업자의 인가·갱신 심사 시 IT 보안 인력 기준, 자본금 요건, BCP(업무연속성계획) 수립 의무 등이 대폭 강화되었다.",
        "detail_text": "① IT 보안 전담 인력 최소 3명 → 5명으로 상향, ② 자본금 요건 10억 → 30억으로 상향, ③ 연 1회 이상 모의 해킹 테스트 의무화, ④ 재해복구센터(DR) 구축 의무 등을 규정. 기존 인가 사업자도 2년 내 기준 충족 필요.",
        "published_date": date(2026, 2, 25),
        "effective_date": date(2026, 8, 25),
        "lifecycle_stage": "시행령공포",
        "affected_industries": ["핀테크"],
        "affected_licenses": ["전자금융업"],
        "affected_services": ["간편결제", "간편송금"],
    },
    {
        "title": "오픈뱅킹 보안 강화 가이드라인",
        "source": "금융보안원",
        "category": "전자금융",
        "reg_type": "가이드라인",
        "impact_level": "중간",
        "summary": "오픈뱅킹 API 이용 사업자의 보안 기준을 강화하여, API 인증·암호화·접근통제·모니터링 등 4대 영역의 필수 보안 요건을 제시하는 가이드라인이 발표되었다.",
        "detail_text": "① API 인증 시 mTLS + OAuth 2.0 필수 적용, ② 금융데이터 전송 시 AES-256 이상 암호화, ③ API 호출 빈도 제한(Rate Limiting) 및 이상 호출 탐지 시스템 구축, ④ API 접근 로그 5년 이상 보관 의무 등을 규정.",
        "published_date": date(2026, 1, 25),
        "effective_date": None,
        "lifecycle_stage": "시행",
        "affected_industries": ["핀테크", "데이터"],
        "affected_licenses": ["전자금융업", "신용정보업"],
        "affected_services": ["오픈API", "스크래핑", "간편결제", "간편송금", "마이데이터 연동"],
    },
    {
        "title": "간편결제 분쟁조정 사례집 발간",
        "source": "금융감독원",
        "category": "전자금융",
        "reg_type": "가이드라인",
        "impact_level": "낮음",
        "summary": "최근 3년간 간편결제 관련 소비자 분쟁조정 사례 50건을 분석·정리한 사례집이 발간되었다.",
        "detail_text": "무단결제, 결제 취소·환불 지연, 포인트 소멸, 결제 한도 초과 등 주요 분쟁 유형별 조정 결과와 사업자 대응 권고사항을 정리. 간편결제 사업자의 이용약관·CS 프로세스 점검에 참고 자료로 활용 가능.",
        "published_date": date(2026, 3, 8),
        "effective_date": None,
        "lifecycle_stage": "시행",
        "affected_industries": ["핀테크"],
        "affected_licenses": ["전자금융업"],
        "affected_services": ["간편결제"],
    },
]

CLIENTS = [
    {
        "company_name": "네이버파이낸셜",
        "industry": "핀테크",
        "licenses": json.dumps(["전자금융업", "신용정보업"], ensure_ascii=False),
        "services": json.dumps(["간편결제", "마이데이터", "AI 신용평가"], ensure_ascii=False),
        "assigned_lawyer": "김민수",
    },
    {
        "company_name": "카카오페이",
        "industry": "핀테크",
        "licenses": json.dumps(["전자금융업", "보험대리점"], ensure_ascii=False),
        "services": json.dumps(["간편결제", "보험", "투자"], ensure_ascii=False),
        "assigned_lawyer": "김민수",
    },
    {
        "company_name": "뱅크샐러드",
        "industry": "마이데이터",
        "licenses": json.dumps(["본인신용정보관리업"], ensure_ascii=False),
        "services": json.dumps(["마이데이터", "자산관리", "AI 추천"], ensure_ascii=False),
        "assigned_lawyer": "박지영",
    },
    {
        "company_name": "업비트(두나무)",
        "industry": "가상자산",
        "licenses": json.dumps(["가상자산사업자"], ensure_ascii=False),
        "services": json.dumps(["가상자산거래", "커스터디"], ensure_ascii=False),
        "assigned_lawyer": "박지영",
    },
    {
        "company_name": "래블업",
        "industry": "AI/SaaS",
        "licenses": json.dumps([], ensure_ascii=False),
        "services": json.dumps(["AI 인프라", "클라우드 GPU", "MLOps"], ensure_ascii=False),
        "assigned_lawyer": "이준호",
    },
    {
        "company_name": "스켈터랩스",
        "industry": "AI/SaaS",
        "licenses": json.dumps([], ensure_ascii=False),
        "services": json.dumps(["생성형 AI", "대화형 AI", "AI 검색"], ensure_ascii=False),
        "assigned_lawyer": "이준호",
    },
    {
        "company_name": "토스(비바리퍼블리카)",
        "industry": "핀테크",
        "licenses": json.dumps(["전자금융업", "여신금융업", "보험대리점"], ensure_ascii=False),
        "services": json.dumps(["간편송금", "간편결제", "증권", "보험", "대출"], ensure_ascii=False),
        "assigned_lawyer": "김민수",
    },
    {
        "company_name": "쿠콘",
        "industry": "데이터",
        "licenses": json.dumps(["신용정보업"], ensure_ascii=False),
        "services": json.dumps(["스크래핑", "오픈API", "데이터 중계"], ensure_ascii=False),
        "assigned_lawyer": "최서연",
    },
    {
        "company_name": "마인즈랩",
        "industry": "AI/SaaS",
        "licenses": json.dumps([], ensure_ascii=False),
        "services": json.dumps(["AI OCR", "AI STT", "생성형 AI 서비스"], ensure_ascii=False),
        "assigned_lawyer": "이준호",
    },
    {
        "company_name": "핀다",
        "industry": "핀테크",
        "licenses": json.dumps(["대출모집법인"], ensure_ascii=False),
        "services": json.dumps(["대출비교", "AI 심사", "마이데이터 연동"], ensure_ascii=False),
        "assigned_lawyer": "최서연",
    },
]


def _compute_impact(reg_data: dict, client_data: dict) -> tuple[int, list[str]]:
    """규제-클라이언트 영향도를 계산한다. (score, reasons) 반환."""
    score = 0
    reasons = []

    client_industry = client_data["industry"]
    client_licenses = json.loads(client_data["licenses"]) if client_data["licenses"] else []
    client_services = json.loads(client_data["services"]) if client_data["services"] else []

    # 업종 매칭 (+40)
    if client_industry in reg_data.get("affected_industries", []):
        score += 40
        reasons.append(f"업종 직접 해당 ({client_industry})")

    # 라이선스 매칭 (+30)
    affected_licenses = reg_data.get("affected_licenses", [])
    matched_licenses = [lic for lic in client_licenses if lic in affected_licenses]
    if matched_licenses:
        score += 30
        reasons.append(f"보유 라이선스 해당 ({', '.join(matched_licenses)})")

    # 서비스 매칭 (+20)
    affected_services = reg_data.get("affected_services", [])
    matched_services = [svc for svc in client_services if svc in affected_services]
    if matched_services:
        score += 20
        reasons.append(f"서비스 영역 해당 ({', '.join(matched_services)})")

    # 동일 광역 섹터 보너스 (+10)
    broad_sector_map = {
        "핀테크": ["금융규제", "전자금융", "AI규제"],
        "마이데이터": ["데이터보호", "금융규제"],
        "가상자산": ["금융규제"],
        "AI/SaaS": ["AI규제", "데이터보호"],
        "데이터": ["데이터보호"],
    }
    if reg_data["category"] in broad_sector_map.get(client_industry, []):
        if score == 0:  # 다른 매칭이 없을 때만
            score += 10
            reasons.append(f"관련 섹터 ({client_industry} ↔ {reg_data['category']})")

    return score, reasons


def seed_regulation_data(db: Session) -> bool:
    """Mock 규제 데이터를 삽입한다. 이미 있으면 스킵. 성공 시 True."""
    if _already_seeded(db):
        return False

    # 1) 규제 항목 삽입
    reg_objects = []
    for r in REGULATIONS:
        reg = RegulationItem(
            title=r["title"],
            source=r["source"],
            category=r["category"],
            reg_type=r["reg_type"],
            impact_level=r["impact_level"],
            summary=r["summary"],
            detail_text=r["detail_text"],
            published_date=r["published_date"],
            effective_date=r.get("effective_date"),
            lifecycle_stage=r["lifecycle_stage"],
            reference_url=r.get("reference_url"),
        )
        db.add(reg)
        reg_objects.append((reg, r))
    db.flush()  # ID 생성

    # 2) 클라이언트 삽입
    client_objects = []
    for c in CLIENTS:
        client = Client(
            company_name=c["company_name"],
            industry=c["industry"],
            licenses=c["licenses"],
            services=c["services"],
            assigned_lawyer=c["assigned_lawyer"],
        )
        db.add(client)
        client_objects.append((client, c))
    db.flush()

    # 3) 영향 매핑 계산·삽입
    for reg, reg_data in reg_objects:
        for client, client_data in client_objects:
            score, reasons = _compute_impact(reg_data, client_data)
            if score > 0:
                action = "긴급 대응" if score >= 70 else ("통지 필요" if score >= 40 else "검토 필요")
                db.add(ClientImpact(
                    regulation_id=reg.id,
                    client_id=client.id,
                    impact_score=score,
                    impact_reasons=json.dumps(reasons, ensure_ascii=False),
                    action_type=action,
                ))

    db.commit()
    return True
