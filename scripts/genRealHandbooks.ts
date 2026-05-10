import * as fs from 'fs';
import * as path from 'path';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error("Missing OPENROUTER_API_KEY");
  process.exit(1);
}

const destinations = [
  { city: "東京", name: "日本東京精選5日遊", days: 5 },
  { city: "巴黎", name: "法國巴黎浪漫文藝7日遊", days: 7 },
  { city: "羅馬", name: "義大利羅馬威尼斯10日遊", days: 10 },
  { city: "倫敦", name: "英國倫敦深度8日遊", days: 8 },
  { city: "大阪", name: "日本京都大阪5日遊", days: 5 },
  { city: "曼谷", name: "泰國曼谷自由行5日遊", days: 5 },
  { city: "首爾", name: "韓國首爾流行5日遊", days: 5 },
  { city: "琉森", name: "瑞士湖光山色10日遊", days: 10 },
  { city: "紐約", name: "美國紐約繁華7日遊", days: 7 },
  { city: "雪梨", name: "澳洲雪梨與藍山6日遊", days: 6 },
  { city: "札幌", name: "日本北海道秘境6日遊", days: 6 },
  { city: "新加坡", name: "新加坡文化4日遊", days: 4 },
  { city: "清邁", name: "泰國清邁慢活5日遊", days: 5 },
  { city: "洛杉磯", name: "美國洛杉磯與樂園7日遊", days: 7 },
  { city: "峇里島", name: "印尼峇里島度假5日遊", days: 5 },
  { city: "釜山", name: "韓國釜山自由行5日遊", days: 5 },
  { city: "布拉格", name: "奧捷東歐風情8日遊", days: 8 },
  { city: "巴塞隆納", name: "西班牙熱情8日遊", days: 8 },
  { city: "雷克雅維克", name: "冰島極光10日遊", days: 10 },
  { city: "皇后鎮", name: "紐西蘭南島8日遊", days: 8 }
];

async function generateDestination(dest: any, index: number) {
  console.log(`Generating data for ${dest.name} (${dest.days} days)...`);
  const prompt = `請身為一個專業的旅遊達人，幫我規劃一個精確寫實的「${dest.name}」旅遊行程。
行程天數：${dest.days}天。

**請給出真實存在的景點、真實餐廳、真實住宿地點與常見交通方式。**
每天請安排約 4 節點：
1. 上午出發/景點 (含【衣】穿搭建議與【行】交通) -> category='spot' 或 'hotel'
2. 午餐 (真實存在的餐廳/美食，含【食】細節) -> category='food'
3. 下午景點 -> category='spot' 或 'shopping'
4. 晚餐 (真實存在的餐廳) -> category='food'
(若需要補充住宿可加 category='hotel')。

請回傳「完全合法」JSON，格式如下：
{
  "id": "expert_curated_real_${index}",
  "title": "${dest.name} 全攻略",
  "author": "${dest.city}在地達人",
  "image": "https://picsum.photos/seed/${600 + index}/800/600",
  "days": ${dest.days},
  "tags": ["真實推薦", "必去", "食衣住行"],
  "cities": [{ "name": "${dest.city}", "reason": "真實推薦" }],
  "nodes": [
    {
      "node_id": "隨機英數ID 例如 node_abc123",
      "day": 1,
      "time": "09:00",
      "title": "真實地點名",
      "emoji": "🏨",
      "category": "hotel", 
      "description": "詳細描述...",
      "lat": 真實緯度(數字),
      "lng": 真實經度(數字)
    }
  ]
}
請只輸出 JSON，不需多餘說明。不要加 Markdown。`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1
    })
  });

  if (!res.ok) {
    throw new Error(`OpenRouter Error: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new Error("No text from AI");

  // Attempt to parse JSON safely if it has markdown ticks
  const clean = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  return JSON.parse(clean);
}

async function main() {
  const results = [];
  const fileOut = path.join(process.cwd(), 'src/data/expertHandbooksData.json');
  
  for (let i = 0; i < destinations.length; i++) {
    try {
      const destData = await generateDestination(destinations[i], i);
      results.push(destData);
      console.log(`Saved ${destinations[i].name}. Progress: ${i+1}/${destinations.length}`);
      fs.writeFileSync(fileOut, JSON.stringify(results, null, 2), 'utf-8');
      
      await new Promise(r => setTimeout(r, 1000));
    } catch (e: any) {
      console.error(`Error generating data for ${destinations[i].name}:`, e.message || e);
    }
  }

  console.log('All 20 authentic expert handbooks fully generated!');
}

main();
