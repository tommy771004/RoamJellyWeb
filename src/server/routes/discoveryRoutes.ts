import type { Express } from 'express';
import Parser from 'rss-parser';
import type { AppRepository } from '../repositories/appRepository';

type SearchItemLike = any;

export interface DiscoveryRoutesDeps {
  repo: AppRepository;
  getRedis: () => any | null;
  getSearchCacheData: (cacheKey: string) => Promise<SearchItemLike[] | null>;
  setSearchCacheData: (cacheKey: string, data: SearchItemLike[]) => Promise<void>;
  appendSearchHistory: (record: any) => Promise<void>;
  getSearchHistory: (limit: number) => Promise<any[]>;
  fetchFromOtaProvider: (from: string, to: string, date: string) => Promise<SearchItemLike[] | null>;
  annotateRoundTripLeg: (items: SearchItemLike[] | null, legType: 'outbound' | 'return') => SearchItemLike[];
  otaPartnerBase: string;
}

/** Registers discovery + monetization routes: search, destination alerts, deals feed, clickout tracking. */
export function registerDiscoveryRoutes(app: Express, deps: DiscoveryRoutesDeps): void {
  const {
    repo,
    getRedis,
    getSearchCacheData,
    setSearchCacheData,
    appendSearchHistory,
    getSearchHistory,
    fetchFromOtaProvider,
    annotateRoundTripLeg,
    otaPartnerBase: OTA_PARTNER_BASE,
  } = deps;

  app.get('/api/search', async (req, res) => {
    const from = String(req.query.from ?? '').trim();
    const to = String(req.query.to ?? '').trim();
    const date = String(req.query.date ?? '').trim();
    const tripType = String(req.query.tripType ?? 'oneway').trim();
    const returnDate = String(req.query.returnDate ?? '').trim();

    // If no params, return "Popular Recommendations" (latest flights)
    if (!from || !to || !date) {
      const topFlights = await repo.getTopFlights(5).catch(() => []);
      const results = topFlights.map((f: any, idx: number) => ({
        id: f.id || `flight_trend_${idx}`,
        type: 'flight',
        provider: f.provider,
        title: `${f.origin_code || 'TPE'} -> ${f.destination_code || '目的地'}`,
        price: f.price,
        currency: 'TWD',
        emoji: '✈️',
        affiliate_url: OTA_PARTNER_BASE ? `${OTA_PARTNER_BASE}/flight/${encodeURIComponent(f.id)}` : `https://www.trip.com/flights/${f.origin_code}-to-${f.destination_code}/tickets-${f.origin_code}-${f.destination_code}/?flighttype=ow&dcity=${f.origin_code || 'tpe'}&acity=${f.destination_code || 'nrt'}`,
        details: { airline: f.provider, stops: f.stops || 0, departure: f.time?.split(' - ')[0] || '10:00', arrival: f.time?.split(' - ')[1] || '14:00' }
      }));
      res.json({ status: 'success', data: results });
      return;
    }

    const cacheVersion = tripType === 'roundtrip' ? 'rt-legs-v1' : 'default-v1';
    const cacheKey = `${from.toUpperCase()}_${to.toUpperCase()}_${date}_${tripType}_${returnDate}_${cacheVersion}`;
    const cached = await getSearchCacheData(cacheKey);
    if (cached) {
      await appendSearchHistory({
        from,
        to,
        date,
        cache: 'hit',
        result_count: cached.length,
        timestamp: new Date().toISOString(),
      });
      res.json({ status: 'success', data: cached, cache: 'hit' });
      return;
    }

    // Try OTA provider first; if no data, return empty array to keep it real
    let otaData: SearchItemLike[] | null = null;
    if (tripType === 'roundtrip' && returnDate) {
      const [outboundData, returnData] = await Promise.all([
        fetchFromOtaProvider(from, to, date),
        fetchFromOtaProvider(to, from, returnDate),
      ]);
      otaData = [
        ...annotateRoundTripLeg(outboundData, 'outbound'),
        ...annotateRoundTripLeg(returnData, 'return'),
      ];
    } else {
      otaData = await fetchFromOtaProvider(from, to, date);
    }
    const data: SearchItemLike[] = otaData || [];

    await setSearchCacheData(cacheKey, data);
    await appendSearchHistory({
      from,
      to,
      date,
      cache: 'miss',
      result_count: data.length,
      timestamp: new Date().toISOString(),
    });

    res.json({ status: 'success', data, cache: 'miss' });
  });

  app.get('/api/destinations/alerts', async (req, res) => {
    try {
      const cacheKey = `cache:destinations:alerts`;
      const redisClient = getRedis();
      if (redisClient) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return res.json({ status: 'success', data: JSON.parse(cached), cache: 'hit' });
        }
      }

      const destinations = [
        { name: "東京 Tokyo", code: "NRT", image: "https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=300&q=80", defaultPrice: "NT$ 9,800起" },
        { name: "大阪 Osaka", code: "KIX", image: "https://images.unsplash.com/photo-1590253187631-6f9aa4563a57?auto=format&fit=crop&w=300&q=80", defaultPrice: "NT$ 8,900起" },
        { name: "台北 Taipei", code: "TPE", image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=300&q=80", defaultPrice: "本島漫遊" },
        { name: "倫敦 London", code: "LHR", image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=300&q=80", defaultPrice: "NT$ 24,500起" }
      ];

      const rssParser = new Parser();
      const results = await Promise.all(destinations.map(async (dest) => {
        try {
          const query = `${dest.name.split(' ')[0]} 旅遊 OR 機票 OR 警報`;
          const feed = await rssParser.parseURL(`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`);
          const latest = feed.items[0];

          let health = "💚 安全無虞";
          let tagColor = "bg-emerald-50 text-emerald-700 font-extrabold";
          let advisory = "近期氣候適中，旅遊人潮穩定，適合安排自由行。";

          if (latest) {
            advisory = latest.title || advisory;
            // truncate advisory if too long
            if (advisory.length > 50) advisory = advisory.substring(0, 50) + '...';

            if (advisory.includes('警報') || advisory.includes('颱風') || advisory.includes('地震') || advisory.includes('注意')) {
              health = "💛 旅遊須知";
              tagColor = "bg-amber-50 text-amber-700 font-extrabold";
            } else if (advisory.includes('促銷') || advisory.includes('優惠') || advisory.includes('低價')) {
              health = "🔥 促銷中";
              tagColor = "bg-pink-50 text-pink-700 font-extrabold";
            }
          }

          return {
            name: dest.name,
            code: dest.code,
            image: dest.image,
            price: dest.defaultPrice,
            health,
            advisory,
            tagColor,
            link: latest?.link || ''
          };
        } catch (e) {
          return {
            name: dest.name,
            code: dest.code,
            image: dest.image,
            price: dest.defaultPrice,
            health: "💚 安全無虞",
            advisory: "近期氣候適中，旅遊人潮穩定。",
            tagColor: "bg-emerald-50 text-emerald-700 font-extrabold"
          };
        }
      }));

      const redis = getRedis();
      if (redis) {
        await redis.setEx(cacheKey, 60 * 60, JSON.stringify(results)); // cache for 1 hour
      }

      res.json({ status: 'success', data: results, cache: 'miss' });
    } catch (err: any) {
      console.error('Failed to fetch destination alerts:', err);
      res.status(500).json({ status: 'error', message: 'Failed to fetch destination alerts' });
    }
  });

  app.get('/api/search/history', async (req, res) => {
    const limit = Number(req.query.limit ?? 50);
    const data = await getSearchHistory(Number.isFinite(limit) ? limit : 50);
    res.json({ status: 'success', data });
  });

  const rssParser = new Parser();
  app.get('/api/deals/feed', async (req, res) => {
    const q = req.query.q as string || '旅遊優惠 OR 機票促銷 OR 降價';
    const cacheKey = `cache:rss:${encodeURIComponent(q)}`;
    try {
      const redisClient = getRedis();
      if (redisClient) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return res.json({ status: 'success', data: JSON.parse(cached), cache: 'hit' });
        }
      }

      const feed = await rssParser.parseURL(`https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`);

      const data = feed.items.slice(0, 10).map((item, index) => {
        let type = 'deal';
        let tag = '🔥 降價促銷';
        if (item.title?.includes('警報') || item.title?.includes('注意') || item.title?.includes('地震') || item.title?.includes('天氣') || item.title?.includes('颱風')) {
           type = 'advisory';
           tag = '⚠️ 旅遊須知';
        }

        let dest = '近期關注';
        const popularCities = ['東京', '大阪', '京都', '北海道', '首爾', '釜山', '台北', '曼谷', '倫敦', '巴黎'];
        for (const city of popularCities) {
          if (item.title?.includes(city)) {
            dest = city;
            break;
          }
        }

        return {
          id: `feed-${index}`,
          dest,
          type,
          tag,
          text: item.title,
          link: item.link,
          date: item.pubDate
        };
      });

      const redis = getRedis();
      if (redis) {
        await redis.setEx(cacheKey, 60 * 60, JSON.stringify(data)); // cache for 1 hour
      }

      res.json({ status: 'success', data, cache: 'miss' });
    } catch (err: any) {
      console.error('Failed to fetch RSS:', err);
      // Fallback
      res.json({ status: 'success', data: [
        { id: 'fb-1', dest: "東京", type: "deal", tag: "🔥 降價大促銷", text: "目前無法取得即時新聞，已為您提供預設快訊。" }
      ]});
    }
  });

  app.post('/api/track/clickout', async (req, res) => {
    const { user_id, item_id, provider, timestamp } = req.body as {
      user_id?: string;
      item_id?: string;
      provider?: string;
      timestamp?: string;
    };

    if (!user_id || !item_id || !provider || !timestamp) {
      res.status(400).json({ status: 'error', message: 'invalid clickout payload' });
      return;
    }

    res.status(202).json({ status: 'accepted' });

    setImmediate(() => {
      void repo.addClickoutLog({
        userId: user_id,
        itemId: item_id,
        provider,
        eventTimestamp: new Date(timestamp),
      });
    });
  });
}
