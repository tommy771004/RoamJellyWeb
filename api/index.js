'use strict';
// CJS entry for Vercel serverless.
// _server.cjs is pre-bundled by esbuild during vercel-build — fully self-contained,
// no runtime import resolution needed.
module.exports = require('./_server.cjs').default;
