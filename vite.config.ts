import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const FEATURE_CHUNK_RULES: Array<{name: string; patterns: string[]}> = [
  {
    name: 'feature-editor',
    patterns: [
      '/src/components/ItineraryTab.tsx',
      '/src/components/DynamicItineraryView.tsx',
      '/src/components/ItineraryMapView.tsx',
    ],
  },
  {
    name: 'feature-ai',
    patterns: [
      '/src/components/JellyAssistant.tsx',
      '/src/lib/openrouterApi.ts',
      '/src/lib/geminiApi.ts',
    ],
  },
  {
    name: 'feature-collaboration',
    patterns: [
      '/src/lib/workflowApi.ts',
      '/src/store/useAppStore.ts',
      '/src/store/useSearchStore.ts',
      '/src/store/useItineraryStore.ts',
      '/src/store/useTripFactsStore.ts',
      '/src/components/TripLandingPage.tsx',
      '/src/components/RedirectModal.tsx',
    ],
  },
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
        includeAssets: ['favicon.ico', 'icon-app.svg', 'icon-app-maskable.svg'],
        workbox: {
          // Let the SW take control without going through the message-channel
          // handshake — this is what eliminates the "message channel closed" error.
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
        },
        manifest: ({
          name: 'RoamJelly 果凍漫遊',
          short_name: 'RoamJelly',
          description: 'AI 旅遊行程規劃、多人即時共編、機票搜尋比價與旅途工具包。',
          lang: 'zh-TW',
          start_url: '/',
          scope: '/',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait-primary',
          url_handlers: [
            {
              origin: 'https://roam-jelly-web.vercel.app'
            }
          ],
          icons: [
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
        } as any)
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
