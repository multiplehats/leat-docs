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
