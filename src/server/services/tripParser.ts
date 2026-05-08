import { chromium } from 'playwright-extra';
// @ts-ignore
import stealth from 'puppeteer-extra-plugin-stealth';

// Initialize stealth plugin to bypass basic bot detection
chromium.use(stealth());

export interface FlightData {
  id: string;
  type: 'flight';
  provider: string;
  title: string;
  price: number;
  currency: string;
  emoji: string;
  affiliate_url: string;
  details: {
    airline: string;
    departure: string;
    arrival: string;
    stops: number;
    duration: string;
  };
}

/**
 * Trip.com Flight Parser (POC)
 * Scrapes flight data using headles chromium and stealth plugin.
 */
export async function scrapeTripFlights(origin: string, destination: string, date: string): Promise<FlightData[]> {
  // Construct dynamic URL based on Trip.com's structure
  const url = `https://hk.trip.com/flights/${origin}-to-${destination}/tickets-${origin}-${destination}/?dcity=${origin}&acity=${destination}&ddate=${date}`;
  
  console.log(`Starting Playwright tripParser for: ${url}`);
  
  let browser;
  try {
    // Launch browser (this may require npx playwright install in production)
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });
    
    // Set realistic User-Agent and viewport
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1440, height: 900 },
      locale: 'zh-TW',
      timezoneId: 'Asia/Taipei',
    });
    
    const page = await context.newPage();
    
    console.log('Navigating to page...');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Simulate human interaction while loading
    await page.waitForTimeout(2000 + Math.random() * 1500);
    
    // Random scrolling to trigger lazy loading and show human behavior
    console.log('Simulating human mouse/scroll behavior...');
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(1000 + Math.random() * 1000);
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(1500);
    await page.mouse.wheel(0, -200);
    
    // Wait for the main flight list container to appear
    try {
      await page.waitForSelector('.flight-list, .Baggage-Card, .flight-item', { timeout: 10000 });
      console.log('Flight container detected, starting DOM parsing.');
    } catch (e) {
      console.log('Timeout waiting for flight container. Page structure might have changed or captcha triggered.');
      const pageTitle = await page.title();
      if (pageTitle.toLowerCase().includes('verify') || pageTitle.toLowerCase().includes('robot')) {
         throw new Error('觸發防爬蟲機制 (CAPTCHA 滑塊驗證查獲)');
      }
    }
    
    // Parse the DOM to extract flight items
    const rawFlights = await page.$$eval('.flight-item, .flight-card-container, div[data-testid="flight-card"], .o-flight-card', (nodes) => {
      return nodes.map((node, index) => {
        try {
          // Trip.com DOM selectors can change often, handling some generic fallbacks
          const airline = node.querySelector('.airline-name, .airline-text, .flight-name')?.textContent || 'Unknown Airline';
          
          const timeEls = node.querySelectorAll('.flight-time, .time-text, .m-time');
          const depTime = timeEls[0]?.textContent || '00:00';
          const arrTime = timeEls[1]?.textContent || (timeEls[0]?.textContent ? '00:00' : '08:00'); // Some use one element '09:00 - 10:00'
          
          let timeContext = node.textContent || '';
          let finalDep = depTime;
          let finalArr = arrTime;
          
          // If the time element contains both
          if (depTime.includes('-')) {
            const parts = depTime.split('-');
            finalDep = parts[0]?.trim() || '08:00';
            finalArr = parts[1]?.trim() || '12:00';
          }
          
          const priceText = node.querySelector('.price, .flight-price, .m-price')?.textContent || '0';
          const durationText = node.querySelector('.duration, .flight-duration, .m-duration')?.textContent || '2h 0m';
          
          // Detect stops
          let stops = 0;
          if (timeContext.includes('1 Stop') || timeContext.includes('1轉') || timeContext.includes('1 轉')) {
            stops = 1;
          } else if (timeContext.includes('2 Stops') || timeContext.includes('2轉') || timeContext.includes('2 轉')) {
            stops = 2;
          }
          
          // Parse integer price
          const priceStr = priceText.replace(/[^0-9]/g, '');
          const price = priceStr ? parseInt(priceStr, 10) : 0;
          
          return {
            index,
            airline: airline.trim(),
            departure: finalDep.trim(),
            arrival: finalArr.trim(),
            price,
            duration: durationText.trim(),
            stops
          };
        } catch (err) {
          return null;
        }
      });
    });
    
    await browser.close();
    
    // Filter and transform to our standard format
    const validFlights = rawFlights.filter((f): f is NonNullable<typeof f> => f !== null && f.price > 0).slice(0, 10);
    
    console.log(`Parsed ${validFlights.length} flights successfully from DOM.`);
    
    return validFlights.map((f) => ({
      id: `tripcom_${date}_${f.index}_${Date.now()}`,
      type: 'flight' as const,
      provider: 'Trip.com',
      title: `${origin} → ${destination} · ${f.stops === 0 ? '直飛' : f.stops + ' 轉'}`,
      price: f.price,
      currency: 'TWD',
      emoji: '✈️',
      affiliate_url: url,
      details: {
        airline: f.airline || 'Trip Airline',
        departure: f.departure,
        arrival: f.arrival,
        stops: f.stops,
        duration: f.duration
      }
    }));
    
  } catch (error: any) {
    if (error.message.includes('觸發防爬蟲機制')) {
      console.warn('Trip.com Scraper:', error.message);
    } else {
      console.error('Trip.com Scraper Error:', error);
    }
    
    if (browser) await browser.close();
    return []; // Return empty array on failure
  }
}

// 執行範例: 
// scrapeTripFlights('TPE', 'NRT', '2024-12-25').then(res => console.log('Parsed:', res));
