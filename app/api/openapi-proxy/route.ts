import { openapi } from '@/lib/openapi';

const proxy = openapi.createProxy({
  allowedOrigins: ['https://api.leat.com', 'https://api.piggy.eu'],
});

export const GET = proxy.GET;
export const POST = proxy.POST;
export const PUT = proxy.PUT;
export const DELETE = proxy.DELETE;
export const PATCH = proxy.PATCH;
export const HEAD = proxy.HEAD;
