// Vercel serverless entry point — re-exports the Express handler from server.ts.
// @vercel/node bundles this with esbuild, resolving all TypeScript imports correctly.
export { default } from '../server';
