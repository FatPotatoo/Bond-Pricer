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

def scrape_ccil_quotes():
    """
    Launches headless Chromium, navigates to CCIL RBI NDS-OM market watch,
    and extracts live clean prices and yields.
    """
    print("Launching headless browser to fetch live quotes...")
    
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        url = "https://www.ccilindia.com/web/ccil/rbi-nds-om1"
        
        try:
            page.goto(url, timeout=30000)
            
            # Wait for any liferay portlet content to load in the DOM
            # The market tables are dynamic, so we wait for the portlet wrapper
            page.wait_for_selector(".liferay-portlet-content", timeout=20000)
            
            # Give dynamic Javascript an extra 2 seconds to fetch quotes and build rows
            page.wait_for_timeout(2000)
            
            html = page.content()
            soup = BeautifulSoup(html, "html.parser")
            
            # Locate all tables inside the NDS-OM portlets
            tables = soup.find_all("table")
            print(f"Scraped page. Found {len(tables)} tables in rendered DOM.")
            
            extracted_prices = {}
            
            for t_idx, table in enumerate(tables):
                # Search inside table rows
                rows = table.find_all("tr")
                if len(rows) < 2:
                    continue
                
                # Check headers to align columns dynamically
                headers = [th.get_text(strip=True).lower() for th in rows[0].find_all(["th", "td"])]
                
                # Default indices
                isin_idx = -1
                price_idx = -1
                yield_idx = -1
                
                for idx, h in enumerate(headers):
                    if "isin" in h:
                        isin_idx = idx
                    elif "price" in h:
                        price_idx = idx
                    elif "yield" in h or "ytm" in h:
                        yield_idx = idx
                
                # Fallbacks if columns are not named in a standard table header
                if isin_idx == -1:
                    # Let's check if the first row has standard length and we can guess
                    # Under CCIL: Column 1 is Sr No., Column 2 is ISIN, Column 3 is Description, etc.
                    isin_idx = 1
                    price_idx = 5 if len(headers) > 5 else -1
                    yield_idx = 6 if len(headers) > 6 else -1
                
                # Parse rows
                for r_idx in range(1, len(rows)):
                    cells = rows[r_idx].find_all("td")
                    if len(cells) <= max(isin_idx, price_idx, yield_idx):
                        continue
                    
                    isin = cells[isin_idx].get_text(strip=True)
                    # Check if cell matches ISIN format (e.g. IN0020120039)
                    if re.match(r"^IN\d{10}$", isin):
                        price_str = cells[price_idx].get_text(strip=True) if price_idx != -1 else ""
                        yield_str = cells[yield_idx].get_text(strip=True) if yield_idx != -1 else ""
                        
                        try:
                            # Clean string values (remove commas, spaces, dashes)
                            clean_p = float(price_str.replace(",", "").replace("-", "").strip())
                            
                            # Clean yield values (e.g. remove %)
                            clean_y = float(yield_str.replace("%", "").replace("-", "").strip()) / 100.0
                            
                            extracted_prices[isin] = {
                                "cleanPrice": clean_p,
                                "ytm": clean_y
                            }
                        except (ValueError, TypeError):
                            # Skip rows with no trades/empty price quotes (e.g., "-" or "No Trade")
                            pass
            
            browser.close()
            return extracted_prices
            
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

    # 2. RUN EXTRACTION
    live_quotes = scrape_ccil_quotes()

    if live_quotes is None:
        print("Scraper failed to execute. Retaining previous price database.")
        sys.exit(1)
        
    if len(live_quotes) == 0:
        print("No active trade data available on the CCIL webpage (market is empty/closed).")
        print("Retaining previous price database. liveMarketData.json was NOT overwritten.")
        sys.exit(0)

    # 3. SUCCESSFUL INGESTION - UPDATE SQLite DATABASE
    print(f"Ingested {len(live_quotes)} active live quotes successfully!")
    
    # Establish connection to SQLite
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        # Disable journal syncing for high performance
        cursor.execute("PRAGMA synchronous = OFF")
        cursor.execute("PRAGMA journal_mode = MEMORY")
        
        # Batch insert live quotes & history
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
        print(f"Successfully updated live quotes and history in database: {DB_FILE}")
        
    except Exception as db_err:
        print(f"Failed to write to SQLite database: {db_err}")
        sys.exit(1)

if __name__ == "__main__":
    main()
