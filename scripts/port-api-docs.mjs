#!/usr/bin/env node
/**
 * port-api-docs.mjs
 *
 * Scrapes the Leat API documentation from docs.leat.com and converts it to
 * fumadocs-compatible MDX files under content/docs/api/.
 *
 * Run:   node scripts/port-api-docs.mjs
 * Flags: --dry-run   Print what would be written without writing files
 *        --page <slug>  Only scrape one page (e.g. --page v3/authentication)
 */

import { createRequire } from 'module';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { parse } = require('node-html-parser');
const TurndownService = require('turndown');

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONTENT_DIR = join(ROOT, 'content', 'docs', 'api');
const BASE_URL = 'https://docs.leat.com';

const DRY_RUN = process.argv.includes('--dry-run');
const PAGE_FILTER = (() => {
  const idx = process.argv.indexOf('--page');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

// ---------------------------------------------------------------------------
// All pages to scrape — derived from the build manifest
// ---------------------------------------------------------------------------

/** @type {Array<{url: string, outputPath: string, title: string, section: string}>} */
const PAGES = [
  // Getting started
  { url: '/v3',                    outputPath: 'index.mdx',                          title: 'Introduction',          section: 'getting-started' },
  { url: '/v3/authentication',     outputPath: 'getting-started/authentication.mdx', title: 'Authentication',        section: 'getting-started' },
  { url: '/v3/testing',            outputPath: 'getting-started/testing.mdx',        title: 'Testing',               section: 'getting-started' },
  { url: '/v3/error-handling',     outputPath: 'getting-started/error-handling.mdx', title: 'Error Handling',        section: 'getting-started' },
  { url: '/v3/webhooks',           outputPath: 'getting-started/webhooks.mdx',       title: 'Webhooks',              section: 'getting-started' },
  { url: '/v3/loyalty-tokens',     outputPath: 'getting-started/loyalty-tokens.mdx', title: 'Loyalty Tokens',        section: 'getting-started' },
  { url: '/v3/register-api',       outputPath: 'getting-started/register-api.mdx',   title: 'Register API',          section: 'getting-started' },

  // Tutorials
  { url: '/v3/tutorials/pos',             outputPath: 'tutorials/pos.mdx',             title: 'POS Integration',       section: 'tutorials' },
  { url: '/v3/tutorials/kiosk',           outputPath: 'tutorials/kiosk.mdx',           title: 'Kiosk',                 section: 'tutorials' },
  { url: '/v3/tutorials/order-at-table',  outputPath: 'tutorials/order-at-table.mdx',  title: 'Order at Table',        section: 'tutorials' },
  { url: '/v3/tutorials/migrate-to-v3',   outputPath: 'tutorials/migrate-to-v3.mdx',   title: 'Migrate to V3',         section: 'tutorials' },

  // OAuth API — Admin
  { url: '/v3/oauth/shops',                       outputPath: 'oauth/shops.mdx',                       title: 'Shops',                       section: 'oauth' },
  { url: '/v3/oauth/custom-attributes',           outputPath: 'oauth/custom-attributes.mdx',           title: 'Custom Attributes',           section: 'oauth' },
  { url: '/v3/oauth/custom-attribute-groups',     outputPath: 'oauth/custom-attribute-groups.mdx',     title: 'Custom Attribute Groups',     section: 'oauth' },
  { url: '/v3/oauth/brand-kit',                   outputPath: 'oauth/brand-kit.mdx',                   title: 'Brand Kit',                   section: 'oauth' },
  { url: '/v3/oauth/subscription-types',          outputPath: 'oauth/subscription-types.mdx',          title: 'Subscription Types',          section: 'oauth' },

  // OAuth API — CRM
  { url: '/v3/oauth/contacts',                    outputPath: 'oauth/contacts.mdx',                    title: 'Contacts',                    section: 'oauth' },
  { url: '/v3/oauth/contact-identifiers',         outputPath: 'oauth/contact-identifiers.mdx',         title: 'Contact Identifiers',         section: 'oauth' },
  { url: '/v3/oauth/contact-session-tokens',      outputPath: 'oauth/contact-session-tokens.mdx',      title: 'Contact Session Tokens',      section: 'oauth' },
  { url: '/v3/oauth/contact-subscriptions',       outputPath: 'oauth/contact-subscriptions.mdx',       title: 'Contact Subscriptions',       section: 'oauth' },
  { url: '/v3/oauth/contact-verification',        outputPath: 'oauth/contact-verification.mdx',        title: 'Contact Verification',        section: 'oauth' },
  { url: '/v3/oauth/referrals',                   outputPath: 'oauth/referrals.mdx',                   title: 'Referrals',                   section: 'oauth' },
  { url: '/v3/oauth/tiers',                       outputPath: 'oauth/tiers.mdx',                       title: 'Tiers',                       section: 'oauth' },

  // OAuth API — Orders
  { url: '/v3/oauth/orders',                      outputPath: 'oauth/orders.mdx',                      title: 'Orders',                      section: 'oauth' },
  { url: '/v3/oauth/order-returns',               outputPath: 'oauth/order-returns.mdx',               title: 'Order Returns',               section: 'oauth' },
  { url: '/v3/oauth/products',                    outputPath: 'oauth/products.mdx',                    title: 'Products',                    section: 'oauth' },
  { url: '/v3/oauth/categories',                  outputPath: 'oauth/categories.mdx',                  title: 'Categories',                  section: 'oauth' },

  // OAuth API — Bookings & Visits
  { url: '/v3/oauth/bookings',                    outputPath: 'oauth/bookings.mdx',                    title: 'Bookings',                    section: 'oauth' },
  { url: '/v3/oauth/visits',                      outputPath: 'oauth/visits.mdx',                      title: 'Visits',                      section: 'oauth' },

  // OAuth API — Loyalty & Rewards
  { url: '/v3/oauth/loyalty-program',             outputPath: 'oauth/loyalty-program.mdx',             title: 'Loyalty Program Settings',    section: 'oauth' },
  { url: '/v3/oauth/loyalty-transactions',        outputPath: 'oauth/loyalty-transactions.mdx',        title: 'Loyalty Transactions',        section: 'oauth' },
  { url: '/v3/oauth/credit-receptions',           outputPath: 'oauth/credit-receptions.mdx',           title: 'Credit Receptions',           section: 'oauth' },
  { url: '/v3/oauth/rewards',                     outputPath: 'oauth/rewards.mdx',                     title: 'Rewards',                     section: 'oauth' },
  { url: '/v3/oauth/reward-receptions',           outputPath: 'oauth/reward-receptions.mdx',           title: 'Reward Receptions',           section: 'oauth' },
  { url: '/v3/oauth/collectable-rewards',         outputPath: 'oauth/collectable-rewards.mdx',         title: 'Collectable Rewards',         section: 'oauth' },
  { url: '/v3/oauth/perks',                       outputPath: 'oauth/perks.mdx',                       title: 'Perks',                       section: 'oauth' },
  { url: '/v3/oauth/units',                       outputPath: 'oauth/units.mdx',                       title: 'Units',                       section: 'oauth' },

  // OAuth API — Promotions & Vouchers
  { url: '/v3/oauth/promotions',                  outputPath: 'oauth/promotions.mdx',                  title: 'Promotions',                  section: 'oauth' },
  { url: '/v3/oauth/vouchers',                    outputPath: 'oauth/vouchers.mdx',                    title: 'Vouchers',                    section: 'oauth' },

  // OAuth API — Giftcard & Prepaid
  { url: '/v3/oauth/giftcards',                   outputPath: 'oauth/giftcards.mdx',                   title: 'Giftcards',                   section: 'oauth' },
  { url: '/v3/oauth/giftcard-transactions',       outputPath: 'oauth/giftcard-transactions.mdx',       title: 'Giftcard Transactions',       section: 'oauth' },
  { url: '/v3/oauth/giftcard-programs',           outputPath: 'oauth/giftcard-programs.mdx',           title: 'Giftcard Programs',           section: 'oauth' },
  { url: '/v3/oauth/prepaid-transactions',        outputPath: 'oauth/prepaid-transactions.mdx',        title: 'Prepaid Transactions',        section: 'oauth' },

  // OAuth API — Portal Sessions
  { url: '/v3/oauth/portal-sessions',             outputPath: 'oauth/portal-sessions.mdx',             title: 'Portal Sessions',             section: 'oauth' },

  // OAuth API — Webhooks
  { url: '/v3/oauth/webhooks',                    outputPath: 'oauth/webhooks.mdx',                    title: 'Webhooks',                    section: 'oauth' },

  // OAuth API — Miscellaneous
  { url: '/v3/oauth/forms',                       outputPath: 'oauth/forms.mdx',                       title: 'Forms',                       section: 'oauth' },
  { url: '/v3/oauth/automations',                 outputPath: 'oauth/automations.mdx',                 title: 'Automations',                 section: 'oauth' },
  { url: '/v3/oauth/contacts-portal',             outputPath: 'oauth/contacts-portal.mdx',             title: 'Contacts Portal',             section: 'oauth' },

  // Register API
  { url: '/v3/registers',                         outputPath: 'registers/index.mdx',                   title: 'Register API Overview',       section: 'registers' },
  { url: '/v3/registers/authorization',           outputPath: 'registers/authorization.mdx',           title: 'Authorization',               section: 'registers' },
  { url: '/v3/registers/contacts',                outputPath: 'registers/contacts.mdx',                title: 'Contacts',                    section: 'registers' },
  { url: '/v3/registers/contact-identifiers',     outputPath: 'registers/contact-identifiers.mdx',     title: 'Contact Identifiers',         section: 'registers' },
  { url: '/v3/registers/contact-session-tokens',  outputPath: 'registers/contact-session-tokens.mdx',  title: 'Contact Session Tokens',      section: 'registers' },
  { url: '/v3/registers/contact-subscriptions',   outputPath: 'registers/contact-subscriptions.mdx',   title: 'Contact Subscriptions',       section: 'registers' },
  { url: '/v3/registers/credit-receptions',       outputPath: 'registers/credit-receptions.mdx',       title: 'Credit Receptions',           section: 'registers' },
  { url: '/v3/registers/loyalty-program',         outputPath: 'registers/loyalty-program.mdx',         title: 'Loyalty Program Settings',    section: 'registers' },
  { url: '/v3/registers/rewards',                 outputPath: 'registers/rewards.mdx',                 title: 'Rewards',                     section: 'registers' },
  { url: '/v3/registers/reward-receptions',       outputPath: 'registers/reward-receptions.mdx',       title: 'Reward Receptions',           section: 'registers' },
  { url: '/v3/registers/collectable-rewards',     outputPath: 'registers/collectable-rewards.mdx',     title: 'Collectable Rewards',         section: 'registers' },
  { url: '/v3/registers/perks',                   outputPath: 'registers/perks.mdx',                   title: 'Perks',                       section: 'registers' },
  { url: '/v3/registers/units',                   outputPath: 'registers/units.mdx',                   title: 'Units',                       section: 'registers' },
  { url: '/v3/registers/orders',                  outputPath: 'registers/orders.mdx',                  title: 'Orders',                      section: 'registers' },
  { url: '/v3/registers/order-returns',           outputPath: 'registers/order-returns.mdx',           title: 'Order Returns',               section: 'registers' },
  { url: '/v3/registers/products',                outputPath: 'registers/products.mdx',                title: 'Products',                    section: 'registers' },
  { url: '/v3/registers/categories',              outputPath: 'registers/categories.mdx',              title: 'Categories',                  section: 'registers' },
  { url: '/v3/registers/bookings',                outputPath: 'registers/bookings.mdx',                title: 'Bookings',                    section: 'registers' },
  { url: '/v3/registers/visits',                  outputPath: 'registers/visits.mdx',                  title: 'Visits',                      section: 'registers' },
  { url: '/v3/registers/giftcards',               outputPath: 'registers/giftcards.mdx',               title: 'Giftcards',                   section: 'registers' },
  { url: '/v3/registers/giftcard-transactions',   outputPath: 'registers/giftcard-transactions.mdx',   title: 'Giftcard Transactions',       section: 'registers' },
  { url: '/v3/registers/prepaid-transactions',    outputPath: 'registers/prepaid-transactions.mdx',    title: 'Prepaid Transactions',        section: 'registers' },
  { url: '/v3/registers/promotions',              outputPath: 'registers/promotions.mdx',              title: 'Promotions',                  section: 'registers' },
  { url: '/v3/registers/vouchers',                outputPath: 'registers/vouchers.mdx',                title: 'Vouchers',                    section: 'registers' },
  { url: '/v3/registers/portal-sessions',         outputPath: 'registers/portal-sessions.mdx',         title: 'Portal Sessions',             section: 'registers' },
  { url: '/v3/registers/custom-attributes',       outputPath: 'registers/custom-attributes.mdx',       title: 'Custom Attributes',           section: 'registers' },
  { url: '/v3/registers/custom-attribute-groups', outputPath: 'registers/custom-attribute-groups.mdx', title: 'Custom Attribute Groups',     section: 'registers' },
  { url: '/v3/registers/subscription-types',      outputPath: 'registers/subscription-types.mdx',      title: 'Subscription Types',          section: 'registers' },
  { url: '/v3/registers/pos-transactions',        outputPath: 'registers/pos-transactions.mdx',        title: 'POS Transactions',            section: 'registers' },
];

// ---------------------------------------------------------------------------
// Turndown configuration
// ---------------------------------------------------------------------------

const td = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  hr: '---',
});

// Preserve <code> blocks as inline code
td.addRule('inlineCode', {
  filter: (node) => node.nodeName === 'CODE' && node.parentNode.nodeName !== 'PRE',
  replacement: (content) => '`' + content.replace(/`/g, '\\`') + '`',
});

// Convert the method badges (e.g. "GET", "POST") to bold text
td.addRule('methodBadge', {
  filter: (node) =>
    node.nodeName === 'SPAN' &&
    /\b(GET|POST|PUT|PATCH|DELETE)\b/.test(node.textContent),
  replacement: (content) => `**${content.trim()}**`,
});

// Strip SVG elements (copy icons etc.)
td.addRule('svg', {
  filter: 'svg',
  replacement: () => '',
});

// Strip button elements (copy buttons)
td.addRule('button', {
  filter: 'button',
  replacement: () => '',
});

// Handle fenced code blocks with language class
td.addRule('fencedCodeBlock', {
  filter: (node) =>
    node.nodeName === 'PRE' &&
    node.firstChild &&
    node.firstChild.nodeName === 'CODE',
  replacement: (_content, node) => {
    const codeEl = node.firstChild;
    const langClass = codeEl.getAttribute('class') || '';
    const lang = (langClass.match(/language-(\w+)/) || [])[1] || 'json';
    const code = codeEl.textContent || '';
    return `\n\n\`\`\`${lang}\n${code.trim()}\n\`\`\`\n\n`;
  },
});

// ---------------------------------------------------------------------------
// Post-processing helpers
// ---------------------------------------------------------------------------

/**
 * Rewrites internal links from the old docs.leat.com URL format to the new
 * docs structure under /api-reference/.
 *
 * Applied to all pages.
 */
function fixInternalLinks(body) {
  return body
    .replace(/\(\/v3\/oauth\//g, '(/api-reference/oauth/')
    .replace(/\(\/v3\/tutorials\//g, '(/api-reference/tutorials/')
    .replace(/\(\/v3\/registers\//g, '(/api-reference/registers/')
    .replace(/\(\/v3\)/g, '(/api-reference)')
    .replace(/\(\/v3\//g, '(/api-reference/')
    // Also handle links with docs.leat.com prefix
    .replace(/\(https:\/\/docs\.leat\.com\/v3\/oauth\//g, '(/api-reference/oauth/')
    .replace(/\(https:\/\/docs\.leat\.com\/v3\/tutorials\//g, '(/api-reference/tutorials/')
    .replace(/\(https:\/\/docs\.leat\.com\/v3\/registers\//g, '(/api-reference/registers/')
    .replace(/\(https:\/\/docs\.leat\.com\/v3\)/g, '(/api-reference)')
    .replace(/\(https:\/\/docs\.leat\.com\/v3\//g, '(/api-reference/');
}

/**
 * Cleans up tutorial pages (pos, kiosk, order-at-table) that contain
 * interactive UI previews which don't scrape well.
 *
 * Removes:
 * - Duplicate sections (the interactive preview copies)
 * - Orphaned standalone numbers ("1", "2", "3" on their own line)
 * - Fake UI elements (cart items, button links pointing to anchors on the same page)
 *
 * Applied to pages in the 'tutorials' section (except migrate-to-v3).
 */
function cleanTutorialPage(body) {
  const lines = body.split('\n');
  const cleaned = [];

  // Track headings we've already seen to detect duplicate sections
  const seenHeadings = new Set();
  let skipUntilNextHeading = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Remove orphaned standalone numbers (from step indicators in interactive previews)
    if (/^\d{1,2}$/.test(trimmed)) {
      continue;
    }

    // Remove fake UI cart items and anchor-only button links
    // e.g. [Add to cart](#) or [Button Text](#some-anchor)
    if (/^\[.*\]\(#[^)]*\)\s*$/.test(trimmed)) {
      continue;
    }

    // Detect duplicate heading sections
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const headingText = headingMatch[2].trim();
      if (seenHeadings.has(headingText)) {
        // This is a duplicate section — skip until next heading of same or higher level
        skipUntilNextHeading = true;
        continue;
      }
      seenHeadings.add(headingText);

      if (skipUntilNextHeading) {
        skipUntilNextHeading = false;
      }
    }

    if (skipUntilNextHeading) {
      continue;
    }

    cleaned.push(line);
  }

  return cleaned.join('\n')
    // Collapse excessive blank lines left by removals
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Cleans up the error-handling page where error code tables get scraped
 * with everything incorrectly wrapped in backticks.
 *
 * Applied when outputPath matches 'getting-started/error-handling.mdx'.
 */
function cleanErrorHandlingPage(body) {
  // Fix rows where the entire cell content is wrapped in backticks
  // e.g. | `400` | `Bad Request` | `The request was invalid` |
  // should be: | 400 | Bad Request | The request was invalid |
  // But keep actual code values (like error codes) in backticks.

  // Remove backticks wrapping plain English phrases in table cells
  // Match table rows and selectively clean them
  body = body.replace(/\|([^|]*)\|/g, (match, cell) => {
    // Remove backticks from cells that contain full English descriptions
    // (more than 2 words or containing spaces)
    const trimmed = cell.trim();
    if (/^`[^`]+`$/.test(trimmed)) {
      const inner = trimmed.slice(1, -1);
      // Keep backticks for: HTTP status codes, error code strings, URLs, paths
      if (/^\d{3}$/.test(inner) || /^[A-Z_]+$/.test(inner) || inner.startsWith('/') || inner.startsWith('http')) {
        return match; // keep backticks for code-like values
      }
      // Remove backticks from descriptive text
      if (inner.includes(' ') && inner.length > 10) {
        return `| ${inner} |`;
      }
    }
    return match;
  });

  // Fix cases where backtick-wrapped content spans create broken markdown
  // e.g. ``code`` → `code`
  body = body.replace(/``([^`]+)``/g, '`$1`');

  // Fix empty backtick pairs
  body = body.replace(/`\s*`/g, '');

  return body;
}

// ---------------------------------------------------------------------------
// HTML → clean MDX conversion
// ---------------------------------------------------------------------------

/**
 * Fetches a URL and returns the text content.
 * Retries once on transient failures.
 */
async function fetchPage(url, attempt = 1) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; leat-docs-porter/1.0)',
        Accept: 'text/html',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.text();
  } catch (err) {
    if (attempt < 3) {
      console.warn(`  Retrying ${url} (attempt ${attempt + 1})…`);
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      return fetchPage(url, attempt + 1);
    }
    throw err;
  }
}

/**
 * Extracts the <main> inner HTML from a fetched page.
 */
function extractMain(html) {
  const root = parse(html);
  const main = root.querySelector('main');
  if (!main) throw new Error('No <main> element found');
  // The actual content wrapper is one level deep
  const inner = main.querySelector('div > div') || main;
  return inner;
}

/**
 * Decode common HTML entities.
 */
function decodeEntities(str) {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Cleans up a raw HTML string before Turndown:
 * - Fixes broken internal hrefs (e.g. /v3https://...)
 * - Fixes react-syntax-highlighter code blocks (strips line numbers, wraps in <pre>)
 */
function cleanHtml(html) {
  // Fix malformed hrefs like /v3https://...
  html = html.replace(/href="\/v3https?:\/\//g, 'href="https://');

  // Use the DOM parser to properly handle react-syntax-highlighter blocks.
  // These contain two <code> children:
  //   1. Line numbers (code style includes "float:left")
  //   2. Actual highlighted code
  const root = parse(html);

  // Find all dark-background spans that contain the code blocks
  for (const span of root.querySelectorAll('span')) {
    const style = span.getAttribute('style') || '';
    if (!style.includes('background:#282a36')) continue;

    const codes = span.querySelectorAll('code');
    if (codes.length === 0) continue;

    // Separate line-numbers code from actual code
    const lineNumCode = codes.find((c) => (c.getAttribute('style') || '').includes('float:left'));
    const actualCode = codes.find((c) => c !== lineNumCode);

    if (lineNumCode) lineNumCode.remove();

    const codeEl = actualCode || codes[0];
    // Get plain text, stripping all inner spans (syntax highlighting)
    const rawText = decodeEntities(
      codeEl.innerHTML
        .replace(/<span[^>]*>/g, '')
        .replace(/<\/span>/g, '')
        .replace(/<br\s*\/?>/gi, '\n')
    );

    // Detect language: JSON-like vs URL
    const lang = rawText.trim().startsWith('{') || rawText.trim().startsWith('[')
      ? 'json'
      : rawText.trim().startsWith('http')
      ? 'text'
      : 'json';

    // Replace the entire span with a clean <pre><code>
    span.replaceWith(parse(`<pre><code class="language-${lang}">${rawText.trim()}</code></pre>`));
  }

  // Remove "Show more / Show less" cursor-pointer toggle divs
  for (const div of root.querySelectorAll('div')) {
    const cls = div.getAttribute('class') || '';
    if (cls.includes('cursor-pointer') && div.textContent.trim().startsWith('Show')) {
      div.remove();
    }
  }

  // Remove copy buttons
  for (const btn of root.querySelectorAll('button')) {
    btn.remove();
  }

  return root.toString();
}

/**
 * Converts a section element into Markdown.
 * Handles both prose sections and API endpoint sections.
 */
function sectionToMarkdown(sectionEl) {
  // Remove anchor div used for deep linking (e.g. <div id="list-contact" …>)
  for (const anchor of sectionEl.querySelectorAll('div[id]')) {
    if (!anchor.querySelector('h1,h2,h3,h4,h5,h6,p,ul,ol')) {
      anchor.remove();
    }
  }

  // Remove "Related" footer section from individual sections if it crept in
  for (const related of sectionEl.querySelectorAll('div.pb-12')) {
    related.remove();
  }

  const rawHtml = cleanHtml(sectionEl.innerHTML);
  let md = td.turndown(rawHtml);

  // Clean up artefacts
  md = md
    .replace(/\n{3,}/g, '\n\n')   // collapse excess blank lines
    .replace(/\\([`*_{}[\]()#+\-.!])/g, '$1') // unescape turndown over-escaping
    .trim();

  return md;
}

/**
 * Converts a full page DOM to frontmatter + MDX body.
 */
function pageToMdx(pageTitle, innerEl) {
  // Remove the page heading if it duplicates the frontmatter title
  const titleEl = innerEl.querySelector('h2.title, h1.title');
  if (titleEl) titleEl.remove();

  const sections = innerEl.querySelectorAll('section');

  let body = '';

  if (sections.length > 0) {
    // Structured page with <section> blocks
    const parts = [];
    for (const sec of sections) {
      const md = sectionToMarkdown(sec);
      if (md) parts.push(md);
    }
    body = parts.join('\n\n---\n\n');
  } else {
    // Fallback: convert whatever is in the inner div
    const rawHtml = cleanHtml(innerEl.innerHTML);
    body = td.turndown(rawHtml)
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // Remove the "Related" block at the very bottom of the body
  body = body.replace(/\n+#{2,3}\s*Related[\s\S]*$/, '').trim();

  const description = extractDescription(body);

  const frontmatter = [
    '---',
    `title: "${pageTitle.replace(/"/g, '\\"')}"`,
    description ? `description: "${description.replace(/"/g, '\\"')}"` : '',
    '---',
  ].filter(Boolean).join('\n');

  return `${frontmatter}\n\n${body}\n`;
}

/**
 * Extracts the first sentence/paragraph as a description for the frontmatter.
 */
function extractDescription(markdown) {
  const lines = markdown.split('\n').map((l) => l.trim());
  for (const line of lines) {
    if (!line || line.startsWith('#') || line.startsWith('---') || line.startsWith('|')) continue;
    // Strip markdown formatting
    const plain = line
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .slice(0, 160);
    if (plain.length > 20) return plain;
  }
  return '';
}

// ---------------------------------------------------------------------------
// Meta.json builders — create fumadocs sidebar navigation
// ---------------------------------------------------------------------------

/**
 * Writes meta.json files for each section of the API docs.
 */
function writeMeta() {
  const sections = {
    // NOTE: The root meta.json lists 'oauth' and 'registers' as sections.
    // generate-api-docs.mjs also writes files into the oauth/ directory
    // (from the Postman/OpenAPI conversion). Both scripts share the same
    // output directory (content/docs/api/) — run port-api-docs.mjs first
    // to create the directory structure and meta.json files, then run
    // generate-api-docs.mjs to add the OpenAPI-derived endpoint pages.
    root: {
      path: CONTENT_DIR,
      meta: {
        title: 'API Reference',
        pages: ['index', 'getting-started', 'tutorials', 'oauth', 'registers'],
      },
    },
    'getting-started': {
      path: join(CONTENT_DIR, 'getting-started'),
      meta: {
        title: 'Getting Started',
        pages: [
          'authentication',
          'testing',
          'error-handling',
          'webhooks',
          'loyalty-tokens',
          'register-api',
        ],
      },
    },
    tutorials: {
      path: join(CONTENT_DIR, 'tutorials'),
      meta: {
        title: 'Tutorials',
        pages: ['pos', 'kiosk', 'order-at-table', 'migrate-to-v3'],
      },
    },
    oauth: {
      path: join(CONTENT_DIR, 'oauth'),
      meta: {
        title: 'OAuth API',
        pages: [
          '--- Admin ---',
          'shops',
          'custom-attributes',
          'custom-attribute-groups',
          'brand-kit',
          'subscription-types',
          '--- CRM ---',
          'contacts',
          'contact-identifiers',
          'contact-session-tokens',
          'contact-subscriptions',
          'contact-verification',
          'referrals',
          'tiers',
          '--- Orders API ---',
          'orders',
          'order-returns',
          'products',
          'categories',
          '--- Bookings & Visits ---',
          'bookings',
          'visits',
          '--- Loyalty & Rewards ---',
          'loyalty-program',
          'loyalty-transactions',
          'credit-receptions',
          'rewards',
          'reward-receptions',
          'collectable-rewards',
          'perks',
          'units',
          '--- Promotions & Vouchers ---',
          'promotions',
          'vouchers',
          '--- Giftcard & Prepaid ---',
          'giftcards',
          'giftcard-transactions',
          'giftcard-programs',
          'prepaid-transactions',
          '--- Portal Sessions ---',
          'portal-sessions',
          '--- Webhooks ---',
          'webhooks',
          '--- Miscellaneous ---',
          'forms',
          'automations',
          'contacts-portal',
        ],
      },
    },
    registers: {
      path: join(CONTENT_DIR, 'registers'),
      meta: {
        title: 'Register API',
        pages: [
          'index',
          'authorization',
          '--- Contacts ---',
          'contacts',
          'contact-identifiers',
          'contact-session-tokens',
          'contact-subscriptions',
          '--- Loyalty ---',
          'credit-receptions',
          'loyalty-program',
          'rewards',
          'reward-receptions',
          'collectable-rewards',
          'perks',
          'units',
          '--- Orders ---',
          'orders',
          'order-returns',
          'products',
          'categories',
          '--- Bookings ---',
          'bookings',
          'visits',
          '--- Giftcard & Prepaid ---',
          'giftcards',
          'giftcard-transactions',
          'prepaid-transactions',
          '--- Promotions ---',
          'promotions',
          'vouchers',
          '--- Other ---',
          'portal-sessions',
          'custom-attributes',
          'custom-attribute-groups',
          'subscription-types',
          'pos-transactions',
        ],
      },
    },
  };

  for (const [key, { path, meta }] of Object.entries(sections)) {
    const metaPath = join(path, 'meta.json');
    if (DRY_RUN) {
      console.log(`[dry-run] Would write ${metaPath}`);
      continue;
    }
    mkdirSync(path, { recursive: true });
    writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
    console.log(`  Wrote meta.json → ${metaPath.replace(ROOT + '/', '')}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Leat API Docs Porter ===');
  console.log(`Output directory: ${CONTENT_DIR}`);
  if (DRY_RUN) console.log('DRY RUN — no files will be written');
  if (PAGE_FILTER) console.log(`Filtering to page: ${PAGE_FILTER}`);
  console.log('');

  // Write meta.json navigation files
  writeMeta();

  const pages = PAGE_FILTER
    ? PAGES.filter((p) => p.url.includes(PAGE_FILTER))
    : PAGES;

  let success = 0;
  let failed = 0;
  const failures = [];

  for (const page of pages) {
    const fullUrl = BASE_URL + page.url;
    const outFile = join(CONTENT_DIR, page.outputPath);

    process.stdout.write(`Scraping ${fullUrl} … `);

    try {
      const html = await fetchPage(fullUrl);
      const innerEl = extractMain(html);
      let mdx = pageToMdx(page.title, innerEl);

      // --- Post-processing ---

      // Fix internal links on all pages
      mdx = fixInternalLinks(mdx);

      // Clean up tutorial pages with interactive UI previews
      const interactiveTutorials = ['tutorials/pos', 'tutorials/kiosk', 'tutorials/order-at-table'];
      if (page.section === 'tutorials' && interactiveTutorials.some((t) => page.outputPath.includes(t))) {
        mdx = cleanTutorialPage(mdx);
      }

      // Fix error table scraping on the error-handling page
      if (page.outputPath === 'getting-started/error-handling.mdx') {
        mdx = cleanErrorHandlingPage(mdx);
      }

      if (DRY_RUN) {
        console.log(`[dry-run] Would write ${outFile.replace(ROOT + '/', '')}`);
        console.log('--- preview (first 300 chars) ---');
        console.log(mdx.slice(0, 300));
        console.log('---------------------------------\n');
      } else {
        mkdirSync(dirname(outFile), { recursive: true });
        writeFileSync(outFile, mdx, 'utf8');
        console.log(`OK → ${outFile.replace(ROOT + '/', '')}`);
      }

      success++;
    } catch (err) {
      console.error(`FAILED: ${err.message}`);
      failed++;
      failures.push({ url: fullUrl, error: err.message });
    }

    // Polite delay between requests
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log('');
  console.log(`=== Done: ${success} succeeded, ${failed} failed ===`);
  if (failures.length > 0) {
    console.log('\nFailed pages:');
    for (const f of failures) console.log(`  ${f.url}: ${f.error}`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
