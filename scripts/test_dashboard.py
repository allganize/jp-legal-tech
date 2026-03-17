"""Dashboard E2E test: take screenshots of key pages."""
from playwright.sync_api import sync_playwright

FRONTEND = "http://localhost:3000"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    page.set_default_timeout(60000)  # 60s for Next.js first compile

    # 1. Home page
    print("1. Home page...")
    page.goto(FRONTEND, timeout=60000)
    page.wait_for_timeout(3000)  # wait for hydration + API calls
    page.screenshot(path="/tmp/01_home.png", full_page=True)
    print("   -> /tmp/01_home.png")

    # 2. Search for a judge
    print("2. Searching '엄상필'...")
    search_input = page.locator("input[placeholder*='판사']")
    search_input.fill("엄상필")
    page.wait_for_timeout(2000)  # debounce + API call
    page.screenshot(path="/tmp/02_search_results.png", full_page=True)
    print("   -> /tmp/02_search_results.png")

    # 3. Navigate directly to judge profile page
    print("3. Judge profile page...")
    page.goto(f"{FRONTEND}/judge/8", timeout=60000)
    page.wait_for_timeout(3000)  # wait for charts to render
    page.screenshot(path="/tmp/03_judge_profile_top.png", full_page=False)
    print("   -> /tmp/03_judge_profile_top.png")

    # 4. Full page screenshot of judge profile
    page.screenshot(path="/tmp/04_judge_profile_full.png", full_page=True)
    print("   -> /tmp/04_judge_profile_full.png")

    # 5. Collection status panel
    print("5. Collection status panel...")
    page.goto(FRONTEND, timeout=60000)
    page.wait_for_timeout(2000)
    toggle = page.locator("button").filter(has_text="데이터 수집")
    if toggle.is_visible():
        toggle.click()
        page.wait_for_timeout(1000)
        page.screenshot(path="/tmp/05_collection.png", full_page=True)
        print("   -> /tmp/05_collection.png")

    browser.close()
    print("\nDone!")
