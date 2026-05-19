'use strict';

const {
  buildTripDescription,
  escapeHtml,
  fetchTripPreview,
} = require('./_tripShareCommon');

function clampText(value, maxLength) {
  const text = String(value || '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

module.exports = async (req, res) => {
  const tripId = String(req.query.tripId || '').trim();
  if (!tripId) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Missing tripId');
    return;
  }

  try {
    const info = await fetchTripPreview(req, tripId);
    const title = clampText(info.name, 28);
    const subtitle = clampText(buildTripDescription(info), 72);
    const destination = clampText(info.destination || '旅程目的地', 16);
    const dayLabel = `${Number(info.days || 1)} 天`;
    const spotLabel = `${Number(info.totalSpots || 0)} 景點`;

    const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#0F172A"/>
  <circle cx="214" cy="154" r="194" fill="#EC4899" fill-opacity="0.26"/>
  <circle cx="1008" cy="510" r="248" fill="#38BDF8" fill-opacity="0.18"/>
  <circle cx="790" cy="170" r="142" fill="#A855F7" fill-opacity="0.18"/>
  <rect x="70" y="60" width="1060" height="510" rx="44" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
  <text x="98" y="140" fill="#F9A8D4" font-size="28" font-family="Arial, sans-serif" font-weight="800">RoamJelly Trip Share</text>
  <text x="98" y="248" fill="white" font-size="72" font-family="Arial, sans-serif" font-weight="800">${escapeHtml(title)}</text>
  <text x="98" y="316" fill="#CBD5E1" font-size="31" font-family="Arial, sans-serif" font-weight="600">${escapeHtml(subtitle)}</text>
  <rect x="98" y="392" width="196" height="58" rx="29" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.08)"/>
  <text x="144" y="429" fill="white" font-size="28" font-family="Arial, sans-serif" font-weight="800">📍 ${escapeHtml(destination)}</text>
  <rect x="312" y="392" width="148" height="58" rx="29" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.08)"/>
  <text x="350" y="429" fill="white" font-size="28" font-family="Arial, sans-serif" font-weight="800">🗓️ ${escapeHtml(dayLabel)}</text>
  <rect x="478" y="392" width="178" height="58" rx="29" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.08)"/>
  <text x="518" y="429" fill="white" font-size="28" font-family="Arial, sans-serif" font-weight="800">✨ ${escapeHtml(spotLabel)}</text>
  <rect x="778" y="142" width="262" height="222" rx="64" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" stroke-width="10"/>
  <path d="M832 254C832 207.608 869.608 170 916 170C962.392 170 1000 207.608 1000 254C1000 300.392 962.392 338 916 338H850" stroke="white" stroke-width="24" stroke-linecap="round"/>
  <path d="M894 220L968 254L894 288" stroke="#FFF7ED" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M812 330H956" stroke="#FFF7ED" stroke-width="22" stroke-linecap="round"/>
  <text x="98" y="522" fill="#E2E8F0" font-size="28" font-family="Arial, sans-serif" font-weight="700">多人即時共編、AI 行程規劃、旅途中直接打開導航</text>
</svg>`;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400');
    res.end(svg);
  } catch (error) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.end('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#0F172A"/><text x="80" y="200" fill="white" font-size="56" font-family="Arial" font-weight="700">RoamJelly</text><text x="80" y="290" fill="#CBD5E1" font-size="32" font-family="Arial">Trip preview unavailable</text></svg>');
  }
};