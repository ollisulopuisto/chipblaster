// Cloudflare Worker that signs Last.fm API calls so the shared secret never reaches the browser.
// The browser sends { method, params } to POST /sign and gets back { api_key, api_sig }, then calls Last.fm directly.
// Only three methods are signed, only for allowed origins, and nothing is stored or logged.

const ALLOWED_METHODS = new Set(['auth.getSession', 'track.updateNowPlaying', 'track.scrobble']);
const MAX_BODY = 4096;
const MAX_PARAMS = 24;
const MAX_VALUE = 512;

// MD5 in plain JavaScript: Last.fm signs with it, and not every runtime offers it through Web Crypto.
export function md5(input) {
  const bytes = new TextEncoder().encode(input);
  const n = bytes.length, words = [];
  for (let i = 0; i < n; i++) words[i >> 2] |= bytes[i] << ((i % 4) * 8);
  words[n >> 2] |= 0x80 << ((n % 4) * 8);
  const total = (((n + 8) >> 6) + 1) * 16;
  for (let i = 0; i < total; i++) if (words[i] === undefined) words[i] = 0;
  words[total - 2] = (n * 8) >>> 0;
  words[total - 1] = Math.floor((n * 8) / 4294967296);
  const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let off = 0; off < total; off += 16) {
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      const sum = (A + F + K[i] + words[off + g]) >>> 0;
      const s = S[(i >> 4) * 4 + (i % 4)];
      A = D; D = C; C = B;
      B = (B + (((sum << s) | (sum >>> (32 - s))) >>> 0)) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }
  const hex = (v) => Array.from({ length: 4 }, (_, i) => ((v >>> (i * 8)) & 255).toString(16).padStart(2, '0')).join('');
  return hex(a0) + hex(b0) + hex(c0) + hex(d0);
}

/** Last.fm signature: parameter names sorted, name and value concatenated, secret appended, MD5. `format` and `callback` are not signed. */
export function sign(params, secret) {
  const body = Object.keys(params).filter((k) => k !== 'format' && k !== 'callback').sort().map((k) => k + params[k]).join('');
  return md5(body + secret);
}

function corsHeaders(origin) {
  return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
}

const json = (data, status, headers) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...headers } });

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const ok = allowed.includes(origin);
    const cors = ok ? corsHeaders(origin) : {};
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: ok ? 204 : 403, headers: cors });
    if (request.method !== 'POST' || url.pathname !== '/sign') return json({ error: 'not found' }, 404, cors);
    if (!ok) return json({ error: 'origin not allowed' }, 403, cors);
    if (!env.LASTFM_API_KEY || !env.LASTFM_SECRET) return json({ error: 'signer not configured' }, 500, cors);
    const text = await request.text();
    if (text.length > MAX_BODY) return json({ error: 'too large' }, 413, cors);
    let data;
    try { data = JSON.parse(text); } catch { return json({ error: 'bad json' }, 400, cors); }
    const { method, params } = data || {};
    if (typeof method !== 'string' || !ALLOWED_METHODS.has(method)) return json({ error: 'method not allowed' }, 400, cors);
    if (!params || typeof params !== 'object' || Array.isArray(params)) return json({ error: 'bad params' }, 400, cors);
    const keys = Object.keys(params);
    if (keys.length > MAX_PARAMS) return json({ error: 'too many params' }, 400, cors);
    const signed = { method, api_key: env.LASTFM_API_KEY };
    for (const k of keys) {
      const v = params[k];
      if (!/^[A-Za-z0-9_\[\]]{1,32}$/.test(k) || k === 'api_key' || k === 'api_sig' || k === 'method') return json({ error: 'bad param name' }, 400, cors);
      if (typeof v !== 'string' && typeof v !== 'number') return json({ error: 'bad param value' }, 400, cors);
      const s = String(v);
      if (s.length > MAX_VALUE) return json({ error: 'value too long' }, 400, cors);
      signed[k] = s;
    }
    return json({ api_key: env.LASTFM_API_KEY, api_sig: sign(signed, env.LASTFM_SECRET) }, 200, cors);
  }
};
