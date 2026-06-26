import { useState, useEffect } from 'react';

// Fetch all site content from the Netlify function (which proxies Airtable).
export function useData() {
  const [data, setData] = useState(null);
  useEffect(() => {
    let on = true;
    fetch('/.netlify/functions/airtable')
      .then((r) => r.json())
      .then((d) => { if (on) setData(d || { empty: true }); })
      .catch(() => { if (on) setData({ empty: true }); });
    return () => { on = false; };
  }, []);
  return data;
}

// Fetch the private storefront (separate base, teaser-only — never the real files).
export function usePrivate() {
  const [packs, setPacks] = useState([]);
  useEffect(() => {
    let on = true;
    fetch('/.netlify/functions/private')
      .then((r) => r.json())
      .then((d) => { if (on) setPacks((d && d.private) || []); })
      .catch(() => { if (on) setPacks([]); });
    return () => { on = false; };
  }, []);
  return packs;
}

// only show rows with published checked, sorted by `order`
export const pub = (arr) =>
  (arr || []).filter((r) => r.published).sort((a, b) => (a.order || 0) - (b.order || 0));

// look up a text value from the COPY table by key, with a default
export const copyVal = (copy, key, def = '') => {
  const row = (copy || []).find((c) => c.key === key);
  return row && row.value != null ? row.value : def;
};

// first attachment URL from an Airtable attachment field, else a fallback
export const att = (field, fallback = '') =>
  Array.isArray(field) && field[0] && field[0].url ? field[0].url : fallback;

// all attachment URLs
export const atts = (field) =>
  Array.isArray(field) ? field.map((f) => f.url).filter(Boolean) : [];

// raw attachment objects ({ url, type, filename }) — needed to tell image vs video
export const attRaw = (field) =>
  Array.isArray(field) ? field.filter((f) => f && f.url) : [];
