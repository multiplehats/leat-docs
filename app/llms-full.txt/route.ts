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
