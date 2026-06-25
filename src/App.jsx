import React, { useEffect, useRef, useState } from 'react';
import { useData, pub, copyVal, att, atts, attRaw } from './lib/data.js';

/* ---- bundled fallback assets (used until Airtable is populated) ---- */
const LOGO_FALLBACK = '/assets/logo.png';
const HERO_FALLBACK = '/assets/hero.png';
const CHIBI = {
  CHENXI: ['/assets/chibi/chenxi_1.png', '/assets/chibi/chenxi_2.png'],
  YOORA:  ['/assets/chibi/yoora_1.png',  '/assets/chibi/yoora_2.png'],
  HARUKA: ['/assets/chibi/haruka_1.png', '/assets/chibi/haruka_2.png'],
  SARAYA: ['/assets/chibi/saraya_1.png', '/assets/chibi/saraya_2.png'],
};
const CHIBI_KEYS = Object.keys(CHIBI);
const MEMBER_FALLBACK = {
  CHENXI: { name: 'CHENXI', color: '#ff2d8b', photo: '/assets/members/chenxi.png', order: 1 },
  YOORA:  { name: 'YOORA',  color: '#ff7ab8', photo: '/assets/members/yoora.png',  order: 2 },
  HARUKA: { name: 'HARUKA', color: '#2f7bff', photo: '/assets/members/haruka.png', order: 3 },
  SARAYA: { name: 'SARAYA', color: '#7c4dff', photo: '/assets/members/saraya.png', order: 4 },
};
const BOOTLINES = ['initializing nxg.exe', 'mounting persona core', 'rendering visual model', 'syncing vocal engine', 'calibrating aura', 'member online'];
const LANGS = [['EN', 'EN'], ['KO', '한국어'], ['JA', '日本語'], ['ZH', '中文'], ['FIL', 'Filipino']];
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion:reduce)').matches;

// hover slideshow uses every image attached in the member's `photo` cell (multi-attachment)
function memberImages(m) {
  const arr = atts(m.photo);
  if (!arr.length) arr.push((MEMBER_FALLBACK[m.name] && MEMBER_FALLBACK[m.name].photo) || HERO_FALLBACK);
  return arr;
}

function MemberCard({ m, onOpen }) {
  const imgs = React.useMemo(() => memberImages(m), [m]);
  const [idx, setIdx] = useState(0);
  const timer = useRef(null);
  const enter = () => { if (imgs.length > 1 && !reduce) { clearInterval(timer.current); timer.current = setInterval(() => setIdx((i) => (i + 1) % imgs.length), 750); } };
  const leave = () => { clearInterval(timer.current); setIdx(0); };
  useEffect(() => () => clearInterval(timer.current), []);
  return (
    <div className="mcard" onMouseEnter={enter} onMouseLeave={leave} onClick={() => onOpen(m)}>
      <span className="mcard-bar" style={{ background: m.color || '#ff2d8b' }} />
      {imgs.map((src, i) => (
        <img key={i} className={'mcard-img' + (i === idx ? ' on' : '')} src={src} alt={m.name} draggable="false" />
      ))}
      <div className="mcard-foot">
        <span className="mcard-name">{m.name}</span>
        <span className="mcard-cta">VIEW BIO →</span>
      </div>
    </div>
  );
}

function MemberBio({ m, onClose }) {
  if (!m) return null;
  const img = memberImages(m)[0];
  return (
    <div className="bio-ov" onClick={onClose}>
      <div className="bio-panel" onClick={(e) => e.stopPropagation()}>
        <button className="bio-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="bio-img" style={{ backgroundImage: `url(${img})` }} />
        <div className="bio-txt">
          <span className="bio-eyebrow" style={{ color: m.color || '#ff2d8b' }}>NXG // MEMBER</span>
          <h2>{m.name}</h2>
          {m.tagline && <p className="bio-tag">“{m.tagline}”</p>}
          <h3>BACKGROUND</h3>
          <p className="bio-body">{m.bio || 'Bio coming soon — add it in the MEMBERS table.'}</p>
        </div>
      </div>
    </div>
  );
}

// Paste an NXG Spotify track/album/artist/playlist link here as the default
// (used only until the TRACKS table has rows with spotify_url).
const FALLBACK_SPOTIFY = '';

function spotifyEmbed(url) {
  if (!url) return '';
  let m = url.match(/spotify\.com\/(track|album|artist|playlist)\/([A-Za-z0-9]+)/);
  if (!m) m = url.match(/spotify:(track|album|artist|playlist):([A-Za-z0-9]+)/);
  if (!m) return '';
  return `https://open.spotify.com/embed/${m[1]}/${m[2]}?theme=0`;
}

function SpotifyPlayer({ tracks, show, logo }) {
  const pool = React.useMemo(() => {
    const urls = (tracks || []).map((t) => t.spotify_url).filter(Boolean);
    return urls.length ? urls : (FALLBACK_SPOTIFY ? [FALLBACK_SPOTIFY] : []);
  }, [tracks]);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!pool.length) return;
    const last = sessionStorage.getItem('nxg_last');
    let n = Math.floor(Math.random() * pool.length), guard = 0;
    while (pool.length > 1 && pool[n] === last && guard < 12) { n = Math.floor(Math.random() * pool.length); guard++; }
    setI(n); sessionStorage.setItem('nxg_last', pool[n]);
  }, [pool.length]);
  const src = spotifyEmbed(pool[i]);
  const shuffle = () => {
    if (pool.length > 1) { let n; do { n = Math.floor(Math.random() * pool.length); } while (n === i); setI(n); sessionStorage.setItem('nxg_last', pool[n]); }
  };
  if (!src) return null;
  return (
    <div className={'splayer' + (show ? ' show' : '')}>
      <div className="sp-top">
        <img className="sp-logo" src={logo} alt="NXG" />
        <span className="sp-now">NOW PLAYING</span>
        {pool.length > 1 && <button className="sp-next" onClick={shuffle} aria-label="Shuffle">⤿</button>}
      </div>
      <iframe title="NXG player" src={src} width="100%" height="80" frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"
        style={{ borderRadius: '10px', display: 'block' }} />
    </div>
  );
}

function Discography({ albums, tracks, onOpen }) {
  const [idx, setIdx] = useState(0);
  if (!albums.length) {
    return (<section className="sec discsec" id="discography"><span className="eyebrow b">02 — RELEASES</span><h2>DISCOGRAPHY</h2></section>);
  }
  const a = albums[Math.min(idx, albums.length - 1)];
  const prev = () => setIdx((i) => (i - 1 + albums.length) % albums.length);
  const next = () => setIdx((i) => (i + 1) % albums.length);
  return (
    <section className="sec discsec" id="discography">
      <span className="eyebrow b">02 — RELEASES</span>
      <h2>DISCOGRAPHY</h2>
      <div className="disc-stage">
        {albums.length > 1 && <button className="disc-arrow" onClick={prev} aria-label="Previous album">‹</button>}
        <div className="disc-feat" onClick={() => onOpen(a)}>
          <img className="disc-cover" src={att(a.cover)} alt={a.title} />
          <div className="disc-title">{a.title}</div>
          {a.release_date && <div className="disc-date">{a.release_date}</div>}
          <span className="disc-view">VIEW ALBUM →</span>
        </div>
        {albums.length > 1 && <button className="disc-arrow" onClick={next} aria-label="Next album">›</button>}
      </div>
      {albums.length > 1 && (
        <div className="disc-strip">
          {albums.map((al, i) => (
            <img key={i} className={'disc-thumb' + (i === idx ? ' on' : '')} src={att(al.cover)} alt={al.title} onClick={() => setIdx(i)} />
          ))}
        </div>
      )}
    </section>
  );
}

function TrackRow({ t, n, open, onToggle }) {
  const embed = spotifyEmbed(t.spotify_url);
  const canvas = attRaw(t.canvas)[0];
  const isVideo = canvas && (canvas.type || '').startsWith('video');
  const videoRef = useRef(null);
  const toggleVideo = () => { const v = videoRef.current; if (!v) return; if (v.paused) v.play(); else v.pause(); };
  return (
    <div className={'trk' + (open ? ' open' : '')}>
      <button className="trk-head" onClick={onToggle}>
        <span className="trk-n">{String(n).padStart(2, '0')}</span>
        <span className="trk-title">{t.title}</span>
        {t.lyricist && <span className="trk-by">{t.lyricist}</span>}
        <span className="trk-caret">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="trk-body">
          {canvas && (isVideo
            ? <video ref={videoRef} className="trk-canvas trk-vid" src={canvas.url} autoPlay loop muted playsInline onClick={toggleVideo} title="Click to pause / play" />
            : <img className="trk-canvas" src={canvas.url} alt={t.title} />)}
          {embed && (
            <iframe className="trk-spotify" title={t.title} src={embed} width="100%" height="80" frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
          )}
          {t.story && (<><h4>STORY</h4><p className="trk-story">{t.story}</p></>)}
          {t.lyrics && (<><h4>LYRICS{t.lyricist ? ` — ${t.lyricist}` : ''}</h4><pre className="trk-lyrics">{t.lyrics}</pre></>)}
        </div>
      )}
    </div>
  );
}

function AlbumView({ album, tracks, onClose }) {
  const [openTrack, setOpenTrack] = useState(null);
  if (!album) return null;
  const list = (tracks || [])
    .filter((t) => Array.isArray(t.album) && t.album.includes(album.id))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  return (
    <div className="bio-ov" onClick={onClose}>
      <div className="album-panel" onClick={(e) => e.stopPropagation()}>
        <button className="bio-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="album-head">
          <img className="album-cover" src={att(album.cover)} alt={album.title} />
          <div className="album-info">
            <span className="bio-eyebrow" style={{ color: 'var(--blue)' }}>NXG // RELEASE</span>
            <h2>{album.title}</h2>
            {album.release_date && <div className="album-date">{album.release_date}</div>}
            {album.blurb && <p className="album-blurb">{album.blurb}</p>}
          </div>
        </div>
        <div className="tracklist">
          {list.length
            ? list.map((t, i) => (
              <TrackRow key={t.id} t={t} n={i + 1} open={openTrack === t.id} onToggle={() => setOpenTrack(openTrack === t.id ? null : t.id)} />
            ))
            : <div className="track-empty">No tracks linked to this album yet — add them in the TRACKS table and link the album.</div>}
        </div>
      </div>
    </div>
  );
}

function MediaLightbox({ items, index, onClose, onNav }) {
  const it = items[index];
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && items.length > 1) onNav((index - 1 + items.length) % items.length);
      else if (e.key === 'ArrowRight' && items.length > 1) onNav((index + 1) % items.length);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [index, items.length]);
  if (!it) return null;
  const prev = (e) => { e.stopPropagation(); onNav((index - 1 + items.length) % items.length); };
  const next = (e) => { e.stopPropagation(); onNav((index + 1) % items.length); };
  return (
    <div className="media-lb" onClick={onClose}>
      <button className="lb-close" onClick={onClose} aria-label="Close">✕</button>
      {items.length > 1 && <button className="lb-nav lb-prev" onClick={prev} aria-label="Previous">‹</button>}
      <div className="lb-content" onClick={(e) => e.stopPropagation()}>
        {it.type === 'image'
          ? <img src={it.url} alt={it.title} />
          : <video src={it.url} controls autoPlay playsInline />}
        {it.title && <div className="lb-title">{it.title}</div>}
      </div>
      {items.length > 1 && <button className="lb-nav lb-next" onClick={next} aria-label="Next">›</button>}
    </div>
  );
}

function MediaSection({ media }) {
  const items = React.useMemo(() => (media || [])
    .filter((m) => !m.vault_only)
    .map((m) => {
      const f = attRaw(m.file)[0];
      const name = f ? (f.filename || f.url || '') : '';
      const isVid = f && ((f.type || '').startsWith('video') || /\.(mp4|mov|webm|m4v)(\?|$)/i.test(name));
      return { id: m.id, type: isVid ? 'video' : 'image', url: f ? f.url : '', thumb: att(m.thumb), title: m.title || '', category: m.category || '' };
    })
    .filter((it) => it.url), [media]);
  const [tab, setTab] = useState('image');
  const [cat, setCat] = useState('All');
  const [lb, setLb] = useState(null);
  const tabItems = items.filter((it) => it.type === tab);
  const cats = ['All', ...Array.from(new Set(tabItems.map((it) => it.category).filter(Boolean)))];
  const shown = cat === 'All' ? tabItems : tabItems.filter((it) => it.category === cat);
  const switchTab = (t) => { setTab(t); setCat('All'); setLb(null); };
  return (
    <section className="sec mediasec" id="media">
      <span className="eyebrow">03 — THE FEED</span>
      <h2>MEDIA</h2>
      <div className="media-tabs">
        <button className={tab === 'image' ? 'on' : ''} onClick={() => switchTab('image')}>PHOTOS</button>
        <button className={tab === 'video' ? 'on' : ''} onClick={() => switchTab('video')}>VIDEOS</button>
      </div>
      {cats.length > 1 && (
        <div className="media-chips">
          {cats.map((c) => <button key={c} className={'chip' + (c === cat ? ' on' : '')} onClick={() => setCat(c)}>{c}</button>)}
        </div>
      )}
      {shown.length ? (
        <div className="media-grid">
          {shown.map((it, i) => (
            <div className="media-cell" key={it.id} onClick={() => setLb(i)}>
              {it.type === 'image' || it.thumb
                ? <div className="media-thumb" style={{ backgroundImage: `url(${it.type === 'image' ? it.url : it.thumb})` }} />
                : <video className="media-thumb vidthumb" src={it.url + '#t=0.1'} muted preload="metadata" playsInline />}
              {it.type === 'video' && <span className="media-play">▶</span>}
            </div>
          ))}
        </div>
      ) : <p className="media-empty">Nothing here yet — upload to the MEDIA table.</p>}
      {lb !== null && <MediaLightbox items={shown} index={lb} onClose={() => setLb(null)} onNav={setLb} />}
    </section>
  );
}

function PrivateContent({ packs }) {
  return (
    <section className="sec vault" id="private">
      <span className="eyebrow">07 — MEMBERS ONLY</span>
      <h2>PRIVATE CONTENT <i className="hex">⬡</i></h2>
      {packs.length ? (
        <div className="pv-grid">
          {packs.map((p, i) => (
            <div className="pv-card" key={i}>
              <div className="pv-cover">
                {att(p.cover) && <img className="pv-img" src={att(p.cover)} alt="" draggable="false" />}
                <div className="pv-veil"><span className="pv-lock">⬡</span></div>
              </div>
              <div className="pv-info">
                <div className="pv-title">{p.title}</div>
                {p.blurb && <div className="pv-blurb">{p.blurb}</div>}
                <div className="pv-row">
                  <span className="pv-price">{p.price != null ? `$${p.price}` : ''}</span>
                  <a className="pv-buy" href={p.paymongo_url || '#'} target="_blank" rel="noreferrer">PURCHASE NOW →</a>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : <p className="media-empty">Drops coming soon.</p>}
    </section>
  );
}

function BgLayers({ url }) {
  const [cur, setCur] = useState(url);
  const prev = useRef(url);
  useEffect(() => { if (url !== cur) { prev.current = cur; setCur(url); } }, [url]);
  return (
    <>
      <div className="bg-layer" style={{ backgroundImage: `url(${prev.current})` }} />
      <div className="bg-layer bg-top" key={cur} style={{ backgroundImage: `url(${cur})` }} />
    </>
  );
}

export default function App() {
  const data = useData();
  const [phase, setPhase] = useState(() => {
    try { const t = +localStorage.getItem('nxg_seen') || 0; if (t && Date.now() - t < 12 * 3600 * 1000) return 'site'; } catch (e) {}
    return 'boot';
  });     // boot | gate | site
  const [member, setMember] = useState('CHENXI'); // current boot member
  const [menuOpen, setMenuOpen] = useState(false);
  const [langNote, setLangNote] = useState(false);
  const [activeLang, setActiveLang] = useState('EN');
  const [bioMember, setBioMember] = useState(null);
  const [openAlbum, setOpenAlbum] = useState(null);
  const [bgPool, setBgPool] = useState([]);
  const [bgUrl, setBgUrl] = useState(HERO_FALLBACK);

  const lastRef = useRef(null);
  const chibiRef = useRef(null), innerRef = useRef(null), pctRef = useRef(null),
    fillRef = useRef(null), bootRef = useRef(null), nodeRef = useRef(null),
    flashRef = useRef(null), tiltRef = useRef(null);

  /* ---- resolved content (Airtable over fallback) ---- */
  const settings = (data && data.settings && data.settings[0]) || {};
  const logo = att(settings.logo, LOGO_FALLBACK);
  const hero = att(settings.hero_image, HERO_FALLBACK);
  const copy = (data && data.copy) || [];
  const tagText = copyVal(copy, 'tagline', 'NODE X GENERATION');

  let members = pub(data && data.members);
  if (!members.length) members = Object.values(MEMBER_FALLBACK);
  const albums = pub(data && data.albums);
  const tracks = pub(data && data.tracks);
  const media = pub(data && data.media);
  const packs = pub(data && data.private);
  const partners = pub(data && data.partners);
  let socials = pub(data && data.socials);
  if (!socials.length) socials = [
    { platform: 'Spotify', url: '#' }, { platform: 'YouTube', url: '#' },
    { platform: 'Apple Music', url: '#' }, { platform: 'Instagram', url: '#' }, { platform: 'TikTok', url: '#' },
  ];

  /* ---- boot sequence ---- */
  function runBoot() {
    setPhase('boot'); setMenuOpen(false);
    let m; do { m = CHIBI_KEYS[Math.floor(Math.random() * CHIBI_KEYS.length)]; } while (m === lastRef.current && CHIBI_KEYS.length > 1);
    lastRef.current = m; setMember(m);
    new Image().src = CHIBI[m][1];
    requestAnimationFrame(() => {
      const chibi = chibiRef.current, inner = innerRef.current;
      if (chibi) { chibi.src = CHIBI[m][0]; chibi.style.setProperty('--rev', 0); }
      if (inner) inner.classList.remove('pop');
      if (nodeRef.current) nodeRef.current.style.opacity = 0;
      if (pctRef.current) pctRef.current.textContent = '0';
      if (fillRef.current) fillRef.current.style.width = '0%';
      let start = null, swapped = false; const dur = reduce ? 60 : 3000;
      function frame(ts) {
        if (!start) start = ts;
        const t = Math.min(1, (ts - start) / dur), e = easeOut(t);
        if (pctRef.current) pctRef.current.textContent = Math.round(e * 100);
        if (fillRef.current) fillRef.current.style.width = e * 100 + '%';
        if (chibi) chibi.style.setProperty('--rev', e.toFixed(3));
        if (bootRef.current) bootRef.current.textContent = BOOTLINES[Math.min(BOOTLINES.length - 1, Math.floor(e * BOOTLINES.length))];
        if (nodeRef.current) nodeRef.current.style.opacity = e > 0.45 ? 1 : 0;
        if (!swapped && e >= 0.82) { swapped = true; if (chibi) chibi.src = CHIBI[m][1]; }
        if (t < 1) requestAnimationFrame(frame); else bootDone();
      }
      requestAnimationFrame(frame);
    });
  }
  function bootDone() {
    if (!reduce && innerRef.current) innerRef.current.classList.add('pop');
    if (!reduce && flashRef.current) { flashRef.current.classList.add('go'); setTimeout(() => flashRef.current && flashRef.current.classList.remove('go'), 400); }
    setTimeout(() => setPhase('gate'), reduce ? 120 : 760);
  }
  useEffect(() => { if (phase === 'boot') runBoot(); /* eslint-disable-next-line */ }, []);

  // discover landing background photos in /assets/landing (1.jpg, 2.jpg, ...)
  useEffect(() => {
    const found = []; let pending = 0, done = false; const MAX = 50;
    const finalize = () => {
      if (done) return; done = true;
      found.sort((a, b) => a.i - b.i);
      const urls = found.map((f) => f.url);
      setBgPool(urls);
      if (urls.length) setBgUrl(urls[Math.floor(Math.random() * urls.length)]);
    };
    for (let i = 1; i <= MAX; i++) {
      pending++; const im = new Image(); const url = `/assets/landing/${i}.png`;
      im.onload = () => { found.push({ i, url }); if (--pending === 0) finalize(); };
      im.onerror = () => { if (--pending === 0) finalize(); };
      im.src = url;
    }
  }, []);
  useEffect(() => {
    if (reduce || bgPool.length < 2) return;
    const id = setInterval(() => {
      setBgUrl((prev) => { let u; do { u = bgPool[Math.floor(Math.random() * bgPool.length)]; } while (u === prev && bgPool.length > 1); return u; });
    }, 8000);
    return () => clearInterval(id);
  }, [bgPool]);

  /* ---- mouse tilt during gate ---- */
  useEffect(() => {
    let tx = 0, ty = 0, cx = 0, cy = 0, raf;
    const move = (e) => { if (phase !== 'gate') return; tx = e.clientX / window.innerWidth - 0.5; ty = e.clientY / window.innerHeight - 0.5; };
    window.addEventListener('mousemove', move);
    const loop = () => {
      if (!reduce && phase === 'gate' && tiltRef.current) {
        cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
        tiltRef.current.style.transform = `rotateY(${cx * 12}deg) rotateX(${-cy * 12}deg) translate(${cx * 16}px, ${cy * 16}px)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { window.removeEventListener('mousemove', move); cancelAnimationFrame(raf); };
  }, [phase]);

  /* ---- ambient audio (Web Audio; unlocked by ENTER click) ---- */
  const audio = useRef({ ctx: null, master: null, playing: false, muted: false });
  const [playing, setPlaying] = useState(false);
  function startAudio() {
    const a = audio.current; if (a.ctx) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain(); master.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200;
    master.connect(lp); lp.connect(ctx.destination);
    [130.81, 196.0, 261.63].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * (1 + (i - 1) * 0.002);
      const g = ctx.createGain(); g.gain.value = 0.33; o.connect(g); g.connect(master); o.start();
    });
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.12; const lg = ctx.createGain(); lg.gain.value = 0.012; lfo.connect(lg); lg.connect(master.gain); lfo.start();
    master.gain.linearRampToValueAtTime(0.045, ctx.currentTime + 1.4);
    a.ctx = ctx; a.master = master; a.playing = true; setPlaying(true);
  }
  function togglePlay() {
    const a = audio.current; if (!a.ctx) { startAudio(); return; }
    if (a.ctx.state === 'running') { a.ctx.suspend(); setPlaying(false); } else { a.ctx.resume(); setPlaying(true); }
  }
  function toggleMute() { const a = audio.current; a.muted = !a.muted; if (a.master) a.master.gain.value = a.muted ? 0 : 0.045; setMuted(a.muted); }
  const [muted, setMuted] = useState(false);
  const [prog, setProg] = useState(0);
  useEffect(() => { const id = setInterval(() => { if (audio.current.ctx && audio.current.ctx.state === 'running') setProg((p) => (p + 0.4) % 100); }, 240); return () => clearInterval(id); }, []);

  /* ---- enter ---- */
  function enter() { try { localStorage.setItem('nxg_seen', Date.now()); } catch (e) {} setPhase('site'); }
  function scrollTo(id) { setMenuOpen(false); const el = document.getElementById(id); if (el) setTimeout(() => el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }), 200); }
  function pickLang(code) { setActiveLang(code); if (code !== 'EN') { setLangNote(true); clearTimeout(window._lt); window._lt = setTimeout(() => setLangNote(false), 1800); } }

  const entered = phase === 'site';

  return (
    <>
      {/* ===== SITE ===== */}
      {entered && (
        <main className="site">
          <section className="hero" id="home">
            <div className="hero-bg"><BgLayers url={bgUrl} /></div>
            <div className="hero-fade" />
            <div className="socials">
              <span className="soc-label">LISTEN &amp; FOLLOW</span>
              <div className="soc-row">
                {socials.map((s, i) => (
                  <a className="soc" key={i} href={s.url || '#'} target="_blank" rel="noreferrer">{s.platform}</a>
                ))}
              </div>
            </div>
            <div className="scrollhint">SCROLL <span>↓</span></div>
          </section>

          <section className="sec memsec" id="members">
            <span className="eyebrow">01 — THE GROUP</span>
            <h2>MEMBERS</h2>
            <div className="mgrid">
              {members.map((m, i) => <MemberCard key={i} m={m} onOpen={setBioMember} />)}
            </div>
          </section>

          <Discography albums={albums} tracks={tracks} onOpen={setOpenAlbum} />

          <MediaSection media={media} />

          <section className="sec" id="merch">
            <span className="eyebrow b">04 — SHOP</span>
            <h2>MERCH</h2>
            <p>coming soon</p>
          </section>

          <section className="sec" id="partners">
            <span className="eyebrow">05 — NXG IRL</span>
            <h2>PARTNERS</h2>
            {partners.length > 0 && (
              <div className="alb-grid">
                {partners.map((p, i) => (
                  <a className="alb" key={i} href={p.url || '#'} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <img className="cover" src={att(p.logo)} alt={p.name} />
                    <div className="alb-t">{p.name}</div>
                  </a>
                ))}
              </div>
            )}
          </section>

          <section className="sec" id="about">
            <span className="eyebrow b">06 — THE CONCEPT</span>
            <h2>ABOUT</h2>
            {copyVal(copy, 'about_body') && <p style={{ maxWidth: 620, textTransform: 'none', lineHeight: 1.7, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{copyVal(copy, 'about_body')}</p>}
          </section>

          <PrivateContent packs={packs} />
        </main>
      )}

      {/* ===== TOP BAR ===== */}
      <header className={'topnav' + (entered ? ' show' : '')}>
        <span className="tn-mark">NXG</span>
        <button className="burger" aria-label="Open menu" onClick={() => setMenuOpen(true)}><i /><i /><i /></button>
      </header>

      {/* ===== MENU ===== */}
      <nav className={'menu' + (menuOpen ? ' open' : '')} aria-hidden={!menuOpen}>
        <div className="menu-top"><span className="tn-mark">NXG</span><button className="menu-x" aria-label="Close menu" onClick={() => setMenuOpen(false)}>✕</button></div>
        <ul className="menu-links">
          {[['home', 'HOME'], ['members', 'MEMBERS'], ['discography', 'DISCOGRAPHY'], ['media', 'MEDIA'], ['merch', 'MERCH'], ['partners', 'PARTNERS'], ['about', 'ABOUT']].map(([id, label]) => (
            <li key={id} onClick={() => scrollTo(id)}>{label}</li>
          ))}
          <li onClick={() => scrollTo('private')}>PRIVATE CONTENT <span className="lock">⬡</span></li>
        </ul>
        <div className="menu-foot">
          <span className="t-node">NODE</span> <span className="t-x">X</span> <span className="t-gen">GENERATION</span> &nbsp;·&nbsp;
          <button className="replay" onClick={() => { setMenuOpen(false); runBoot(); }}>↺ replay intro</button>
        </div>
      </nav>

      {/* ===== LOADER ===== */}
      {phase === 'boot' && (
        <section id="loader" className="overlay">
          <div className="l-scan" /><div className="l-vig" />
          <div className="stage">
            <div className="chibi-wrap"><div className="chibi-inner" ref={innerRef}><img className="chibi" ref={chibiRef} alt="" draggable="false" /></div></div>
            <div className="console">
              <div className="node" ref={nodeRef}>NODE&nbsp;//&nbsp;<span>{member}</span></div>
              <div className="pct"><span ref={pctRef}>0</span><i>%</i></div>
              <div className="bootline"><span className="caret">&gt;</span> <span ref={bootRef}>initializing nxg.exe</span><span className="cursor">▌</span></div>
              <div className="bar"><span className="fill" ref={fillRef} /></div>
            </div>
          </div>
          <div className="flash" ref={flashRef} />
        </section>
      )}

      {/* ===== GATE ===== */}
      {phase !== 'boot' && (
        <section className={'overlay gate' + (phase === 'gate' ? ' show' : ' out')} style={phase === 'site' ? { pointerEvents: 'none' } : null}>
          <div className="void"><BgLayers url={bgUrl} /></div>
          <div className="topbar"><span className="status"><i className="dot" /> SIGNAL ACTIVE</span><span className="est">EST · MMXXVI</span></div>
          <div className="hero-gate">
            <div className="emblem-tilt" ref={tiltRef}><img className="emblem" src={logo} alt="NXG" draggable="false" /></div>
            <div className="tagline"><span className="t-node">NODE</span> <span className="t-x">X</span> <span className="t-gen">GENERATION</span></div>
            <div className="langs">
              {LANGS.map(([code, label]) => (
                <button key={code} className={'lang' + (activeLang === code ? ' on' : '') + (code !== 'EN' ? ' soon' : '')} onClick={() => pickLang(code)}>{label}</button>
              ))}
            </div>
            <div className={'langnote' + (langNote ? ' show' : '')}>translations coming soon</div>
            <button className="enter" onClick={enter}>ENTER<span className="ar">→</span></button>
          </div>
        </section>
      )}

      {/* ===== PLAYER (real Spotify, plays count) ===== */}
      <SpotifyPlayer tracks={pub(data && data.tracks)} show={entered} logo={logo} />
      <MemberBio m={bioMember} onClose={() => setBioMember(null)} />
      <AlbumView album={openAlbum} tracks={tracks} onClose={() => setOpenAlbum(null)} />
    </>
  );
}
