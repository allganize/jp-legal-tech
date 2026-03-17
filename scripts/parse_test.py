"""판사명 파서를 실제 API 데이터로 테스트."""
import asyncio
import json
import sys

import aiohttp

sys.path.insert(0, ".")
from backend.collector.fetcher import LawAPIClient
from backend.collector.parser import parse_judges


async def test_parser():
    client = LawAPIClient()

    # Test case IDs: mix of Supreme Court and lower courts
    test_ids = [228541, 200001, 200010, 200050, 200100, 200200, 200300, 200500, 201000, 210000]

    async with aiohttp.ClientSession() as session:
        for case_id in test_ids:
            detail = await client.fetch_case_detail(session, case_id)
            if not detail:
                print(f"[{case_id}] Failed to fetch")
                continue

            court = detail.get("법원명", "?")
            case_name = detail.get("사건명", "?")
            full_text = detail.get("판례내용", "")

            judges = parse_judges(full_text)

            if judges:
                judge_str = ", ".join(f"{j.name}({j.role})" for j in judges)
                print(f"[{case_id}] {court} | {case_name}")
                print(f"  → {judge_str}")
            else:
                # Show last 200 chars for debugging
                tail = full_text[-200:].replace("<br/>", "\n").strip() if full_text else "(no content)"
                print(f"[{case_id}] {court} | {case_name}")
                print(f"  → NO JUDGES PARSED")
                print(f"  tail: {tail[-100:]}")
            print()


if __name__ == "__main__":
    asyncio.run(test_parser())
