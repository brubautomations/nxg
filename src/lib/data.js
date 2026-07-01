import { useState, useEffect } from 'react';

// Fetch all site content from the Netlify function (which proxies the CMS).
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

// Fetch the merch storefront (same private base/endpoint; images public but the
// digital deliverable is never exposed). Returns the merch array.
export function useMerch() {
  const [merch, setMerch] = useState([]);
  useEffect(() => {
    let on = true;
    fetch('/.netlify/functions/private')
      .then((r) => r.json())
      .then((d) => { if (on) setMerch((d && d.merch) || []); })
      .catch(() => { if (on) setMerch([]); });
    return () => { on = false; };
  }, []);
  return merch;
}

// only show rows with published checked, sorted by `order`
export const pub = (arr) =>
  (arr || []).filter((r) => r.published).sort((a, b) => (a.order || 0) - (b.order || 0));

/* ===== language ===== */
// UI button codes (uppercase) -> content column names (lowercase).
// English is the universal fallback for any blank/missing cell.
const LANG_COL = { EN: 'en', KO: 'ko', JA: 'ja', ZH: 'zh', FIL: 'fil', ES: 'es' };

// module-level current language so existing copyVal(copy, 'key') calls keep working.
let CURRENT_LANG = 'EN';
export const setLang = (code) => { CURRENT_LANG = LANG_COL[code] ? code : 'EN'; };
export const getLang = () => CURRENT_LANG;

// look up a text value from the COPY table by key, in the active language,
// falling back to English, then to the supplied default.
export const copyVal = (copy, key, def = '') => {
  const row = (copy || []).find((c) => c.key === key);
  if (!row) return def;
  const col = LANG_COL[CURRENT_LANG] || 'en';
  // prefer active language; if that cell is blank, fall back to English; else default.
  const val = row[col];
  if (val != null && String(val).trim() !== '') return val;
  const en = row.en;
  if (en != null && String(en).trim() !== '') return en;
  // legacy support: if an old `value` column still exists, use it.
  if (row.value != null && String(row.value).trim() !== '') return row.value;
  return def;
};

// first attachment URL from a CMS attachment field, else a fallback
export const att = (field, fallback = '') =>
  Array.isArray(field) && field[0] && field[0].url ? field[0].url : fallback;

// all attachment URLs
export const atts = (field) =>
  Array.isArray(field) ? field.map((f) => f.url).filter(Boolean) : [];

// raw attachment objects ({ url, type, filename }) — needed to tell image vs video
export const attRaw = (field) =>
  Array.isArray(field) ? field.filter((f) => f && f.url) : [];
