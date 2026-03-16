#!/usr/bin/env node
/**
 * generate-api-docs.mjs
 *
 * Fetches the Leat Postman collection from developer.leat.com, converts it to
 * an OpenAPI 3.0 YAML spec, then uses fumadocs-openapi to generate MDX files
 * under content/docs/api/.
 *
 * Run:   pnpm generate-api
 * Flags: --skip-fetch   Re-use the existing leat-openapi.yaml (skip fetch+convert)
 *        --dry-run      Show what would be generated without writing files
 */

import { createRequire } from 'module';
import { writeFileSync, existsSync, mkdirSync, renameSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const p2o = require('postman-to-openapi');

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OPENAPI_FILE = join(ROOT, 'leat-openapi.yaml');
const CONTENT_DIR = join(ROOT, 'content', 'docs', 'api');

const SKIP_FETCH = process.argv.includes('--skip-fetch');
const DRY_RUN = process.argv.includes('--dry-run');

// Postman public collection endpoint (extracted from developer.leat.com HTML metadata)
const COLLECTION_URL =
  'https://developer.leat.com/api/collections/498877/S1Lu29Kw' +
  '?environment=498877-eadf6451-da19-4fd6-523a-fcba585ced03&segregateAuth=true&versionTag=latest';

// ---------------------------------------------------------------------------
// Step 1 — Fetch Postman collection and convert to OpenAPI
// ---------------------------------------------------------------------------

async function fetchAndConvert() {
  console.log('Fetching Postman collection from developer.leat.com…');
  const res = await fetch(COLLECTION_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; leat-docs-porter/1.0)' },
  });
  if (!res.ok) throw new Error(`Failed to fetch collection: HTTP ${res.status}`);
  const collection = await res.json();

  // Write the raw Postman collection to a temp file so p2o can read it
  const tmpFile = join(ROOT, '.postman-collection.tmp.json');
  writeFileSync(tmpFile, JSON.stringify(collection, null, 2));

  console.log('Converting Postman collection to OpenAPI 3.0…');
  await p2o(tmpFile, OPENAPI_FILE, {
    defaultTag: 'API',
    servers: [{ url: 'https://api.leat.com', description: 'Production' }],
    pathDepth: 2,
  });

  // Clean up temp file
  try {
    const { unlinkSync } = require('fs');
    unlinkSync(tmpFile);
  } catch {}

  console.log(`OpenAPI spec written to leat-openapi.yaml`);
}

// ---------------------------------------------------------------------------
// Step 1.5 — Patch the generated OpenAPI spec for fumadocs-openapi compatibility
// ---------------------------------------------------------------------------

async function patchSpec() {
  const { readFileSync, writeFileSync } = await import('fs');
  const yaml = await import('yaml');

  const raw = readFileSync(OPENAPI_FILE, 'utf8');
  const spec = yaml.parse(raw);

  let fixed = 0;
  for (const [, methods] of Object.entries(spec.paths || {})) {
    for (const [, data] of Object.entries(methods)) {
      if (typeof data !== 'object' || !data.requestBody) continue;
      const content = data.requestBody.content;
      // Empty content object causes fumadocs-openapi to crash
      if (content && Object.keys(content).length === 0) {
        data.requestBody.content = { 'application/json': { schema: { type: 'object' } } };
        fixed++;
        continue;
      }
      // Unsupported wildcard media type (*/*) causes fumadocs-openapi to crash
      const SUPPORTED = new Set(['application/json','multipart/form-data','application/x-www-form-urlencoded','text/plain','application/octet-stream']);
      if (content) {
        for (const mt of Object.keys(content)) {
          if (!SUPPORTED.has(mt)) {
            const schema = content[mt];
            delete content[mt];
            content['application/json'] = schema;
            fixed++;
          }
        }
      }
    }
  }

  if (fixed > 0) {
    writeFileSync(OPENAPI_FILE, yaml.stringify(spec));
    console.log(`Patched ${fixed} endpoints with empty requestBody.content`);
  }
}

// ---------------------------------------------------------------------------
// Step 2 — Generate MDX files via fumadocs-openapi
// ---------------------------------------------------------------------------

async function generateMdx() {
  // Dynamically import fumadocs-openapi (ESM)
  const { generateFiles } = await import('fumadocs-openapi');
  const { createOpenAPI } = await import('fumadocs-openapi/server');

  // Use a relative path so the MDX document= props are environment-independent.
  // fumadocs-openapi resolves relative paths against process.cwd() (the project root),
  // so 'leat-openapi.yaml' works identically in local dev, CI, and Vercel.
  const openapi = createOpenAPI({
    input: ['leat-openapi.yaml'],
  });

  console.log(`Generating MDX files → ${CONTENT_DIR.replace(ROOT + '/', '')}/`);

  if (DRY_RUN) {
    console.log('[dry-run] Would call generateFiles() — skipping actual write');
    return;
  }

  await generateFiles({
    input: openapi,
    output: CONTENT_DIR,
    includeDescription: true,
    // Group pages by the first tag segment (e.g. "OAuth v3 > Clients > Contacts" → oauth-v3/)
    // fumadocs-openapi will create subdirectories based on tags
  });

  console.log('MDX files generated.');
}

// ---------------------------------------------------------------------------
// Step 3 — Reorganise the flat oauth/clients/ output into logical groups
// ---------------------------------------------------------------------------

// Maps group folder name → the endpoint folder names that belong to it.
// Endpoint folders that share a name with their group (orders, bookings,
// promotions) stay in place — they become part of the group automatically.
const OAUTH_GROUPS = {
  admin:      ['shops', 'custom-attributes', 'custom-attribute-groups', 'brand-kit', 'subscription-types'],
  crm:        ['contacts', 'contact-identifiers', 'contact-session-tokens', 'contact-subscriptions', 'contact-verification', 'referrals', 'tiers'],
  orders:     ['order-returns', 'products', 'product-categories'],
  bookings:   ['visits'],
  loyalty:    ['loyalty-program', 'loyalty-transactions', 'loyalty-tokens', 'loyalty-transaction-attributes', 'credit-receptions', 'rewards', 'reward-receptions', 'reward-attributes', 'collectable-rewards', 'perks', 'units'],
  promotions: ['promotion-attributes', 'vouchers'],
  giftcard:   ['giftcards', 'giftcard-transactions', 'giftcard-programs', 'prepaid-transactions'],
  portal:     ['portal-sessions'],
  webhooks:   ['webhook-subscriptions'],
  misc:       ['forms', 'automations', 'contacts-portal', 'contact-attributes'],
};

const GROUP_TITLES = {
  admin:      'Admin',
  crm:        'CRM',
  orders:     'Orders API',
  bookings:   'Bookings & Visits',
  loyalty:    'Loyalty & Rewards',
  promotions: 'Promotions & Vouchers',
  giftcard:   'Giftcard & Prepaid',
  portal:     'Portal Sessions',
  webhooks:   'Webhooks',
  misc:       'Miscellaneous',
};

const GROUP_DESCRIPTIONS = {
  admin:      'Shop and account-level configuration endpoints.',
  crm:        'Contact management, sessions, subscriptions, referrals, and tiers.',
  orders:     'Orders, returns, products, and categories.',
  bookings:   'Bookings and visit tracking endpoints.',
  loyalty:    'Loyalty program, transactions, credits, rewards, tiers, and perks.',
  promotions: 'Promotional campaigns and voucher distribution.',
  giftcard:   'Gift card issuance, transactions, programs, and prepaid balances.',
  portal:     'Customer portal session management.',
  webhooks:   'Webhook subscription management.',
  misc:       'Forms, automations, contact attributes, and portal contacts.',
};

async function reorganiseOAuthDocs() {
  if (DRY_RUN) {
    console.log('[dry-run] Would reorganise oauth/clients/ into groups — skipping');
    return;
  }

  const clientsDir = join(CONTENT_DIR, 'oauth', 'clients');

  for (const [group, members] of Object.entries(OAUTH_GROUPS)) {
    const groupDir = join(clientsDir, group);
    mkdirSync(groupDir, { recursive: true });

    // Move member endpoint folders into the group
    for (const member of members) {
      const src = join(clientsDir, member);
      const dst = join(groupDir, member);
      if (existsSync(src)) {
        if (existsSync(dst)) rmSync(dst, { recursive: true });
        renameSync(src, dst);
      }
    }

    // Write index.mdx
    writeFileSync(join(groupDir, 'index.mdx'), [
      '---',
      `title: ${GROUP_TITLES[group]}`,
      `description: ${GROUP_DESCRIPTIONS[group]}`,
      '---',
    ].join('\n') + '\n');

    // Write meta.json — include index + all members that now exist in the folder
    const allMembers = existsSync(join(groupDir, group))
      ? [group, ...members]   // self-named folder (orders, bookings, promotions)
      : members;
    const pages = ['index', ...allMembers.filter(m => existsSync(join(groupDir, m)))];
    writeFileSync(
      join(groupDir, 'meta.json'),
      JSON.stringify({ title: GROUP_TITLES[group], pages }, null, 2) + '\n',
    );
  }

  // Rewrite oauth/meta.json to reference the groups
  const oauthMeta = {
    title: 'OAuth API',
    pages: Object.keys(OAUTH_GROUPS).map(g => `clients/${g}`),
  };
  writeFileSync(
    join(CONTENT_DIR, 'oauth', 'meta.json'),
    JSON.stringify(oauthMeta, null, 2) + '\n',
  );

  console.log('Reorganised oauth/clients/ into groups.');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Leat API Docs Generator ===');
  if (DRY_RUN) console.log('DRY RUN — no files will be written');
  console.log('');

  if (!SKIP_FETCH) {
    await fetchAndConvert();
  } else {
    if (!existsSync(OPENAPI_FILE)) {
      throw new Error('--skip-fetch was passed but leat-openapi.yaml does not exist. Run without --skip-fetch first.');
    }
    console.log('Skipping fetch — using existing leat-openapi.yaml');
  }

  await patchSpec();
  await generateMdx();
  await reorganiseOAuthDocs();

  console.log('\n=== Done ===');
  console.log('Next steps:');
  console.log('  1. Review content/docs/api/ for generated files');
  console.log('  2. Run `pnpm dev` to preview');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
