import datetime
import json
import os
import sys
import re
import argparse
import sqlite3
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup

# Path settings
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_FILE = os.path.join(BASE_DIR, "database", "bondiq.db")

def get_ist_time():
    """Returns the current datetime object in Indian Standard Time (IST)."""
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    ist_offset = datetime.timedelta(hours=5, minutes=30)
    return now_utc + ist_offset

def is_market_open(dt_ist):
    """
    Checks if the Indian G-Sec market is currently open.
    Trading hours: Monday to Friday, 9:00 AM to 5:00 PM IST (9:00 to 17:00).
    """
    # 0 = Monday, 6 = Sunday
    day_of_week = dt_ist.weekday()
    if day_of_week >= 5: # Saturday or Sunday
        return False
        
    hour = dt_ist.hour
    
    # 9:00 AM to 5:00 PM
    if hour >= 9 and hour < 17:
        return True
    return False

def normalize_db_name(name):
    """
    Normalizes database G-Sec nomenclatures to match CCIL patterns.
    E.g. '6.94% GS 2036' -> '06.94 GS 2036'
    E.g. '10.18% GS 2026' -> '10.18 GS 2026'
    E.g. '6.01% GS 2028 (C Align)' -> '06.01 GS 2028'
    """
    match = re.search(r'(\d+\.?\d*)\%\s+GS\s+(\d{4})', name)
    if match:
        coupon_val = float(match.group(1))
        year = match.group(2)
        return f"{coupon_val:05.2f} GS {year}"
    return None

def scrape_ccil_quotes(lookup_map):
    """
    Launches headless Chromium using a real-world User-Agent,
    navigates to CCIL NDS-OM market watch, and extracts G-Sec quotes.
    """
    print("Launching Chromium browser with custom User-Agent...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Bypassing CCIL WAF filters with real-world headers
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800}
        )
        page = context.new_page()
        url = "https://www.ccilindia.com/web/ccil/rbi-nds-om1"
        
        try:
            print(f"Navigating to {url}...")
            page.goto(url, wait_until="load", timeout=30000)
            
            # Select 100 entries dropdown option to bypass pagination and load all active quotes
            if page.query_selector('select[name="ndsomEntityTable_length"]'):
                page.select_option('select[name="ndsomEntityTable_length"]', "100")
                print("Changed page length option to 100 to load G-Sec rows.")
                page.wait_for_timeout(2000)
            else:
                page.wait_for_timeout(3000) # fallback wait if dropdown is not rendered
            
            # Scrape pages in a loop (handling pages 2+ if total rows exceed 100)
            all_pages_html = []
            has_next = True
            page_num = 1
            
            while has_next:
                print(f"Reading page {page_num} of NDS-OM watch...")
                all_pages_html.append(page.content())
                
                next_btn = page.query_selector('#ndsomEntityTable_next')
                if next_btn:
                    class_attr = next_btn.get_attribute("class") or ""
                    if "disabled" not in class_attr:
                        next_btn.click()
                        page.wait_for_timeout(1500) # wait for DOM table update
                        page_num += 1
                    else:
                        has_next = False
                else:
                    has_next = False
            
            browser.close()
            
            live_quotes = {}
            
            # Parse all accumulated pages
            for html in all_pages_html:
                soup = BeautifulSoup(html, "html.parser")
                tables = soup.find_all("table")
                
                for table in tables:
                    rows = table.find_all("tr")
                    if len(rows) < 2:
                        continue
                    
                    for r_idx in range(1, len(rows)):
                        cells = rows[r_idx].find_all("td")
                        if len(cells) < 10:
                            continue
                        
                        desc = cells[0].get_text(strip=True)
                        # Normalize whitespace spacing
                        desc_norm = " ".join(desc.split())
                        
                        if desc_norm in lookup_map:
                            isin = lookup_map[desc_norm]
                            price_str = cells[6].get_text(strip=True) # Column 6 is LTP
                            yield_str = cells[9].get_text(strip=True) # Column 9 is LTY
                            
                            try:
                                # Clean string values (remove commas, dashes, percent signs)
                                clean_price = float(price_str.replace(",", "").replace("-", "").strip())
                                # Convert yield to decimal (e.g. 6.7630% -> 0.06763)
                                clean_yield = float(yield_str.replace("%", "").replace("-", "").strip()) / 100.0
                                
                                live_quotes[isin] = {
                                    "cleanPrice": clean_price,
                                    "ytm": clean_yield
                                }
                            except (ValueError, TypeError):
                                # Skip rows with no trades/empty price quotes
                                pass
                            
            return live_quotes
            
        except Exception as e:
            print(f"Error during browser scraping: {e}")
            try:
                browser.close()
            except:
                pass
            return None

def main():
    parser = argparse.ArgumentParser(description="BondIQ NDS-OM Live Ingestion Service")
    parser.add_argument("--force", action="store_true", help="Force scrape even if the market is closed")
    args = parser.parse_args()

    # 1. TIMEZONE & HOURS CHECK
    ist_now = get_ist_time()
    time_str = ist_now.strftime('%Y-%m-%d %H:%M:%S IST')
    print(f"Running Ingestion Service at {time_str}")

    is_open = is_market_open(ist_now)
    if not is_open and not args.force:
        print("Market is currently CLOSED (offline). Ingestion suspended.")
        print("Closing the scheduled extraction to save resources.")
        sys.exit(0)

    # 2. LOAD DB SECURITIES LOOKUP
    if not os.path.exists(DB_FILE):
        print(f"Error: Database file not found at: {DB_FILE}. Run seeder first.")
        sys.exit(1)
        
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT isin, name FROM securities")
        db_securities = cursor.fetchall()
        conn.close()
    except Exception as db_err:
        print(f"Failed to read from SQLite database: {db_err}")
        sys.exit(1)
        
    # Build lookup map: normalized_name -> isin
    lookup_map = {}
    for isin, name in db_securities:
        norm = normalize_db_name(name)
        if norm:
            lookup_map[norm] = isin

    # 3. RUN PLAYWRIGHT EXTRACTION
    live_quotes = scrape_ccil_quotes(lookup_map)

    if live_quotes is None:
        print("Scraper failed to execute. Retaining previous price database.")
        sys.exit(1)
        
    if len(live_quotes) == 0:
        print("No active G-Sec trade quotes found in CCIL watch (market may be in opening/clearing cycle).")
        print("Retaining previous price database. SQLite records were NOT overwritten.")
        sys.exit(0)

    # 4. WRITE TRANSACTION TO SQLite
    print(f"Ingested {len(live_quotes)} active live quotes successfully!")
    
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        # Optimize performance
        cursor.execute("PRAGMA synchronous = OFF")
        cursor.execute("PRAGMA journal_mode = MEMORY")
        
        updated_time = ist_now.isoformat()
        date_str = ist_now.strftime('%Y-%m-%d')
        
        for isin, quote in live_quotes.items():
            # 1. Update live quote
            cursor.execute("""
                INSERT INTO live_quotes (isin, clean_price, ytm, last_updated)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(isin) DO UPDATE SET
                  clean_price = excluded.clean_price,
                  ytm = excluded.ytm,
                  last_updated = excluded.last_updated
            """, (isin, quote['cleanPrice'], quote['ytm'], updated_time))
            
            # 2. Update historical quote
            cursor.execute("""
                INSERT INTO historical_quotes (isin, quote_date, clean_price, ytm)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(isin, quote_date) DO UPDATE SET
                  clean_price = excluded.clean_price,
                  ytm = excluded.ytm
            """, (isin, date_str, quote['cleanPrice'], quote['ytm']))
            
        conn.commit()
        conn.close()
        print(f"Successfully updated SQLite live_quotes and historical_quotes inside: {DB_FILE}")
        
    except Exception as db_write_err:
        print(f"Failed to write quotes to SQLite database: {db_write_err}")
        sys.exit(1)

if __name__ == "__main__":
    main()
