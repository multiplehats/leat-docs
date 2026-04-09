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
