/**
 * Raster base map shared by every Leaflet map in the app.
 *
 * CARTO's basemaps now return an "API KEY REQUIRED" watermark without a key,
 * so the app uses the OpenStreetMap standard tiles. Their usage policy
 * (https://operations.osmfoundation.org/policies/tiles/) requires the
 * attribution below to stay visible and the browser's Referer to be sent
 * (the site's Referrer-Policy already sends the origin).
 */
export const BASE_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const BASE_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
export const BASE_TILE_MAX_ZOOM = 19;
