import * as fs from 'fs';
import * as path from 'path';

const openRouterKey = process.env.OPENROUTER_API_KEY;

const destinations = [
  "日本東京自由行", "日本京都大阪自由行", "泰國曼谷自由行", "韓國首爾自由行", 
  "韓國釜山自由行", "印尼峇里島度假", "新加坡自由行", "英國倫敦自由行",
  "法國巴黎自由行", "美國紐約自由行", "澳洲雪梨自由行", "泰國清邁自由行",
  "台灣台北自由行", "瑞士阿爾卑斯山自由行", "美國洛杉磯自由行", "澳洲墨爾本自由行",
  "日本北海道滑雪", "越南峴港自由行", "義大利羅馬威尼斯", "紐西蘭南島自駕"
];

const outputFile = path.join(process.cwd(), 'src/data/expertHandbooksData.json');

interface Node {
  node_id: string;
  day: number;
  time: string;
  title: string;
  emoji: string;
  category: string;
  description: string;
  lat: number;
  lng: number;
  source: string;
}

interface Handbook {
  id: string;
  title: string;
  author: string;
  image: string;
  days: number;
  tags: string[];
  nodes: Node[];
  cities: { name: string; reason: string }[];
}

const images = [
  "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1579717163834-03f572719a27?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1502602898657-3e907611a364?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1510340331006-2586714ea487?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1558230559-07b9a52de0fd?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1580659325492-16a75a7daee3?auto=format&fit=crop&w=800&q=80"
];

async function generateDest(dest: string, index: number): Promise<Handbook | null> {
  const prompt = "你是 PTT/Dcard 上有名的旅遊達人。請根據 \"" + dest + "\" 製作一個極度詳細的旅遊手帳 JSON 物件。要求：\n- 行程為 5 天。每天至少 4 個節點（早、中、晚、住宿）。\n- **非常重要**：在每個節點的 description 屬性中，必須詳細描述該節點的【食】、【衣】、【住】、【行】，以及【💡 達人貼士】。\n  例如：\"【食】當地著名的拉麵\\n【衣】建議洋蔥式穿搭\\n【住】今日住新宿王子飯店\\n【行】搭乘JR\\n\\n💡 達人貼士：提早買票\"。\n- 返回的格式必須是一個純 JSON object，不要用 backticks 包圍，也不要有任何其他文字。就只要 JSON !!!\n\nJSON Schema:\n{\n  \"title\": \"手帳標題，如 2024 東京 5 天 4 夜懶人包\",\n  \"author\": \"虛構的達人名稱\",\n  \"days\": 5,\n  \"tags\": [\"字串\",\"字串\",\"字串\",\"字串\"],\n  \"nodes\": [\n    {\n      \"day\": 1,\n      \"time\": \"HH:MM\",\n      \"title\": \"景點或行程名稱\",\n      \"emoji\": \"一個相關且生動的 emoji\",\n      \"category\": \"landmark\",\n      \"description\": \"【食】...\\n【衣】...\\n【住】...\\n【行】...\\n\\n💡 達人貼士：...\",\n      \"lat\": 實際大約緯度浮點數,\n      \"lng\": 實際大約經度浮點數\n    }\n  ],\n  \"cities\": [\n    { \"name\": \"主要城市名\", \"reason\": \"一小句簡短原因\" }\n  ]\n}";

  console.log("Generating #" + (index + 1) + ": " + dest + "...");
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + openRouterKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const body = await response.json();
    const text = body.choices?.[0]?.message?.content;
    if (!text) {
        console.error("No text returned", body);
        return null;
    }
    
    let cleanedText = text.replace(/^\`\`\`json/i, '').replace(/^\`\`\`/i, '').replace(/\`\`\`$/i, '').trim();

    let data;
    try {
      data = JSON.parse(cleanedText);
    } catch(e) {
       console.error("JSON parse error:", e);
       console.error(cleanedText);
       return null;
    }

    const hb: Handbook = {
      id: "expert_curated_new_" + (index + 1),
      title: data.title,
      author: data.author || "PTT Tourism Expert",
      image: images[index % images.length],
      days: 5,
      tags: data.tags || [],
      nodes: (data.nodes || []).map((n: any, i: number) => ({
        node_id: "node_" + Math.random().toString(36).substring(2,11),
        day: n.day,
        time: n.time,
        title: n.title,
        emoji: n.emoji,
        category: n.category,
        description: n.description,
        lat: n.lat,
        lng: n.lng,
        source: "local"
      })),
      cities: data.cities || []
    };
    return hb;
  } catch (e) {
    console.error("Failed to generate " + dest, e);
    return null;
  }
}

async function main() {
  const allHandbooks: Handbook[] = [];
  
  for (let i = 0; i < destinations.length; i++) {
    const hb = await generateDest(destinations[i], i);
    if (hb) allHandbooks.push(hb);
    await new Promise(r => setTimeout(r, 1000));
  }

  if (allHandbooks.length > 0) {
    fs.writeFileSync(outputFile, JSON.stringify(allHandbooks, null, 2), "utf-8");
    console.log("Successfully generated " + allHandbooks.length + " handbooks and wrote to " + outputFile);
  } else {
    console.log("No handbooks were generated.");
  }
}

main();
