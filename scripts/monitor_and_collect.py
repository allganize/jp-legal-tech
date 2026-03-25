"""수집 진행 모니터링 + detail 수집 완료 후 추가 파싱 실행."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import time
import logging
import requests

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(message)s')
logger = logging.getLogger(__name__)

API = "http://localhost:8000/api"


def get_db_stats():
    """직접 DB에서 현황 조회."""
    import sqlite3
    conn = sqlite3.connect('data/machu-picchu.db')
    cur = conn.cursor()
    total = cur.execute('SELECT COUNT(*) FROM cases').fetchone()[0]
    detail = cur.execute('SELECT COUNT(*) FROM cases WHERE detail_fetched = 1').fetchone()[0]
    fulltext = cur.execute('SELECT COUNT(*) FROM cases WHERE full_text IS NOT NULL AND full_text != ""').fetchone()[0]
    judge_info = cur.execute('SELECT COUNT(*) FROM cases WHERE has_judge_info = 1').fetchone()[0]
    parsed = cur.execute("SELECT COUNT(*) FROM cases WHERE parsed_outcome IS NOT NULL AND parsed_outcome != ''").fetchone()[0]
    judges = cur.execute('SELECT COUNT(*) FROM judges').fetchone()[0]
    conn.close()
    return {
        'total': total, 'detail': detail, 'fulltext': fulltext,
        'judge_info': judge_info, 'parsed': parsed, 'judges': judges
    }


def monitor():
    last_detail = 0
    stall_count = 0

    while True:
        stats = get_db_stats()
        remaining = stats['total'] - stats['detail']

        logger.info(
            f"상세수집: {stats['detail']:,}/{stats['total']:,} ({stats['detail']/stats['total']*100:.1f}%) | "
            f"본문: {stats['fulltext']:,} | 판사파싱: {stats['judge_info']:,} | "
            f"결과파싱: {stats['parsed']:,} | 판사: {stats['judges']:,} | "
            f"미수집: {remaining:,}"
        )

        # Check if detail collection is stalled
        if stats['detail'] == last_detail:
            stall_count += 1
            if stall_count >= 3:
                logger.warning("수집이 멈춘 것 같습니다. 재시작 시도...")
                try:
                    r = requests.post(f"{API}/collection/start/detail", timeout=10)
                    logger.info(f"재시작 응답: {r.text[:100]}")
                    stall_count = 0
                except Exception as e:
                    logger.error(f"재시작 실패: {e}")
        else:
            stall_count = 0
        last_detail = stats['detail']

        # 증분 파싱: 미파싱 500건 이상이면 즉시 실행
        unparsed_judges = stats['fulltext'] - stats['judge_info']
        unparsed_outcomes = stats['fulltext'] - stats['parsed']
        if unparsed_judges > 500 or unparsed_outcomes > 500:
            logger.info(f"증분 파싱 시작: 판사 {unparsed_judges}건, 결과 {unparsed_outcomes}건 미파싱")
            from scripts.run_parse import run_judge_parse, run_outcome_parse
            if unparsed_judges > 500:
                run_judge_parse()
            if unparsed_outcomes > 500:
                run_outcome_parse()

        # If all collected, trigger parse and exit
        if remaining == 0:
            logger.info("=== 상세 수집 100% 완료! ===")
            logger.info("파싱 단계 시작...")
            from scripts.run_parse import run_judge_parse, run_outcome_parse
            run_judge_parse()
            run_outcome_parse()

            # Final stats
            final = get_db_stats()
            logger.info(f"=== 최종 현황 ===")
            logger.info(f"전체: {final['total']:,} | 본문: {final['fulltext']:,} | 판사파싱: {final['judge_info']:,} | 결과파싱: {final['parsed']:,}")
            break

        time.sleep(60)  # 1분마다 체크


if __name__ == "__main__":
    monitor()
