'use strict';

function buildOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  return `${proto}://${host}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildTripDescription(info) {
  const dayLabel = `${Number(info?.days || 1)} 天`;
  const spotLabel = `${Number(info?.totalSpots || 0)} 個景點`;
  const destination = info?.destination ? `${info.destination} · ` : '';
  return `${destination}${dayLabel} · ${spotLabel}。打開 RoamJelly 看完整行程、即時共編與旅伴分享。`;
}

async function fetchTripPreview(req, tripId) {
  const origin = buildOrigin(req);
  const response = await fetch(`${origin}/api/trips/${encodeURIComponent(tripId)}/preview`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'RoamJelly-Share-Bot',
    },
  });

  if (!response.ok) {
    throw new Error(`preview fetch failed: ${response.status}`);
  }

  return response.json();
}

module.exports = {
  buildOrigin,
  buildTripDescription,
  escapeHtml,
  fetchTripPreview,
};