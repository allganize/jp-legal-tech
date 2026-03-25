import asyncio
import logging
from datetime import datetime

import aiohttp
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.collector.fetcher import LawAPIClient, parse_decision_date
from backend.collector.parser import parse_judges
from backend.database import SessionLocal
from backend.models import Case, CaseJudge, CollectionProgress, Judge

logger = logging.getLogger(__name__)


class CollectionPipeline:
    """3-phase data collection pipeline with resume support."""

    def __init__(self):
        self.client = LawAPIClient()
        self._running = False

    @property
    def is_running(self) -> bool:
        return self._running

    def stop(self):
        self._running = False

    async def run_search_phase(self, query: str = "*", display: int = 100):
        """Phase A: Search API로 판례 메타데이터 수집."""
        self._running = True
        db = SessionLocal()
        try:
            # Get or create progress record
            progress = db.execute(
                select(CollectionProgress).where(
                    CollectionProgress.phase == "search",
                    CollectionProgress.query == query,
                )
            ).scalar_one_or_none()

            if not progress:
                progress = CollectionProgress(phase="search", query=query, page=0, status="in_progress")
                db.add(progress)
                db.commit()

            start_page = progress.page + 1

            async with aiohttp.ClientSession() as session:
                # First request to get total count
                if not progress.total_count:
                    result = await self.client.search_cases(session, query, page=1, display=1)
                    if result and "PrecSearch" in result:
                        progress.total_count = int(result["PrecSearch"].get("totalCnt", 0))
                        progress.total_pages = (progress.total_count + display - 1) // display
                        db.commit()
                        logger.info(f"Total cases: {progress.total_count}, pages: {progress.total_pages}")

                page = start_page
                while self._running and (progress.total_pages is None or page <= progress.total_pages):
                    result = await self.client.search_cases(session, query, page=page, display=display)
                    if not result or "PrecSearch" not in result:
                        logger.warning(f"No results for page {page}")
                        break

                    prec_search = result["PrecSearch"]
                    items = prec_search.get("prec", prec_search)
                    if not isinstance(items, list):
                        items = [items]

                    for item in items:
                        case_id = int(item.get("판례일련번호", 0))
                        if not case_id:
                            continue

                        existing = db.get(Case, case_id)
                        if existing:
                            continue

                        case = Case(
                            id=case_id,
                            case_number=item.get("사건번호", ""),
                            case_name=item.get("사건명"),
                            court_name=item.get("법원명"),
                            case_type_code=item.get("사건종류코드"),
                            case_type_name=item.get("사건종류명"),
                            decision_date=parse_decision_date(item.get("선고일자", "")),
                            decision_type=item.get("판결유형"),
                            pronouncement=item.get("선고"),
                            court_type_code=item.get("법원종류코드"),
                            data_source=item.get("데이터출처명"),
                        )
                        db.add(case)

                    progress.page = page
                    progress.last_fetched_at = datetime.now()
                    db.commit()

                    if page % 10 == 0:
                        logger.info(f"Search phase: page {page}/{progress.total_pages}")
                    page += 1

            if self._running:
                progress.status = "completed"
                db.commit()
                logger.info("Search phase completed")
        finally:
            self._running = False
            db.close()

    async def run_detail_phase(self, batch_size: int = 200):
        """Phase B: 상세 조회 (본문 가져오기) - 병렬."""
        self._running = True
        db = SessionLocal()
        try:
            async with aiohttp.ClientSession() as session:
                while self._running:
                    cases = db.execute(
                        select(Case).where(Case.detail_fetched == False).limit(batch_size)  # noqa: E712
                    ).scalars().all()

                    if not cases:
                        logger.info("Detail phase completed - no more cases to fetch")
                        break

                    # 병렬 fetch (semaphore가 동시 요청 수 제한)
                    tasks = [
                        self.client.fetch_case_detail(session, case.id)
                        for case in cases
                    ]
                    results = await asyncio.gather(*tasks, return_exceptions=True)

                    # DB 업데이트는 메인에서 순차 처리 (SQLAlchemy 안전)
                    for case, detail in zip(cases, results):
                        if isinstance(detail, Exception):
                            logger.warning(f"Failed to fetch case {case.id}: {detail}")
                            detail = None
                        if detail:
                            case.summary = detail.get("판시사항")
                            case.ruling_gist = detail.get("판결요지")
                            case.reference_articles = detail.get("참조조문")
                            case.reference_cases = detail.get("참조판례")
                            case.full_text = detail.get("판례내용")
                        case.detail_fetched = True

                    db.commit()

                    fetched_count = db.execute(
                        select(func.count()).select_from(Case).where(Case.detail_fetched == True)  # noqa: E712
                    ).scalar()
                    total_count = db.execute(select(func.count()).select_from(Case)).scalar()
                    logger.info(f"Detail phase: {fetched_count}/{total_count}")

        finally:
            self._running = False
            db.close()

    async def run_parse_phase(self, batch_size: int = 200):
        """Phase C: 판례 본문에서 판사 파싱 (배치 처리)."""
        self._running = True
        db = SessionLocal()
        try:
            parsed_count = 0
            while self._running:
                cases = db.execute(
                    select(Case).where(
                        Case.detail_fetched == True,  # noqa: E712
                        Case.has_judge_info == False,  # noqa: E712
                        Case.full_text.isnot(None),
                    ).limit(batch_size)
                ).scalars().all()

                if not cases:
                    break

                for case in cases:
                    if not self._running:
                        break

                    judges = parse_judges(case.full_text)
                    if judges:
                        for pj in judges:
                            judge = _get_or_create_judge(
                                db,
                                name=pj.name,
                                is_supreme=pj.is_supreme,
                                court_name=case.court_name,
                                decision_date=case.decision_date,
                            )
                            existing_link = db.execute(
                                select(CaseJudge).where(
                                    CaseJudge.case_id == case.id,
                                    CaseJudge.judge_id == judge.id,
                                )
                            ).scalar_one_or_none()
                            if not existing_link:
                                db.add(CaseJudge(case_id=case.id, judge_id=judge.id, role=pj.role))
                        parsed_count += 1

                    case.has_judge_info = True

                db.commit()
                logger.info(f"Parse phase: {parsed_count} cases parsed with judge info (batch)")

            logger.info(f"Parse phase completed: {parsed_count} cases with judge info")
        finally:
            self._running = False
            db.close()


def _get_or_create_judge(
    db: Session, name: str, is_supreme: bool, court_name: str | None, decision_date=None
) -> Judge:
    """Find existing judge or create new one."""
    # Simple matching: same name + same court = same person
    judge = db.execute(
        select(Judge).where(Judge.name == name, Judge.court_name == court_name)
    ).scalar_one_or_none()

    if judge:
        # Update date range
        if decision_date:
            if not judge.first_seen_date or decision_date < judge.first_seen_date:
                judge.first_seen_date = decision_date
            if not judge.last_seen_date or decision_date > judge.last_seen_date:
                judge.last_seen_date = decision_date
        return judge

    judge = Judge(
        name=name,
        court_name=court_name,
        is_supreme_court=is_supreme,
        first_seen_date=decision_date,
        last_seen_date=decision_date,
    )
    db.add(judge)
    db.flush()
    return judge


# Singleton pipeline instance
pipeline = CollectionPipeline()
