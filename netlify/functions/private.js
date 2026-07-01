// PUBLIC storefront read for the NXG_PRIVATE base.
// SECURITY: this NEVER returns the real `files`. It only exposes the teaser
// preview + metadata the storefront needs. The real photos are served ONLY by
// the GAS doorman, server-side, after a verified purchase.
const BASE = process.env.NXG_PRIVATE_BASE_ID;
const TOKEN = process.env.NXG_PRIVATE_TOKEN;

let cache = { at: 0, data: null };
const TTL = 60 * 1000;

// the ONLY fields allowed to leave this function
function safe(fields) {
  const teaser = Array.isArray(fields.teaser) && fields.teaser[0] ? fields.teaser[0].url : '';
  return {
    title: fields.title || '',
    blurb: fields.blurb || '',
    price: fields.price ?? null,
    category: fields.category || '',
    order: fields.order ?? 0,
    paymongo_url: fields.paymongo_url || '',
    teaser, // single preview image url — safe, it's the public cover
    count: Array.isArray(fields.files) ? fields.files.length : 0, // how many photos — a number only, not the files
    // NOTE: `files` is intentionally dropped here. Do not add it.
  };
}

// MERCH storefront: images ARE public (shown clearly, no blur), but the paid
// deliverable `digital_file` is NEVER exposed here — only GAS serves it after
// a verified purchase, exactly like PRIVATE's `files`.
function safeMerch(fields) {
  const images = Array.isArray(fields.images)
    ? fields.images.map((a) => (a && a.url) ? a.url : '').filter(Boolean)
    : [];
  return {
    name: fields.name || '',
    blurb: fields.blurb || '',
    price: fields.price ?? null,
    type: fields.type || 'Physical',
    variants: fields.variants || '',
    inventory: (fields.inventory ?? null),          // number or null (null = unlimited digital)
    low_stock_threshold: (fields.low_stock_threshold ?? 2),
    category: fields.category || '',
    order: fields.order ?? 0,
    images,                                          // product photos — public, shown clearly
    // NOTE: `digital_file` is intentionally dropped. Do not add it.
  };
}

function respond(code, body) {
  return {
    statusCode: code,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
    body: JSON.stringify(body),
  };
}

export const handler = async () => {
  if (!TOKEN || !BASE) return respond(200, { private: [], merch: [], reason: 'missing_config' });
  const now = Date.now();
  if (cache.data && now - cache.at < TTL) return respond(200, cache.data);
  try {
    // --- PRIVATE storefront (teasers only) ---
    const purl = `https://api.airtable.com/v0/${BASE}/PRIVATE?pageSize=100`;
    const pres = await fetch(purl, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!pres.ok) throw new Error(`PRIVATE: ${pres.status}`);
    const pjson = await pres.json();
    const rows = pjson.records
      .filter((r) => r.fields && r.fields.published)
      .map((r) => ({ id: r.id, ...safe(r.fields) }))
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    // --- MERCH storefront (images public, digital_file stripped) ---
    let merch = [];
    try {
      const murl = `https://api.airtable.com/v0/${BASE}/MERCH?pageSize=100`;
      const mres = await fetch(murl, { headers: { Authorization: `Bearer ${TOKEN}` } });
      if (mres.ok) {
        const mjson = await mres.json();
        merch = mjson.records
          .filter((r) => r.fields && r.fields.published)
          .map((r) => ({ id: r.id, ...safeMerch(r.fields) }))
          .sort((a, b) => (a.order || 0) - (b.order || 0));
      }
    } catch (e) { merch = []; } // merch table missing never breaks private

    const data = { private: rows, merch };
    cache = { at: now, data };
    return respond(200, data);
  } catch (e) {
    return respond(200, { private: [], merch: [], reason: String(e) });
  }
};
