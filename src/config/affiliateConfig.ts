/**
 * ============================================================
 * RoamJelly 分潤夥伴設定檔 (Affiliate Partner Config)
 * ============================================================
 *
 * 操作說明：
 * 1. 申請各平台的 Affiliate 帳號（詳見 docs/affiliate-guide.md）
 * 2. 將拿到的 ID 填入下方對應欄位
 * 3. 留空字串 '' 表示該平台尚未申請，連結會 fallback 到無追蹤的首頁
 *
 * 如何確認 ID 有效？
 * - 填入後點擊連結，確認 URL 包含你的 ID
 * - 登入各平台後台，查看「點擊報告」是否有數據
 * ============================================================
 */

// ─── 機票平台 (Flights) ───────────────────────────────────────

/** Trip.com 攜程 — 申請: https://us.trip.com/pages/affiliate-program */
export const TRIP_COM_ALLIANCE_ID = '1762106'; // allianceid（固定，代表你的帳號）
export const TRIP_COM_SID = '';               // sid（可自訂，建議填 'roamjelly' 或子頻道名稱）

/** Skyscanner — 申請: https://www.partners.skyscanner.net/ */
export const SKYSCANNER_ASSOCIATE_ID = '';    // e.g. 'aff_tp_abc123'

/** Travelpayouts（聚合平台，含機票/飯店） — 申請: https://www.travelpayouts.com/programs */
export const TRAVELPAYOUTS_MARKER = '176215'; // marker（你的推廣人 ID）

// ─── 住宿平台 (Hotels) ───────────────────────────────────────

/** Agoda 雅高達 — 申請: https://partners.agoda.com/en-us/ */
export const AGODA_CID = '';                  // e.g. '1234567'

/** Booking.com 繽客 — 申請: https://www.booking.com/affiliate-program/ */
export const BOOKING_COM_AID = '';            // e.g. '123456'

// ─── 門票 & 觀光行程 (Tickets & Activities) ──────────────────

/** Klook 客路 — 申請: https://affiliate.klook.com/ */
export const KLOOK_AID = '';                  // e.g. 'youraffiliateid'

/** KKday — 申請: https://www.kkday.com/zh-tw/page/affiliate */
export const KKDAY_CID = '4480';             // e.g. '4480'（你的 Publisher ID）

/** GetYourGuide — 申請: https://partner.getyourguide.com/ */
export const GETYOURGUIDE_PARTNER_ID = '';    // e.g. 'ABCDE'

/** Viator — 申請: https://www.viator.com/affiliate */
export const VIATOR_PID = '';                 // e.g. 'P12345'

// ─── UTM 追蹤參數（選填，用於你自己的 GA/Analytics 分析） ────

/** UTM Source（流量來源識別，填你的網站名稱） */
export const UTM_SOURCE = 'roamjelly';

/** UTM Medium（行銷媒介，建議固定為 affiliate） */
export const UTM_MEDIUM = 'affiliate';

// ─── 以下為自動組合 URL 的函式，不需手動修改 ─────────────────

function buildUtm(campaign: string): string {
  if (!UTM_SOURCE) return '';
  return `&utm_source=${UTM_SOURCE}&utm_medium=${UTM_MEDIUM}&utm_campaign=${campaign}`;
}

// Trip.com 機票
export function buildTripComFlightUrl(): string {
  const allianceId = TRIP_COM_ALLIANCE_ID || '';
  const sid = TRIP_COM_SID || 'roamjelly';
  if (!allianceId) return 'https://www.trip.com/flights/';
  return `https://www.trip.com/flights/?allianceid=${allianceId}&sid=${sid}${buildUtm('nav-flights')}`;
}

// Trip.com 飯店
export function buildTripComHotelUrl(): string {
  const allianceId = TRIP_COM_ALLIANCE_ID || '';
  const sid = TRIP_COM_SID || 'roamjelly';
  if (!allianceId) return 'https://www.trip.com/hotels/';
  return `https://www.trip.com/hotels/?allianceid=${allianceId}&sid=${sid}${buildUtm('nav-hotels')}`;
}

// Skyscanner
export function buildSkyscannerUrl(): string {
  const id = SKYSCANNER_ASSOCIATE_ID;
  const base = 'https://www.skyscanner.com.tw/';
  if (!id) return base;
  return `${base}?associateid=${id}${buildUtm('nav-flights')}`;
}

// Travelpayouts
export function buildTravelpayoutsUrl(): string {
  const marker = TRAVELPAYOUTS_MARKER;
  if (!marker) return 'https://www.travelpayouts.com/';
  return `https://www.travelpayouts.com/?marker=${marker}${buildUtm('nav-flights')}`;
}

// Agoda
export function buildAgodaUrl(): string {
  const cid = AGODA_CID;
  if (!cid) return 'https://www.agoda.com/zh-tw/';
  return `https://www.agoda.com/zh-tw/?cid=${cid}${buildUtm('nav-hotels')}`;
}

// Booking.com
export function buildBookingComUrl(): string {
  const aid = BOOKING_COM_AID;
  if (!aid) return 'https://www.booking.com/';
  return `https://www.booking.com/?aid=${aid}${buildUtm('nav-hotels')}`;
}

// Klook（機票/住宿/門票/接送共用同一個 AID）
export function buildKlookUrl(path = '', campaign = 'nav-tickets'): string {
  const aid = KLOOK_AID;
  const base = `https://www.klook.com/zh-TW/${path}`;
  if (!aid) return base;
  return `${base}${path.includes('?') ? '&' : '?'}aid=${aid}${buildUtm(campaign)}`;
}

// KKday
export function buildKkdayUrl(path = '', campaign = 'nav-tickets'): string {
  const cid = KKDAY_CID;
  const base = `https://www.kkday.com/zh-tw/${path}`;
  if (!cid) return base;
  return `${base}${path.includes('?') ? '&' : '?'}cid=${cid}${buildUtm(campaign)}`;
}

// GetYourGuide
export function buildGetYourGuideUrl(path = ''): string {
  const pid = GETYOURGUIDE_PARTNER_ID;
  const base = `https://www.getyourguide.com/${path}`;
  if (!pid) return base;
  return `${base}${path.includes('?') ? '&' : '?'}partner_id=${pid}${buildUtm('nav-tickets')}`;
}

// Viator
export function buildViatorUrl(path = ''): string {
  const pid = VIATOR_PID;
  const base = `https://www.viator.com/${path}`;
  if (!pid) return base;
  return `${base}${path.includes('?') ? '&' : '?'}pid=${pid}${buildUtm('nav-tickets')}`;
}
