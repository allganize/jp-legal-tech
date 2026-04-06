"""Tests for fact visualization service — pure functions and API error handling."""

import pytest

from backend.services.fact_viz_service import extract_fact_section


class TestExtractFactSection:
    """Test regex-based fact section extraction."""

    def test_with_explicit_fact_header(self):
        text = """主文
被告は原告に対し、金500万円を支払え。

事実
原告は平成30年4月1日、被告との間で売買契約を締結した。被告は東京都新宿区において不動産仲介業を営む株式会社である。
被告は同年6月15日、代金の支払を怠った。原告は再三にわたり支払を催告したが、被告はこれに応じなかった。
原告は令和元年8月1日、本件訴訟を提起した。原告は訴状において、売買代金500万円及びこれに対する遅延損害金の支払を求めた。

理由
当裁判所は以下のとおり判断する。"""
        result = extract_fact_section(text)
        assert "原告は平成30年4月1日" in result
        assert "被告は同年6月15日" in result
        # Should NOT include 理由 section
        assert "当裁判所は以下のとおり判断する" not in result

    def test_with_combined_fact_and_reason_header(self):
        text = """主文
原告の請求を棄却する。

事実及び理由
第1 請求
原告は被告に対し、金1000万円の支払を求める。
第2 事案の概要
本件は雇用契約に関する紛争である。

結論
以上のとおり、原告の請求には理由がない。"""
        result = extract_fact_section(text)
        assert "本件は雇用契約に関する紛争" in result

    def test_fallback_when_no_fact_header(self):
        """When no 事実 section header exists, fallback should use gist + case_gist + text."""
        text = "被告は金100万円を支払え。" * 100
        gist = "賃貸借契約の解除に関する判示"
        case_gist = "本件は建物賃貸借契約に関する紛争"
        result = extract_fact_section(text, gist=gist, case_gist=case_gist)
        assert "判示事項" in result
        assert "賃貸借契約の解除" in result
        assert "裁判要旨" in result
        assert "建物賃貸借契約" in result

    def test_empty_full_text_with_gist(self):
        result = extract_fact_section("", gist="判示事項テスト", case_gist="要旨テスト")
        assert "判示事項テスト" in result
        assert "要旨テスト" in result

    def test_empty_everything(self):
        result = extract_fact_section("", gist=None, case_gist=None)
        assert result == ""

    def test_max_length_limit(self):
        """Extracted section should not exceed 10,000 characters."""
        long_fact = "事実\n" + "これは長いテスト文です。" * 2000 + "\n理由\n判断します。"
        result = extract_fact_section(long_fact)
        assert len(result) <= 10000
