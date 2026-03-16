import { createOpenAPI } from 'fumadocs-openapi/server';

export const openapi = createOpenAPI({
  // Use a relative path so it resolves against process.cwd() (the project root)
  // in all environments — local dev, CI, and Vercel alike.
  input: ['leat-openapi.yaml'],
  proxyUrl: '/api/openapi-proxy',
});
