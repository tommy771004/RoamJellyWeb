import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

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

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    define: {
      'import.meta.env.VITE_OPENROUTER_API_KEY': JSON.stringify(env.VITE_OPENROUTER_API_KEY || env.OPENROUTER_API_KEY),
    },
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
