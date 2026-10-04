export const config = { api: { bodyParser: false } };

async function readBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  if (req.body !== undefined && req.body !== null && !req.readable) {
    if (Buffer.isBuffer(req.body) || typeof req.body === 'string') return req.body;
    return new URLSearchParams(req.body).toString();
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

export default async function handler(req, res) {
  const key = process.env.PROXY_KEY;
  if (!key || req.headers['x-proxy-key'] !== key) {
    return res.status(403).json({ error: 'forbidden' });
  }

  const url = new URL(req.url, 'http://localhost');
  const target = url.searchParams.get('__t');
  const path = url.searchParams.get('__p') || '';
  url.searchParams.delete('__t');
  url.searchParams.delete('__p');

  const host = target === 'graph' ? 'graph.instagram.com' : 'api.instagram.com';
  const qs = url.searchParams.toString();
  const upstream = `https://${host}/${path}${qs ? '?' + qs : ''}`;

  const headers = {};
  if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];
  if (req.headers['authorization']) headers['authorization'] = req.headers['authorization'];

  try {
    const r = await fetch(upstream, {
      method: req.method,
      headers,
      body: await readBody(req),
    });
    const buf = Buffer.from(await r.arrayBuffer());
    res.status(r.status);
    res.setHeader('content-type', r.headers.get('content-type') || 'application/json');
    res.send(buf);
  } catch (e) {
    res.status(502).json({ error: 'upstream_failed', message: String(e) });
  }
}
