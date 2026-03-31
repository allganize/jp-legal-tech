"""Japanese era ↔ AD date conversion utilities."""

from datetime import date

ERA_OFFSETS: dict[str, int] = {
    "Meiji": 1867,
    "Taisho": 1911,
    "Showa": 1925,
    "Heisei": 1988,
    "Reiwa": 2018,
}

ERA_KANJI: dict[str, str] = {
    "Meiji": "明治",
    "Taisho": "大正",
    "Showa": "昭和",
    "Heisei": "平成",
    "Reiwa": "令和",
}

_KANJI_TO_ROMAJI: dict[str, str] = {v: k for k, v in ERA_KANJI.items()}


def era_to_date(era: str, year: int, month: int | None = None, day: int | None = None) -> date | None:
    """Convert Japanese era date to Python date.

    Args:
        era: Romaji era name ("Reiwa") or kanji ("令和").
        year: Year within the era (1-based).
        month: Month (1-12). If None, defaults to 1.
        day: Day (1-31). If None, defaults to 1.

    Returns:
        datetime.date or None if conversion fails.
    """
    if era in _KANJI_TO_ROMAJI:
        era = _KANJI_TO_ROMAJI[era]

    offset = ERA_OFFSETS.get(era)
    if offset is None:
        return None

    ad_year = offset + year
    m = month or 1
    d = day or 1

    try:
        return date(ad_year, m, d)
    except ValueError:
        return None


def date_to_era_string(d: date) -> str:
    """Convert AD date to Japanese era display string (e.g. '令和7年3月31日').

    Uses 元年 for the first year of each era.
    """
    for era_romaji in reversed(list(ERA_OFFSETS.keys())):
        offset = ERA_OFFSETS[era_romaji]
        era_year = d.year - offset
        if era_year >= 1:
            kanji = ERA_KANJI[era_romaji]
            year_str = "元" if era_year == 1 else str(era_year)
            return f"{kanji}{year_str}年{d.month}月{d.day}日"
    return f"{d.year}年{d.month}月{d.day}日"
