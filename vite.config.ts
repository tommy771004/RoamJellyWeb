import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const FEATURE_CHUNK_RULES: Array<{name: string; patterns: string[]}> = [
  // NOTE: app-feature manual chunks were removed. After decomposing the big
  // tab components into many shared modules, forcing feature groups produced
  // circular chunk warnings (feature-editor <-> feature-collaboration/ai). Vite
  // now auto-splits app code along the lazy-import boundaries in App.tsx, which
  // is cycle-free. Vendor chunks below remain (incl. vendor-charts for recharts).
];

const VENDOR_CHUNK_RULES: Array<{name: string; patterns: string[]}> = [
  {
    name: 'vendor-react',
    patterns: [
      '/node_modules/react/',
      '/node_modules/react-dom/',
      '/node_modules/scheduler/',
      '/node_modules/react-is/',
      '/node_modules/use-sync-external-store/',
    ],
  },
  {
    name: 'vendor-ui',
    patterns: [
      '/node_modules/motion/',
      '/node_modules/lucide-react/',
      '/node_modules/zustand/',
      '/node_modules/@radix-ui/',
      '/node_modules/class-variance-authority/',
      '/node_modules/clsx/',
      '/node_modules/tailwind-merge/',
    ],
  },
  {
    name: 'vendor-ai',
    patterns: ['/node_modules/@google/genai/'],
  },
  {
    name: 'vendor-collaboration',
    patterns: [
      '/node_modules/socket.io-client/',
      '/node_modules/engine.io-client/',
      '/node_modules/socket.io-parser/',
    ],
  },
  {
    name: 'vendor-map',
    patterns: [
      '/node_modules/leaflet/',
      '/node_modules/react-leaflet/',
      '/node_modules/@react-leaflet/core/',
    ],
  },
  {
    // recharts + its d3-* dependencies are large; split them out so the
    // ToolsTab feature chunk stays lean and the charting lib is cached separately.
    name: 'vendor-charts',
    patterns: [
      '/node_modules/recharts/',
      '/node_modules/d3-',
      '/node_modules/victory-vendor/',
      '/node_modules/internmap/',
    ],
  },
];

function normalizeChunkId(id: string) {
  return id.replace(/\\/g, '/');
}

function pickManualChunk(id: string) {
  const normalizedId = normalizeChunkId(id);
  if (normalizedId.endsWith('.css')) return undefined;

  for (const rule of FEATURE_CHUNK_RULES) {
    if (rule.patterns.some((pattern) => normalizedId.includes(pattern))) {
      return rule.name;
    }
  }

  if (!normalizedId.includes('/node_modules/')) {
    return undefined;
  }

  for (const rule of VENDOR_CHUNK_RULES) {
    if (rule.patterns.some((pattern) => normalizedId.includes(pattern))) {
      return rule.name;
    }
  }

  return undefined;
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifestFilename: 'manifest.json',
        includeAssets: [
          'favicon.ico', 'icon-app.svg', 'icon-app-maskable.svg',
          'icon-180.png', 'icon-192.png', 'icon-app-512.png', 'icon-maskable-512.png',
        ],
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          navigateFallbackDenylist: [
            /^\/api\//,
            /^\/fly\//,
            /^\/trips\//,
            /^\/guide\//,
            /^\/share\//,
            /^\/sitemap\.xml$/,
            /^\/sitemap\.xsl$/,
            /^\/robots\.txt$/,
            /^\/llms\.txt$/,
            /\.[^/]+$/,
          ],
        },
        manifest: {
          name: 'RoamJelly 果凍漫遊',
          short_name: 'RoamJelly',
          description: 'AI 旅遊行程規劃、多人即時共編、機票搜尋比價與旅途工具包。',
          lang: 'zh-TW',
          start_url: '/',
          scope: '/',
          theme_color: '#fbfaf7',
          background_color: '#fbfaf7',
          display: 'standalone',
          orientation: 'portrait-primary',
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icon-app-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: '/icon-app.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any'
            },
            {
              src: '/icon-app-maskable.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'maskable'
            }
          ]
        }
      }),
    ],
    resolve: {
      alias: [
        {
          find: '@',
          replacement: path.resolve(__dirname, '.'),
        },
      ],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: pickManualChunk,
        },
      },
    },
  };
});
