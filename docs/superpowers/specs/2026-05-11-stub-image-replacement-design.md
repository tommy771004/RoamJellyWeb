# Stub Image Replacement & Recommendations Fallback

Date: 2026-05-11
Status: Approved

## Problem

Three stub areas in current codebase:

1. `src/components/HomeTab.tsx` — 4 featured destination cards use `picsum.photos` placeholder images
2. `src/data/expertHandbooksData.json` — 20 handbook cards use `picsum.photos/seed/6XX/800/600`
3. `src/components/HomeTab.tsx:484` — recommendations slot always returns `Promise.resolve([])`, no seed data

## Solution

### 1. HomeTab Featured Destination Images

Replace 4 `picsum.photos` URLs in the `FEATURED_DESTINATIONS` constant with destination-matched Unsplash static URLs. Pattern: `https://images.unsplash.com/<photo-id>?w=600&auto=format&fit=crop`

| Destination | Photo ID |
|---|---|
| 日本 | `photo-1542051841857-5f90071e7989` |
| 尼泊爾 | `photo-1564501049412-61c2a3083791` |
| 挪威 | `photo-1531365737338-5a6d5e3abe3a` |
| 瑞士 | `photo-1531366936337-7c912a4589a7` |

### 2. Expert Handbooks JSON Images

Replace all 20 `picsum.photos` image fields with destination-matched Unsplash URLs. Pattern: `https://images.unsplash.com/<photo-id>?w=800&auto=format&fit=crop`

| # | Handbook | Photo ID |
|---|---|---|
| 0 | 日本東京 | `photo-1542051841857-5f90071e7989` |
| 1 | 法國巴黎 | `photo-1499856871958-5b9627545d1a` |
| 2 | 義大利羅馬威尼斯 | `photo-1552832230-c0197dd311b5` |
| 3 | 英國倫敦 | `photo-1513635269975-59663e0ac1ad` |
| 4 | 日本京都大阪 | `photo-1493976040374-85c8e12f0c0e` |
| 5 | 泰國曼谷 | `photo-1508009603885-50cf7c579365` |
| 6 | 韓國首爾 | `photo-1538485399081-7191377e8241` |
| 7 | 瑞士湖光山色 | `photo-1531366936337-7c912a4589a7` |
| 8 | 美國紐約 | `photo-1496442226666-8d4d0e62e6e9` |
| 9 | 澳洲雪梨 | `photo-1524820197278-540935bbf401` |
| 10 | 日本北海道 | `photo-1516690561799-46d8f74f9abf` |
| 11 | 新加坡 | `photo-1525625293386-3f8f99389edd` |
| 12 | 泰國清邁 | `photo-1569924709013-f9ee62c737f3` |
| 13 | 美國洛杉磯 | `photo-1534430480872-3498386e7856` |
| 14 | 印尼峇里島 | `photo-1537996194471-e657df975ab4` |
| 15 | 韓國釜山 | `photo-1571536802807-30f71f28e3f2` |
| 16 | 奧捷東歐 | `photo-1519677100203-a0e668c92439` |
| 17 | 西班牙 | `photo-1539037116277-4db20889f2d4` |
| 18 | 冰島 | `photo-1476514525535-07fb3b4ae5f1` |
| 19 | 紐西蘭南島 | `photo-1507699622108-4be3abd695ad` |

### 3. Recommendations Fallback

Replace `Promise.resolve([])` with a `GET /api/search?from=TPE&to=TYO&date=<next-month>` call. Silently falls back to `[]` on error. Only sets results if `results.length === 0` (existing guard preserved).

## Files Changed

- `src/components/HomeTab.tsx` — lines 353, 363, 373, 383 (images) + line 484 (recommendations)
- `src/data/expertHandbooksData.json` — lines 6, 301, 706, 1276, 1736, 2031, 2326, 2621, 3191, 3596, 3946, 4296, 4536, 4831, 5236, 5531, 5826, 6286, 6746, 7316

## Out of Scope

- `server.ts` affiliate_url stubs — requires real OTA partner API contract
- Image CDN abstraction layer (not needed for this scope)
