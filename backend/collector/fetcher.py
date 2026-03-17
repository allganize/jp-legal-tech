import asyncio
import logging
from datetime import date

import aiohttp

from backend.config import settings

logger = logging.getLogger(__name__)


class LawAPIClient:
    """법제처 Open API 클라이언트."""

    def __init__(self):
        self.base_url = settings.law_api_base
        self.oc = settings.law_api_oc
        self.semaphore = asyncio.Semaphore(settings.law_api_rate_limit)
        self.delay = settings.law_api_delay

    async def _request(self, session: aiohttp.ClientSession, url: str, params: dict) -> dict | None:
        """Rate-limited API request with retry."""
        async with self.semaphore:
            for attempt in range(3):
                try:
                    async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                        if resp.status == 200:
                            return await resp.json(content_type=None)
                        elif resp.status in (429, 503):
                            wait = (attempt + 1) * 5
                            logger.warning(f"Rate limited ({resp.status}), waiting {wait}s...")
                            await asyncio.sleep(wait)
                        else:
                            logger.error(f"API error {resp.status}: {url}")
                            return None
                except (aiohttp.ClientError, asyncio.TimeoutError) as e:
                    wait = (attempt + 1) * 3
                    logger.warning(f"Request failed ({e}), retry in {wait}s...")
                    await asyncio.sleep(wait)
            await asyncio.sleep(self.delay)
        return None

    async def search_cases(
        self, session: aiohttp.ClientSession, query: str = "*", page: int = 1, display: int = 100
    ) -> dict | None:
        """판례 목록 검색."""
        url = f"{self.base_url}/lawSearch.do"
        params = {
            "OC": self.oc,
            "target": "prec",
            "type": "JSON",
            "query": query,
            "display": display,
            "page": page,
        }
        return await self._request(session, url, params)

    async def fetch_case_detail(self, session: aiohttp.ClientSession, case_id: int) -> dict | None:
        """판례 본문 상세 조회."""
        url = f"{self.base_url}/lawService.do"
        params = {
            "OC": self.oc,
            "target": "prec",
            "type": "JSON",
            "ID": case_id,
        }
        data = await self._request(session, url, params)
        if data and "PrecService" in data:
            return data["PrecService"]
        return None


def parse_decision_date(date_str: str) -> date | None:
    """선고일자 문자열을 date로 변환. '20220819' 또는 '2022.08.19' 형식."""
    if not date_str:
        return None
    cleaned = date_str.replace(".", "").strip()
    if len(cleaned) == 8 and cleaned.isdigit():
        try:
            return date(int(cleaned[:4]), int(cleaned[4:6]), int(cleaned[6:8]))
        except ValueError:
            return None
    return None
