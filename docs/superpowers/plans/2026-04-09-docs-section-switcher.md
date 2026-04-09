# Docs Section Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a sidebar dropdown that switches between Getting Started, WordPress Plugin, and API Reference doc sections, each with its own URL prefix and isolated page tree.

**Architecture:** Three separate `defineDocs()` collections feed three `loader()` instances. Each section gets its own Next.js route group with a `DocsLayout` rendering the correct page tree plus a shared `RootToggle` dropdown component. LLM, OG, and search routes are updated to aggregate across all sources.

**Tech Stack:** Fumadocs v16 (fumadocs-core, fumadocs-mdx, fumadocs-ui), Next.js App Router, lucide-react

**Spec:** `docs/superpowers/specs/2026-04-09-docs-section-switcher-design.md`

**Note:** The current code uses Fumadocs-generated types like `PageProps<'/docs/[[...slug]]'>` and `LayoutProps<'/docs'>`. These are replaced with explicit inline types (e.g., `{ params: Promise<{ slug?: string[] }> }`) since the old route paths no longer exist.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `source.config.ts` | Three `defineDocs()` calls |
| Rewrite | `lib/source.ts` | Three `loader()` instances + updated helpers |
| Create | `components/docs-root-toggle.tsx` | Shared `RootToggle` component |
| Create | `content/docs/getting-started/meta.json` | Getting Started section nav |
| Create | `content/docs/getting-started/index.mdx` | Homepage content |
| Create | `app/(docs)/(getting-started)/layout.tsx` | Getting Started DocsLayout |
| Create | `app/(docs)/(getting-started)/[[...slug]]/page.tsx` | Getting Started page |
| Create | `app/(docs)/wordpress-plugin/layout.tsx` | WordPress DocsLayout |
| Create | `app/(docs)/wordpress-plugin/[[...slug]]/page.tsx` | WordPress page |
| Create | `app/(docs)/api-reference/layout.tsx` | API Reference DocsLayout |
| Create | `app/(docs)/api-reference/[[...slug]]/page.tsx` | API Reference page |
| Modify | `next.config.mjs` | Redirects + updated rewrites |
| Modify | `app/llms.txt/route.ts` | Aggregate LLM index across sources |
| Modify | `app/llms-full.txt/route.ts` | Aggregate LLM full text across sources |
| Delete | `app/llms.mdx/docs/[[...slug]]/route.ts` | Old single LLM MDX route |
| Create | `app/llms.mdx/[[...slug]]/route.ts` | Getting Started LLM MDX |
| Create | `app/llms.mdx/wordpress-plugin/[[...slug]]/route.ts` | WordPress LLM MDX |
| Create | `app/llms.mdx/api-reference/[[...slug]]/route.ts` | API Reference LLM MDX |
| Delete | `app/og/docs/[...slug]/route.tsx` | Old single OG route |
| Create | `app/og/[...slug]/route.tsx` | Getting Started OG images |
| Create | `app/og/wordpress-plugin/[...slug]/route.tsx` | WordPress OG images |
| Create | `app/og/api-reference/[...slug]/route.tsx` | API Reference OG images |
| Modify | `app/api/search/route.ts` | Multi-source search index |
| Delete | `app/(home)/layout.tsx` | Old home layout |
| Delete | `app/(home)/page.tsx` | Old home redirect page |
| Delete | `app/docs/layout.tsx` | Old docs layout |
| Delete | `app/docs/[[...slug]]/page.tsx` | Old docs page |
| Delete | `content/docs/index.mdx` | Old docs landing page |

---

## Task 1: Update Source Configuration

**Files:**
- Modify: `source.config.ts`
- Rewrite: `lib/source.ts`

- [ ] **Step 1: Update `source.config.ts` with three `defineDocs()` calls**

Replace the single `defineDocs` with three scoped collections:

```ts
import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';

const sharedDocs = {
  schema: pageSchema,
  postprocess: { includeProcessedMarkdown: true },
};

const sharedMeta = { schema: metaSchema };

export const gettingStartedDocs = defineDocs({
  dir: 'content/docs/getting-started',
  docs: sharedDocs,
  meta: sharedMeta,
});

export const wordpressDocs = defineDocs({
  dir: 'content/docs/wordpress-plugin',
  docs: sharedDocs,
  meta: sharedMeta,
});

export const apiDocs = defineDocs({
  dir: 'content/docs/api',
  docs: sharedDocs,
  meta: sharedMeta,
});

export default defineConfig({
  mdxOptions: {},
});
```

- [ ] **Step 2: Rewrite `lib/source.ts` with three loaders**

```ts
import { gettingStartedDocs, wordpressDocs, apiDocs } from 'collections/server';
import { type InferPageType, loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';

export const gettingStartedSource = loader({
  baseUrl: '/',
  source: gettingStartedDocs.toFumadocsSource(),
  plugins: [lucideIconsPlugin()],
});

export const wordpressSource = loader({
  baseUrl: '/wordpress-plugin',
  source: wordpressDocs.toFumadocsSource(),
  plugins: [lucideIconsPlugin()],
});

export const apiReferenceSource = loader({
  baseUrl: '/api-reference',
  source: apiDocs.toFumadocsSource(),
  plugins: [lucideIconsPlugin()],
});

type AnySource = typeof gettingStartedSource | typeof wordpressSource | typeof apiReferenceSource;

export function getPageImage(page: InferPageType<AnySource>, sectionPrefix = '') {
  const segments = [...page.slugs, 'image.webp'];
  return {
    segments,
    url: `/og${sectionPrefix}/${segments.join('/')}`,
  };
}

export async function getLLMText(page: InferPageType<AnySource>) {
  const processed = await page.data.getText('processed');
  return `# ${page.data.title}\n\n${processed}`;
}
```

- [ ] **Step 3: Commit**

```bash
git add source.config.ts lib/source.ts
git commit -m "refactor: split into three defineDocs and loader instances"
```

---

## Task 2: Create Getting Started Content

**Files:**
- Create: `content/docs/getting-started/meta.json`
- Create: `content/docs/getting-started/index.mdx`

- [ ] **Step 1: Create `content/docs/getting-started/meta.json`**

```json
{
  "title": "Getting Started",
  "pages": ["index"]
}
```

- [ ] **Step 2: Create `content/docs/getting-started/index.mdx`**

```mdx
---
title: Leat Docs
description: Documentation for the Leat platform, API, and WordPress plugin.
---

Welcome to the Leat documentation. Choose a section to get started.

<Cards>
  <Card
    title="WordPress Plugin"
    href="/wordpress-plugin"
    description="Set up the Leat WooCommerce plugin, configure earn rules and rewards, and build your loyalty dashboard."
  />
  <Card
    title="API Reference"
    href="/api-reference"
    description="Integrate with the Leat platform using our REST API."
  />
</Cards>
```

- [ ] **Step 3: Commit**

```bash
git add content/docs/getting-started/
git commit -m "feat: add getting-started content section"
```

---

## Task 3: Create Root Toggle Component

**Files:**
- Create: `components/docs-root-toggle.tsx`

- [ ] **Step 1: Create `components/docs-root-toggle.tsx`**

```tsx
import { RootToggle } from 'fumadocs-ui/components/layout/root-toggle';
import { BookOpen, Plug, Code } from 'lucide-react';

export function DocsRootToggle() {
  return (
    <RootToggle
      options={[
        {
          title: 'Getting Started',
          description: 'Introduction to Leat',
          url: '/',
          icon: <BookOpen />,
        },
        {
          title: 'WordPress Plugin',
          description: 'WooCommerce integration',
          url: '/wordpress-plugin',
          icon: <Plug />,
        },
        {
          title: 'API Reference',
          description: 'REST API documentation',
          url: '/api-reference',
          icon: <Code />,
        },
      ]}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/docs-root-toggle.tsx
git commit -m "feat: add DocsRootToggle sidebar dropdown component"
```

---

## Task 4: Create Section Route Groups

**Files:**
- Create: `app/(docs)/(getting-started)/layout.tsx`
- Create: `app/(docs)/(getting-started)/[[...slug]]/page.tsx`
- Create: `app/(docs)/wordpress-plugin/layout.tsx`
- Create: `app/(docs)/wordpress-plugin/[[...slug]]/page.tsx`
- Create: `app/(docs)/api-reference/layout.tsx`
- Create: `app/(docs)/api-reference/[[...slug]]/page.tsx`

- [ ] **Step 1: Create Getting Started layout**

Create `app/(docs)/(getting-started)/layout.tsx`:

```tsx
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { gettingStartedSource } from '@/lib/source';
import { baseOptions } from '@/lib/layout.shared';
import { DocsRootToggle } from '@/components/docs-root-toggle';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={gettingStartedSource.getPageTree()}
      {...baseOptions()}
      sidebar={{ banner: <DocsRootToggle /> }}
    >
      {children}
    </DocsLayout>
  );
}
```

- [ ] **Step 2: Create Getting Started page**

Create `app/(docs)/(getting-started)/[[...slug]]/page.tsx`:

```tsx
import { getPageImage, gettingStartedSource } from '@/lib/source';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/components/mdx';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { gitConfig } from '@/lib/layout.shared';

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = gettingStartedSource.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">
        {page.data.description}
      </DocsDescription>
      <div className="flex flex-row gap-2 items-center border-b pb-6">
        <MarkdownCopyButton markdownUrl={`${page.url}.mdx`} />
        <ViewOptionsPopover
          markdownUrl={`${page.url}.mdx`}
          githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/${page.path}`}
        />
      </div>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(gettingStartedSource, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return gettingStartedSource.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const params = await props.params;
  const page = gettingStartedSource.getPage(params.slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: { images: getPageImage(page).url },
  };
}
```

**Important:** Each section passes its prefix to `getPageImage`:
- Getting Started: `getPageImage(page)` (no prefix)
- WordPress Plugin: `getPageImage(page, '/wordpress-plugin')`
- API Reference: `getPageImage(page, '/api-reference')`

- [ ] **Step 3: Create WordPress Plugin layout**

Create `app/(docs)/wordpress-plugin/layout.tsx`:

```tsx
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { wordpressSource } from '@/lib/source';
import { baseOptions } from '@/lib/layout.shared';
import { DocsRootToggle } from '@/components/docs-root-toggle';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={wordpressSource.getPageTree()}
      {...baseOptions()}
      sidebar={{ banner: <DocsRootToggle /> }}
    >
      {children}
    </DocsLayout>
  );
}
```

- [ ] **Step 4: Create WordPress Plugin page**

Create `app/(docs)/wordpress-plugin/[[...slug]]/page.tsx` — identical to Getting Started page but replace `gettingStartedSource` with `wordpressSource` everywhere.

- [ ] **Step 5: Create API Reference layout**

Create `app/(docs)/api-reference/layout.tsx` — same pattern, using `apiReferenceSource`.

- [ ] **Step 6: Create API Reference page**

Create `app/(docs)/api-reference/[[...slug]]/page.tsx` — same pattern as WordPress page but using `apiReferenceSource`. The `getMDXComponents` call here should match the current API page behavior (it already includes `APIPage` via `getMDXComponents`).

- [ ] **Step 7: Commit**

```bash
git add app/(docs)/
git commit -m "feat: add section route groups with DocsLayout and RootToggle"
```

---

## Task 5: Update next.config.mjs

**Files:**
- Modify: `next.config.mjs`

- [ ] **Step 1: Add redirects and update rewrites**

Replace the current `next.config.mjs` content (keeping `createMDX` and `serverExternalPackages`):

```js
import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  serverExternalPackages: ['@takumi-rs/image-response'],
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/docs/wordpress-plugin/:path*',
        destination: '/wordpress-plugin/:path*',
        permanent: true,
      },
      {
        source: '/docs/api/:path*',
        destination: '/api-reference/:path*',
        permanent: true,
      },
      {
        source: '/docs',
        destination: '/',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      { source: '/wordpress-plugin/:path*.mdx', destination: '/llms.mdx/wordpress-plugin/:path*' },
      { source: '/api-reference/:path*.mdx', destination: '/llms.mdx/api-reference/:path*' },
      { source: '/:path*.mdx', destination: '/llms.mdx/:path*' },
    ];
  },
};

export default withMDX(config);
```

- [ ] **Step 2: Commit**

```bash
git add next.config.mjs
git commit -m "feat: add redirects from old URLs and update rewrite rules"
```

---

## Task 6: Remove Old Routes

Do this after Task 5 so redirects are in place before old URLs stop working.

**Files:**
- Delete: `app/(home)/layout.tsx`
- Delete: `app/(home)/page.tsx`
- Delete: `app/docs/layout.tsx`
- Delete: `app/docs/[[...slug]]/page.tsx`
- Delete: `content/docs/index.mdx`

- [ ] **Step 1: Delete old route files**

```bash
rm app/\(home\)/layout.tsx app/\(home\)/page.tsx
rmdir app/\(home\)
rm app/docs/\[\[...slug\]\]/page.tsx
rmdir app/docs/\[\[...slug\]\]
rm app/docs/layout.tsx
rmdir app/docs
rm content/docs/index.mdx
```

- [ ] **Step 2: Commit**

```bash
git add -A app/\(home\) app/docs content/docs/index.mdx
git commit -m "refactor: remove old home and docs routes"
```

---

## Task 7: Update LLM Routes

**Files:**
- Modify: `app/llms.txt/route.ts`
- Modify: `app/llms-full.txt/route.ts`
- Delete: `app/llms.mdx/docs/[[...slug]]/route.ts`
- Create: `app/llms.mdx/[[...slug]]/route.ts`
- Create: `app/llms.mdx/wordpress-plugin/[[...slug]]/route.ts`
- Create: `app/llms.mdx/api-reference/[[...slug]]/route.ts`

- [ ] **Step 1: Update `app/llms.txt/route.ts`**

```ts
import { gettingStartedSource, wordpressSource, apiReferenceSource } from '@/lib/source';
import { llms } from 'fumadocs-core/source';

export const revalidate = false;

export function GET() {
  const indices = [
    llms(gettingStartedSource).index(),
    llms(wordpressSource).index(),
    llms(apiReferenceSource).index(),
  ];
  return new Response(indices.join('\n\n'));
}
```

- [ ] **Step 2: Update `app/llms-full.txt/route.ts`**

```ts
import { getLLMText, gettingStartedSource, wordpressSource, apiReferenceSource } from '@/lib/source';

export const revalidate = false;

export async function GET() {
  const allPages = [
    ...gettingStartedSource.getPages(),
    ...wordpressSource.getPages(),
    ...apiReferenceSource.getPages(),
  ];
  const scanned = await Promise.all(allPages.map(getLLMText));
  return new Response(scanned.join('\n\n'));
}
```

- [ ] **Step 3: Delete old LLM MDX route and create per-section routes**

Delete `app/llms.mdx/docs/[[...slug]]/route.ts` and its parent directory.

Create `app/llms.mdx/[[...slug]]/route.ts` (Getting Started):

```ts
import { getLLMText, gettingStartedSource } from '@/lib/source';
import { notFound } from 'next/navigation';

export const revalidate = false;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  const page = gettingStartedSource.getPage(slug);
  if (!page) notFound();

  return new Response(await getLLMText(page), {
    headers: { 'Content-Type': 'text/markdown' },
  });
}

export function generateStaticParams() {
  return gettingStartedSource.generateParams();
}
```

Create `app/llms.mdx/wordpress-plugin/[[...slug]]/route.ts` — same pattern using `wordpressSource`.

Create `app/llms.mdx/api-reference/[[...slug]]/route.ts` — same pattern using `apiReferenceSource`.

- [ ] **Step 4: Commit**

```bash
git add app/llms.txt/ app/llms-full.txt/ app/llms.mdx/
git commit -m "refactor: update LLM routes for multi-source"
```

---

## Task 8: Update OG Image Routes

**Files:**
- Delete: `app/og/docs/[...slug]/route.tsx`
- Create: `app/og/[...slug]/route.tsx`
- Create: `app/og/wordpress-plugin/[...slug]/route.tsx`
- Create: `app/og/api-reference/[...slug]/route.tsx`

- [ ] **Step 1: Delete old OG route**

```bash
rm app/og/docs/\[...slug\]/route.tsx
rmdir app/og/docs/\[...slug\]
rmdir app/og/docs
```

- [ ] **Step 2: Create per-section OG routes**

Create `app/og/[...slug]/route.tsx` (Getting Started):

```tsx
import { getPageImage, gettingStartedSource } from '@/lib/source';
import { notFound } from 'next/navigation';
import { ImageResponse } from '@takumi-rs/image-response';
import { generate as DefaultImage } from 'fumadocs-ui/og/takumi';

export const revalidate = false;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const page = gettingStartedSource.getPage(slug.slice(0, -1));
  if (!page) notFound();

  return new ImageResponse(
    <DefaultImage
      title={page.data.title}
      description={page.data.description}
      site="Leat Docs"
    />,
    { width: 1200, height: 630, format: 'webp' },
  );
}

export function generateStaticParams() {
  return gettingStartedSource.getPages().map((page) => ({
    slug: getPageImage(page).segments,
  }));
}
```

Create `app/og/wordpress-plugin/[...slug]/route.tsx` — same pattern using `wordpressSource`.

Create `app/og/api-reference/[...slug]/route.tsx` — same pattern using `apiReferenceSource`.

**Note:** The `[...slug]` catch-all at `app/og/` will not conflict with the static `wordpress-plugin` and `api-reference` segments — Next.js prefers static segments over dynamic catch-alls (same pattern as the main page routes).

- [ ] **Step 3: Commit**

```bash
git add app/og/
git commit -m "refactor: split OG image routes per section"
```

---

## Task 9: Update Search Route

**Files:**
- Modify: `app/api/search/route.ts`

- [ ] **Step 1: Update search to index all sources**

```ts
import { gettingStartedSource, wordpressSource, apiReferenceSource } from '@/lib/source';
import { createSearchAPI } from 'fumadocs-core/search/server';

export const { GET } = createSearchAPI('advanced', {
  language: 'english',
  indexes: [
    ...gettingStartedSource.getPages(),
    ...wordpressSource.getPages(),
    ...apiReferenceSource.getPages(),
  ].map((page) => ({
    title: page.data.title,
    description: page.data.description,
    url: page.url,
    id: page.url,
    structuredData: page.data.structuredData,
  })),
});
```

- [ ] **Step 2: Commit**

```bash
git add app/api/search/route.ts
git commit -m "refactor: update search to index all doc sources"
```

---

## Task 10: Smoke Test

- [ ] **Step 1: Run the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify all routes work**

Check these URLs in the browser:
- `/` — Getting Started page with cards
- `/wordpress-plugin` — WordPress Plugin index
- `/wordpress-plugin/getting-started` — WordPress getting started page
- `/api-reference` — API Reference index
- `/api-reference/getting-started` — API getting started page

- [ ] **Step 3: Verify sidebar dropdown**

On any page, the sidebar should show a dropdown at the top. Clicking it should list "Getting Started", "WordPress Plugin", "API Reference". Selecting one should navigate to that section and update the sidebar tree.

- [ ] **Step 4: Verify redirects**

- `/docs` → redirects to `/`
- `/docs/wordpress-plugin/getting-started` → redirects to `/wordpress-plugin/getting-started`
- `/docs/api/getting-started` → redirects to `/api-reference/getting-started`

- [ ] **Step 5: Verify LLM routes**

- `/llms.txt` — returns combined index
- `/llms-full.txt` — returns all pages content
- `/wordpress-plugin/getting-started.mdx` — returns markdown for that page

- [ ] **Step 6: Verify search**

Use the search bar — results should include pages from all sections.

- [ ] **Step 7: Build check**

```bash
npm run build
```

Expected: Builds successfully with no errors.

- [ ] **Step 8: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address smoke test issues"
```
