// Cloudflare Worker: CORS proxy for the lobby's two news feeds.
// Deployed as "hoa-lobby-rss" on Cloudflare Workers — see CLAUDE.md.
//
// GET /ynet  -> Ynet RSS
// GET /c14   -> Channel 14 RSS
//
// Only these feeds are allowed, so this can't be used as an open proxy.
// Responses are cached at Cloudflare's edge for 5 minutes.

const FEEDS = {
  ynet: 'https://www.ynet.co.il/Integration/StoryRss2.xml',
  c14:  'https://www.c14.co.il/feed/',
};

const CORS = { 'Access-Control-Allow-Origin': '*' };

export default {
  async fetch(request) {
    const key = new URL(request.url).pathname.replace(/^\/+|\/+$/g, '');
    const feedUrl = FEEDS[key];
    if (!feedUrl) return new Response('Unknown feed', { status: 404, headers: CORS });

    try {
      const upstream = await fetch(feedUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (hoa-lobby RSS proxy)' },
        cf: { cacheTtl: 300, cacheEverything: true },
      });
      if (!upstream.ok) {
        return new Response(`Upstream HTTP ${upstream.status}`, { status: 502, headers: CORS });
      }
      return new Response(upstream.body, {
        headers: {
          ...CORS,
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
        },
      });
    } catch (err) {
      return new Response(`Upstream fetch failed: ${err.message}`, { status: 502, headers: CORS });
    }
  },
};
