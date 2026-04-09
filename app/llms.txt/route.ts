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
