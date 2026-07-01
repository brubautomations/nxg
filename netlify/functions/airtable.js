// Server-side proxy. Holds the secret token in env vars; the browser never sees it.
const BASE = process.env.AIRTABLE_BASE_ID || 'appmiX1Oz2OgbpuZ0';
const TOKEN = process.env.AIRTABLE_TOKEN;
const TABLES = ['COPY', 'MEMBERS', 'ALBUMS', 'TRACKS', 'MEDIA', 'PARTNERS', 'SOCIALS', 'ABOUT', 'TALK_QUESTIONS', 'TALK_ANSWERS', 'TALK_GREETINGS'];

let cache = { at: 0, data: null };
const TTL = 60 * 1000; // 60s in-memory cache to stay well under rate limits

async function fetchTable(name) {
  try {
    const records = [];
    let offset = null;
    // Airtable returns max 100 records per page. Loop through ALL pages via the
    // offset token so tables with >100 rows (like TALK_ANSWERS) are fully loaded.
    do {
      const params = new URLSearchParams({ pageSize: '100' });
      if (offset) params.set('offset', offset);
      const url = `https://api.airtable.com/v0/${BASE}/${encodeURIComponent(name)}?${params.toString()}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
      if (!res.ok) return records; // missing/renamed table never breaks the whole site
      const json = await res.json();
      (json.records || []).forEach((r) => records.push({ id: r.id, ...r.fields }));
      offset = json.offset || null;
    } while (offset);
    return records;
  } catch (e) {
    return [];
  }
}

function respond(code, body) {
  return {
    statusCode: code,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
    body: JSON.stringify(body),
  };
}

export const handler = async () => {
  if (!TOKEN) return respond(200, { empty: true, reason: 'missing_token' });
  const now = Date.now();
  if (cache.data && now - cache.at < TTL) return respond(200, cache.data);
  try {
    const results = await Promise.all(TABLES.map(fetchTable));
    const keys = ['copy', 'members', 'albums', 'tracks', 'media', 'partners', 'socials', 'about', 'talk_questions', 'talk_answers', 'talk_greetings'];
    const data = {};
    keys.forEach((k, i) => { data[k] = results[i]; });
    cache = { at: now, data };
    return respond(200, data);
  } catch (e) {
    // fail soft — the frontend falls back to bundled defaults
    return respond(200, { empty: true, reason: String(e) });
  }
};
