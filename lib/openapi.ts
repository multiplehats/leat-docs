import { createOpenAPI } from 'fumadocs-openapi/server';
import { resolve } from 'path';

// Resolves to the same absolute path that generateFiles() writes into the MDX document= prop
const schemaPath = resolve('./leat-openapi.yaml');

export const openapi = createOpenAPI({
  // The OpenAPI schema, generated from the Postman collection at developer.leat.com
  // Re-generate by running: pnpm generate-api
  input: [schemaPath],
  proxyUrl: '/api/openapi-proxy',
});
