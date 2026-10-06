export const config = { runtime: 'edge' };

export default async function handler(req) {
  const expected = process.env.PROXY_KEY || process.env.IG_PROXY_KEY;
  if (!expected || req.headers.get('x-proxy-key') !== expected) {
    return new Response('forbidden', { status: 403 });
  }

  const target = new URL(req.url).searchParams.get('url');
  let u;
  try { u = new URL(target); } catch (e) { return new Response('bad url', { status: 400 }); }

  if (u.protocol !== 'https:' || !/(\.cdninstagram\.com|\.fbcdn\.net)$/i.test(u.hostname)) {
    return new Response('host not allowed', { status: 400 });
  }

  const upstream = await fetch(u.toString());
  const headers = new Headers();
  headers.set('content-type', upstream.headers.get('content-type') || 'application/octet-stream');
  return new Response(upstream.body, { status: upstream.status, headers });
}
