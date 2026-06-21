const DESTINATION_IMAGES: Array<{ keywords: string[]; url: string }> = [
  {
    keywords: ["台北", "taipei"],
    url: "https://images.unsplash.com/photo-1470004914212-05527e49370b?w=800&auto=format&fit=crop",
  },
  {
    keywords: ["九份", "jiufen"],
    url: "https://images.unsplash.com/photo-1548468787-56de8ce95253?w=800&auto=format&fit=crop",
  },
  {
    keywords: ["太魯閣", "taroko", "花蓮", "hualien"],
    url: "https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=800&auto=format&fit=crop",
  },
  {
    keywords: ["日月潭", "sun moon lake"],
    url: "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=800&auto=format&fit=crop",
  },
  {
    keywords: ["台南", "tainan"],
    url: "https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=800&auto=format&fit=crop",
  },
  {
    keywords: ["高雄", "kaohsiung"],
    url: "https://images.unsplash.com/photo-1605552490120-dba5cfe84eac?w=800&auto=format&fit=crop",
  },
  {
    keywords: ["墾丁", "kenting"],
    url: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&auto=format&fit=crop",
  },
  {
    keywords: ["清境", "cingjing", "合歡", "hehuanshan"],
    url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop",
  },
  {
    keywords: ["台東", "taitung", "池上", "chishang"],
    url: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&auto=format&fit=crop",
  },
  {
    keywords: ["淡水", "tamsui"],
    url: "https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5?w=800&auto=format&fit=crop",
  },
  {
    keywords: [
      "日本",
      "japan",
      "東京",
      "tokyo",
      "大阪",
      "osaka",
      "京都",
      "kyoto",
    ],
    url: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=800&auto=format&fit=crop",
  },
  {
    keywords: ["韓國", "korea", "首爾", "seoul"],
    url: "https://images.unsplash.com/photo-1538485399081-7191377e8241?w=800&auto=format&fit=crop",
  },
  {
    keywords: ["泰國", "thailand", "曼谷", "bangkok"],
    url: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&auto=format&fit=crop",
  },
];

export const DEFAULT_TRIP_IMAGE =
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop";

/** Picks a representative cover image URL for a destination, by keyword match. */
export function getTripCoverImage(destination: string): string {
  if (!destination) return DEFAULT_TRIP_IMAGE;
  const lower = destination.toLowerCase();
  for (const entry of DESTINATION_IMAGES) {
    if (entry.keywords.some((k) => lower.includes(k))) return entry.url;
  }
  return DEFAULT_TRIP_IMAGE;
}
