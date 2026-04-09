# Docs Section Switcher

## Overview

Add a dropdown at the top of the sidebar that lets users switch between documentation sections. Each section gets its own URL prefix, its own content collection, and an isolated page tree. A new Getting Started section serves as the site homepage at `/`.

## Sections

| Display Name      | URL Prefix           | Content Directory                 | Status   |
|-------------------|----------------------|-----------------------------------|----------|
| Getting Started   | `/`                  | `content/docs/getting-started/`   | New      |
| WordPress Plugin  | `/wordpress-plugin`  | `content/docs/wordpress-plugin/`  | Existing |
| API Reference     | `/api-reference`     | `content/docs/api/`               | Existing |

Future sections (Dashboard at `/dashboard`, Shopify) will follow the same pattern.

## Content Structure

```
content/docs/
├── getting-started/
│   ├── meta.json
│   └── index.mdx              ← site homepage at "/"
├── wordpress-plugin/
│   ├── meta.json
│   └── [existing files]
└── api/
    ├── meta.json
    └── [existing files]
```

The Getting Started `index.mdx` replaces the current homepage. It introduces Leat and provides cards linking users to the right section. Existing WordPress Plugin and API content files remain unchanged.

## Source Configuration

### source.config.ts

Three separate `defineDocs()` calls, each scoped to its own content directory:

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

### lib/source.ts

Three separate `loader()` instances:

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

// Helper that works with any source
type AnySource = typeof gettingStartedSource | typeof wordpressSource | typeof apiReferenceSource;

export function getPageImage(page: InferPageType<AnySource>) {
  const segments = [...page.slugs, 'image.webp'];
  return {
    segments,
    url: `/og/${segments.join('/')}`,
  };
}

export async function getLLMText(page: InferPageType<AnySource>) {
  const processed = await page.data.getText('processed');
  return `# ${page.data.title}\n\n${processed}`;
}
```

Note: The `getPageImage` URL pattern changes from `/og/docs/...` to `/og/...` since docs are no longer under `/docs`. The OG image route (`app/og/...`) needs to be updated accordingly to match the new URL structure.

## Route Structure

Remove `app/docs/` and `app/(home)/`. Create:

```
app/
├── layout.tsx                              ← root layout (unchanged: RootProvider, fonts, CSS)
├── (docs)/
│   ├── (getting-started)/
│   │   ├── layout.tsx                      ← DocsLayout + gettingStartedSource tree + RootToggle
│   │   └── [[...slug]]/
│   │       └── page.tsx                    ← fetches from gettingStartedSource
│   ├── wordpress-plugin/
│   │   ├── layout.tsx                      ← DocsLayout + wordpressSource tree + RootToggle
│   │   └── [[...slug]]/
│   │       └── page.tsx                    ← fetches from wordpressSource
│   └── api-reference/
│       ├── layout.tsx                      ← DocsLayout + apiReferenceSource tree + RootToggle
│       └── [[...slug]]/
│           └── page.tsx                    ← fetches from apiReferenceSource
```

**Route resolution:** The `(getting-started)` route group (parentheses = no URL segment) contains an optional catch-all `[[...slug]]` that matches `/`, `/any-path`, etc. Next.js resolves this correctly: static segments like `wordpress-plugin/` and `api-reference/` take precedence over the catch-all.

**Root layout** (`app/layout.tsx`) is unchanged — it provides `RootProvider`, fonts, and global CSS.

There is no shared `(docs)/layout.tsx` — it is unnecessary since each section has its own layout rendering `DocsLayout`. The `(docs)` route group exists purely for organizational grouping in the file system.

## Root Toggle Component

Shared component at `components/docs-root-toggle.tsx`:

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

## Section Layouts

Each section layout renders `DocsLayout` with its own page tree and the shared `RootToggle` banner. Example for WordPress Plugin:

```tsx
// app/(docs)/wordpress-plugin/layout.tsx
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

The other two section layouts follow the same pattern with their respective source.

## Section Page Components

Each page component fetches from its section's source. All existing page features are preserved: `generateMetadata`, `MarkdownCopyButton`, `ViewOptionsPopover`, `createRelativeLink`, `full` prop, and `APIPage` MDX component (API Reference only).

Example for WordPress Plugin:

```tsx
// app/(docs)/wordpress-plugin/[[...slug]]/page.tsx
import { getPageImage, wordpressSource } from '@/lib/source';
import {
  DocsBody, DocsDescription, DocsPage, DocsTitle,
  MarkdownCopyButton, ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/components/mdx';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { gitConfig } from '@/lib/layout.shared';

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const page = wordpressSource.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
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
            a: createRelativeLink(wordpressSource, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return wordpressSource.generateParams();
}

export async function generateMetadata(props: { params: Promise<{ slug?: string[] }> }): Promise<Metadata> {
  const params = await props.params;
  const page = wordpressSource.getPage(params.slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: { images: getPageImage(page).url },
  };
}
```

The API Reference page additionally includes the `APIPage` custom MDX component via `getMDXComponents`.

## Layout Shared

`lib/layout.shared.tsx` remains unchanged. The `baseOptions()` function provides nav title (Leat logo) and GitHub URL. Docs-specific configuration (page tree, sidebar banner) is handled by the section layouts.

## LLM Text Routes

The existing LLM routes aggregate across all three sources:

### `app/llms.txt/route.ts`

Generates an index of all pages across all sources:

```ts
import { gettingStartedSource, wordpressSource, apiReferenceSource } from '@/lib/source';
import { llms } from 'fumadocs-core/source';

export const revalidate = false;

export function GET() {
  // Combine indices from all sources
  const indices = [
    llms(gettingStartedSource).index(),
    llms(wordpressSource).index(),
    llms(apiReferenceSource).index(),
  ];
  return new Response(indices.join('\n\n'));
}
```

### `app/llms-full.txt/route.ts`

Scans all pages from all sources:

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

### `app/llms.mdx/` routes

The current single route at `app/llms.mdx/docs/[[...slug]]/route.ts` needs to be split into per-section routes to match the new URL structure:

```
app/llms.mdx/
├── [[...slug]]/route.ts                    ← gettingStartedSource
├── wordpress-plugin/[[...slug]]/route.ts   ← wordpressSource
└── api-reference/[[...slug]]/route.ts      ← apiReferenceSource
```

Each route serves the LLM markdown for its source. The old `app/llms.mdx/docs/` route is removed.

## OG Image Route

The current single route at `app/og/docs/[...slug]/route.tsx` needs to be split similarly:

```
app/og/
├── [...slug]/route.tsx                     ← gettingStartedSource
├── wordpress-plugin/[...slug]/route.tsx    ← wordpressSource
└── api-reference/[...slug]/route.tsx       ← apiReferenceSource
```

Each route imports its respective source and generates OG images. The `getPageImage` helper in `source.ts` produces URLs like `/og/wordpress-plugin/{slugs}/image.webp` and `/og/api-reference/{slugs}/image.webp`.

## next.config.mjs Updates

Redirects from old URLs and updated rewrite rules for LLM markdown routes:

```js
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
    // Specific section rules first, then general catch-all last
    return [
      { source: '/wordpress-plugin/:path*.mdx', destination: '/llms.mdx/wordpress-plugin/:path*' },
      { source: '/api-reference/:path*.mdx', destination: '/llms.mdx/api-reference/:path*' },
      { source: '/:path*.mdx', destination: '/llms.mdx/:path*' },
    ];
  },
};
```

## What Does Not Change

- Root layout (`app/layout.tsx`) — RootProvider, fonts, global CSS
- OpenAPI spec and API doc generation pipeline
- MDX components (`components/mdx.tsx`, `components/api-page.tsx`)
- WordPress Plugin and API content files
- Tailwind, styling, theming

## What Changes

- `source.config.ts` — three `defineDocs()` calls instead of one
- `lib/source.ts` — three `loader()` instances, updated helper functions
- Route structure — `app/docs/` and `app/(home)/` replaced by `app/(docs)/` with three section sub-routes
- New `components/docs-root-toggle.tsx` shared component
- New `content/docs/getting-started/` content directory
- `next.config.mjs` — redirects and updated rewrite rules
- OG image routes — split per section to match new URL structure
- LLM text routes — updated to aggregate across all sources
- `app/llms.mdx/` routes — split per section to match new URL structure
