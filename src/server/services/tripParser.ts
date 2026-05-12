import * as playwrightCore from 'playwright-core';
import chromiumSparticuz from '@sparticuz/chromium';

// Ensure Vercel node-file-trace includes playwright by statically referencing it
try { require('playwright'); } catch {}

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

const IATA_MAP: Record<string, string> = {
  '台北': 'tpe',
  '桃園': 'tpe',
  '台北/桃園': 'tpe',
  '松山': 'tsa',
  '台北/松山': 'tsa',
  '高雄': 'khh',
  '台中': 'rmq',
  '東京': 'tyo',
  '成田': 'nrt',
  '羽田': 'hnd',
  '東京/成田': 'nrt',
  '東京/羽田': 'hnd',
  '大阪': 'osa',
  '關西': 'kix',
  '大阪/關西': 'kix',
  '沖繩': 'oka',
  '那霸': 'oka',
  '沖繩/那霸': 'oka',
  '福岡': 'fuk',
  '札幌': 'cts',
  '新千歲': 'cts',
  '北海道': 'cts',
  '名古屋': 'ngo',
  '仙台': 'sdj',
  '廣島': 'hij',
  '小松': 'kmq',
  '熊本': 'kmj',
  '函館': 'hkd',
  '高松': 'tak',
  '首爾': 'sel',
  '仁川': 'icn',
  '首爾/仁川': 'icn',
  '金浦': 'gmp',
  '釜山': 'pus',
  '濟州': 'cju',
  '曼谷': 'bkk',
  '蘇凡納布': 'bkk',
  '廊曼': 'dmk',
  '清邁': 'cnx',
  '普吉島': 'hkt',
  '新加坡': 'sin',
  '香港': 'hkg',
  '澳門': 'mfm',
  '吉隆坡': 'kul',
  '胡志明': 'sgn',
  '胡志明市': 'sgn',
  '河內': 'han',
  '峴港': 'dad',
  '峇里島': 'dps',
  '雅加達': 'cgk',
  '宿霧': 'ceb',
  '馬尼拉': 'mnl',
  '長灘島': 'mph',
  '雪梨': 'syd',
  '墨爾本': 'mel',
  '布里斯本': 'bne',
  '紐約': 'nyc',
  '洛杉磯': 'lax',
  '舊金山': 'sfo',
  '西雅圖': 'sea',
  '溫哥華': 'yvr',
  '多倫多': 'yto',
  '倫敦': 'lon',
  '巴黎': 'par',
  '法蘭克福': 'fra',
};

const IATA_LOOKUP: Record<string, string> = Object.fromEntries(
  Object.entries(IATA_MAP).map(([key, value]) => [key.trim().toLowerCase(), value.trim().toLowerCase()]),
);

function getIata(city: string): string {
  const normalizedCity = city.trim().toLowerCase();
  if (!normalizedCity) return 'tpe';
  if (/^[a-z]{3}$/i.test(normalizedCity)) return normalizedCity;
  if (IATA_LOOKUP[normalizedCity]) return IATA_LOOKUP[normalizedCity];
  for (const [key, val] of Object.entries(IATA_LOOKUP)) {
      if (normalizedCity.includes(key)) return val;
  }
  return normalizedCity;
}

/**
 * Trip.com Flight Parser (POC)
 * Scrapes flight data using headles chromium and stealth plugin.
 */
export async function scrapeTripFlights(origin: string, destination: string, date: string): Promise<FlightData[]> {
  const originIATA = getIata(origin);
  const destIATA = getIata(destination);
  // Construct dynamic URL based on Trip.com's structure
  const url = `https://tw.trip.com/flights/${originIATA}-to-${destIATA}/tickets-${originIATA}-${destIATA}/?flighttype=ow&dcity=${originIATA}&acity=${destIATA}&ddate=${date}`;
  const isVercel = !!process.env.VERCEL;
  
  // Vercel Serverless Functions have limits, but we want real scraping now.
  const shouldScrapeOnVercel = true;

  if (isVercel && !shouldScrapeOnVercel) {
    console.log('Skipping Trip.com scraper on Vercel to prevent 504 timeouts.');
    return [];
  }
  
  console.log(`Starting Playwright tripParser for: ${url}`);
  
  let browser;
  try {
    const executablePath = await (chromiumSparticuz as any).executablePath();
    // Launch browser (uses sparticuz/chromium)
    browser = await playwrightCore.chromium.launch({ 
      headless: true,
      executablePath: executablePath || undefined,
      args: [...((chromiumSparticuz as any).args || []), '--disable-blink-features=AutomationControlled']
    });
    
    // Set realistic User-Agent and viewport
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1440, height: 900 },
      locale: 'zh-TW',
      timezoneId: 'Asia/Taipei',
    });

    await context.addInitScript("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})");

    const page = await context.newPage();
    
    console.log('Navigating to page...');
    // Increase timeout for real scraping (Vercel has limit, but we can try slightly longer)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: isVercel ? 12000 : 60000 });
    
    // Simulate human interaction while loading, and wait longer since Trip.com takes a while to load flights
    console.log('Simulating human mouse/scroll behavior...');
    await page.waitForTimeout(2000);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(3000);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(1000);
    
    // Wait for the actual flight items (not just the list container which renders immediately)
    try {
      await page.waitForSelector('.flight-item, div[data-testid="flight-card"]', { timeout: isVercel ? 15000 : 45000 });
      console.log('Flight items detected, starting DOM parsing.');
    } catch (e) {
      console.log('Timeout waiting for flight container. Page structure might have changed or captcha triggered.');
      throw new Error('Timeout or Captcha triggered');
    }
    
    // Parse the DOM to extract flight items (fallback to filters if main list is hidden by bot protection)
    const rawFlights = await page.evaluate(() => {
       // Method A: Try parsing the actual flight items if they rendered
       const flightNodes = Array.from(document.querySelectorAll('.m-flight-list .flight-item, .flight-list .flight-item, .flight-card-container, div[data-testid="flight-card"], .o-flight-card, .flight-item'));
       
       if (flightNodes.length > 0) {
           return flightNodes.map((node, index) => {
             try {
               const airline = node.querySelector('.airline-name, .airline-text, .flight-name')?.textContent || 'Unknown Airline';
               const timeEls = node.querySelectorAll('.flight-time, .time-text, .m-time');
               const depTime = timeEls[0]?.textContent || '00:00';
               const arrTime = timeEls[1]?.textContent || (timeEls[0]?.textContent ? '00:00' : '08:00'); 
               let timeContext = node.textContent || '';
               let finalDep = depTime;
               let finalArr = arrTime;
               if (depTime.includes('-')) {
                 const parts = depTime.split('-');
                 finalDep = parts[0]?.trim() || '08:00';
                 finalArr = parts[1]?.trim() || '12:00';
               }
               const priceText = node.querySelector('.price, .flight-price, .m-price')?.textContent || '0';
               const durationText = node.querySelector('.duration, .flight-duration, .m-duration')?.textContent || '2h 0m';
               let stops = 0;
               if (timeContext.includes('1 Stop') || timeContext.includes('1轉') || timeContext.includes('1 轉') || timeContext.includes('中轉')) {
                 stops = 1;
               } else if (timeContext.includes('2 Stops') || timeContext.includes('2轉') || timeContext.includes('2 轉')) {
                 stops = 2;
               }
               const priceStr = priceText.replace(/[^0-9]/g, '');
               const price = priceStr ? parseInt(priceStr, 10) : 0;
               return { index, airline: airline.trim(), departure: finalDep.trim(), arrival: finalArr.trim(), price, duration: durationText.trim(), stops };
             } catch (err) {
               return null;
             }
           });
       }

       return [];
    });
    
    await browser.close();
    
    // Filter and transform to our standard format
    const validFlights = rawFlights.filter((f): f is NonNullable<typeof f> => f !== null && f.price > 0).slice(0, 10);
    
    if (validFlights.length === 0) {
      console.log(`Parsed 0 flights.`);
      return [];
    }

    console.log(`Parsed ${validFlights.length} flights successfully from DOM or filters.`);
    
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
    if (browser) await browser.close();
    
    console.warn('Trip.com scraper failed or blocked. Returning empty array.');

    return [];
  }
}

// 執行範例: 
// scrapeTripFlights('TPE', 'NRT', '2024-12-25').then(res => console.log('Parsed:', res));
