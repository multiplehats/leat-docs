import { getPageImage, apiReferenceSource } from '@/lib/source';
import { notFound } from 'next/navigation';
import { ImageResponse } from '@takumi-rs/image-response';
import { generate as DefaultImage } from 'fumadocs-ui/og/takumi';

export const revalidate = false;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const page = apiReferenceSource.getPage(slug.slice(0, -1));
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
  return apiReferenceSource.getPages().map((page) => ({
    slug: getPageImage(page).segments,
  }));
}
