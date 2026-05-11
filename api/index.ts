// Vercel serverless entry — @vercel/node bundles this with ncc (enabled because
// "type":"module" is NOT in root package.json, so bundling is not suppressed).
export { default } from '../server';
