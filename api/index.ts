// CommonJS entry for Vercel serverless (api/package.json overrides "type":"module").
// @vercel/node bundles this file with ncc, resolving all TypeScript imports from server.ts.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { default: handler } = require('../server');
module.exports = handler;
