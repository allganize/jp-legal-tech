"""초기 데이터 수집 테스트: 소규모 수집 후 파이프라인 검증."""
import asyncio
import sys

import aiohttp

sys.path.insert(0, ".")
from backend.collector.fetcher import LawAPIClient, parse_decision_date
from backend.collector.parser import parse_judges
from backend.database import SessionLocal, init_db
from backend.models import Case, CaseJudge, Judge


async def seed(pages: int = 3, display: int = 100):
    """Search API에서 소규모 수집 후 상세+파싱까지."""
    init_db()
    client = LawAPIClient()
    db = SessionLocal()

    async with aiohttp.ClientSession() as session:
        # Phase A: Search
        total_saved = 0
        for page in range(1, pages + 1):
            result = await client.search_cases(session, query="*", page=page, display=display)
            if not result or "PrecSearch" not in result:
                break

            prec_search = result["PrecSearch"]
            items = prec_search.get("prec", prec_search)
            if not isinstance(items, list):
                items = [items]

            total_cnt = prec_search.get("totalCnt", "?")

            for item in items:
                case_id = int(item.get("판례일련번호", 0))
                if not case_id or db.get(Case, case_id):
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
                total_saved += 1

            db.commit()
            print(f"Search page {page}: +{len(items)} cases (total in DB: {total_saved}, API total: {total_cnt})")

        # Phase B: Detail fetch (first 50 cases)
        cases = db.query(Case).filter(Case.detail_fetched == False).limit(50).all()  # noqa
        detail_count = 0
        for case in cases:
            detail = await client.fetch_case_detail(session, case.id)
            if detail:
                case.summary = detail.get("판시사항")
                case.ruling_gist = detail.get("판결요지")
                case.reference_articles = detail.get("참조조문")
                case.reference_cases = detail.get("참조판례")
                case.full_text = detail.get("판례내용")
            case.detail_fetched = True
            detail_count += 1
        db.commit()
        print(f"\nDetail fetched: {detail_count} cases")

        # Phase C: Parse judges
        cases_with_text = db.query(Case).filter(
            Case.detail_fetched == True,
            Case.has_judge_info == False,
            Case.full_text.isnot(None),
        ).all()

        parse_success = 0
        for case in cases_with_text:
            judges = parse_judges(case.full_text)
            if judges:
                for pj in judges:
                    # Simple get or create
                    judge = db.query(Judge).filter(
                        Judge.name == pj.name,
                        Judge.court_name == case.court_name,
                    ).first()
                    if not judge:
                        judge = Judge(
                            name=pj.name,
                            court_name=case.court_name,
                            is_supreme_court=pj.is_supreme,
                            first_seen_date=case.decision_date,
                            last_seen_date=case.decision_date,
                        )
                        db.add(judge)
                        db.flush()
                    else:
                        if case.decision_date:
                            if not judge.first_seen_date or case.decision_date < judge.first_seen_date:
                                judge.first_seen_date = case.decision_date
                            if not judge.last_seen_date or case.decision_date > judge.last_seen_date:
                                judge.last_seen_date = case.decision_date

                    existing = db.query(CaseJudge).filter(
                        CaseJudge.case_id == case.id, CaseJudge.judge_id == judge.id
                    ).first()
                    if not existing:
                        db.add(CaseJudge(case_id=case.id, judge_id=judge.id, role=pj.role))

                parse_success += 1
            case.has_judge_info = True

        db.commit()
        print(f"Parse: {parse_success}/{len(cases_with_text)} cases with judge info")

        # Summary
        total_cases = db.query(Case).count()
        total_judges = db.query(Judge).count()
        total_links = db.query(CaseJudge).count()
        print(f"\n=== Summary ===")
        print(f"Cases: {total_cases}")
        print(f"Judges: {total_judges}")
        print(f"Case-Judge links: {total_links}")

        # Show some judges
        top_judges = (
            db.query(Judge.name, Judge.court_name, db.query(CaseJudge).filter(CaseJudge.judge_id == Judge.id).count())
        )
        # Simpler query
        from sqlalchemy import func
        top = db.query(
            Judge.name, Judge.court_name, func.count(CaseJudge.case_id).label("cnt")
        ).join(CaseJudge).group_by(Judge.id).order_by(func.count(CaseJudge.case_id).desc()).limit(10).all()

        print(f"\nTop 10 judges:")
        for name, court, cnt in top:
            print(f"  {name} ({court}): {cnt}건")

    db.close()


if __name__ == "__main__":
    pages = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    asyncio.run(seed(pages))
