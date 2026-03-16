import { openapi } from '@/lib/openapi';
import { createAPIPage } from 'fumadocs-openapi/ui';
import { createCodeUsageGeneratorRegistry } from 'fumadocs-openapi/requests/generators';
import { registerDefault } from 'fumadocs-openapi/requests/generators/all';
import client from './api-page.client';

const codeUsages = createCodeUsageGeneratorRegistry();
registerDefault(codeUsages);

export const APIPage = createAPIPage(openapi, { client, codeUsages });
