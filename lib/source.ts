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
