import asyncio
from database.connection import async_session
from services.scraper_service import scrape_market_news, parse_prices_with_ai, update_database_with_live_data

# Global state to track if we have new data to broadcast to SSE
has_new_data = False

async def background_market_worker():
    """Runs continuously, fetching live market data every 30 seconds."""
    global has_new_data
    print("[WORKER] Started background AI Live Data parser.")
    while True:
        try:
            print("[WORKER] Fetching live data from internet...")
            snippets = await scrape_market_news()
            
            print("[WORKER] Parsing data with AI...")
            parsed_data = await parse_prices_with_ai(snippets)
            
            if parsed_data:
                print(f"[WORKER] Found {len(parsed_data)} live price updates. Updating DB...")
                async with async_session() as db:
                    await update_database_with_live_data(db, parsed_data)
                has_new_data = True
            else:
                print("[WORKER] No data found this cycle.")
                
        except Exception as e:
            print(f"[WORKER] Error in background task: {e}")
            
        # Wait 30 seconds before next fetch to avoid rate limits
        await asyncio.sleep(30)
