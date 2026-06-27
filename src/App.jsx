import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useData, usePrivate, pub, copyVal, att, atts, attRaw } from './lib/data.js';
import { initSmoothScroll } from './lib/smoothScroll.js';
import { setupReveals } from './lib/reveals.js';

/* ---- bundled fallback assets (used until Airtable is populated) ---- */
const LOGO_FALLBACK = '/assets/logo.png';
const HERO_FALLBACK = '/assets/hero.png';

/* ---- private-content doorman ---- */
const DOORMAN_URL = 'https://script.google.com/macros/s/AKfycbz2wmyu6Y33zZ_7LIkUY05PAwg4aJPQlNsCTaRDSxSAyvNh3eM1I9GEmfOM3alK/exec';
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

/* ===== shared endless conveyor belt ===== */
function Belt({ items, renderCard, onTap, size = 'md', controllerRef, onActive, resetKey, arrows = true }) {
  const N = items.length;
  const vpRef = useRef(null), beltRef = useRef(null);
  const S = useRef({ tx: 0, target: 0, vel: 0, dragging: false, lastX: 0, step: 320, cw: 280, moved: 0, abs: 0 });
  const [active, setActive] = useState(0);
  const estW = size === 'sm' ? 200 : size === 'lg' ? 380 : 340;
  const COPIES = React.useMemo(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1440;
    let c = Math.max(7, Math.ceil((w * 3) / (Math.max(1, N) * estW)));
    if (c % 2 === 0) c++;
    return c;
  }, [N, estW]);
  const MID = Math.floor(COPIES / 2) * N;

  const cells = [];
  if (N) for (let c = 0; c < COPIES; c++) for (let i = 0; i < N; i++) cells.push({ item: items[i], real: i, abs: c * N + i });

  const wasDrag = () => S.current.moved > 6;

  useEffect(() => {
    const vp = vpRef.current, belt = beltRef.current;
    if (!vp || !belt || !N) return;
    const cards = [].slice.call(belt.children);
    let raf, lastReal = -1;
    const measure = () => {
      S.current.cw = cards[0].offsetWidth;
      S.current.step = cards.length > 1 ? (cards[1].offsetLeft - cards[0].offsetLeft) : (S.current.cw + 40);
    };
    const vc = () => vp.clientWidth / 2;
    const centerTx = (abs) => vc() - S.current.cw / 2 - abs * S.current.step;
    const activeAbs = () => Math.round((vc() - S.current.cw / 2 - S.current.tx) / S.current.step);
    const wrap = () => { const sh = Math.round((activeAbs() - MID) / N); if (sh) { const d = sh * N * S.current.step; S.current.tx += d; S.current.target += d; } };
    const render = () => {
      belt.style.transform = `translate3d(${S.current.tx}px,-50%,0)`;
      const center = vc(), act = activeAbs();
      cards.forEach((el, i) => {
        const cc = S.current.tx + i * S.current.step + S.current.cw / 2;
        const dist = Math.min(Math.abs(cc - center) / (S.current.step * 1.4), 1);
        el.style.transform = `scale(${1 - dist * 0.30})`;
        el.style.opacity = (1 - dist * 0.5).toFixed(3);
        el.style.zIndex = String(100 - Math.round(dist * 100));
        el.classList.toggle('on', i === act);
      });
    };
    const loop = () => {
      const s = S.current;
      if (!s.dragging) {
        if (Math.abs(s.vel) > 0.3) { s.tx += s.vel; s.vel *= 0.93; if (Math.abs(s.vel) <= 0.3) s.target = centerTx(activeAbs()); }
        else { s.tx += (s.target - s.tx) * 0.12; }
      }
      wrap(); render(); s.abs = activeAbs();
      const r = ((s.abs % N) + N) % N; if (r !== lastReal) { lastReal = r; setActive(r); onActive && onActive(r); }
      raf = requestAnimationFrame(loop);
    };
    const move = (e) => { if (!S.current.dragging) return; const dx = e.clientX - S.current.lastX; S.current.lastX = e.clientX; S.current.tx += dx; S.current.vel = dx; S.current.moved += Math.abs(dx); };
    const up = () => { if (!S.current.dragging) return; S.current.dragging = false; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); if (Math.abs(S.current.vel) <= 0.3) S.current.target = centerTx(activeAbs()); };
    const down = (e) => { S.current.dragging = true; S.current.lastX = e.clientX; S.current.vel = 0; S.current.moved = 0; window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); };
    const wheel = (e) => { e.preventDefault(); S.current.tx -= (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY); S.current.vel = 0; clearTimeout(vp._wt); vp._wt = setTimeout(() => { S.current.target = centerTx(activeAbs()); }, 90); };
    const key = (e) => { if (e.key === 'ArrowRight') S.current.target = centerTx(activeAbs() + 1); else if (e.key === 'ArrowLeft') S.current.target = centerTx(activeAbs() - 1); };
    const resize = () => { measure(); S.current.target = centerTx(activeAbs()); };

    measure();
    S.current.tx = centerTx(MID); S.current.target = S.current.tx;
    vp.addEventListener('pointerdown', down);
    vp.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('keydown', key); window.addEventListener('resize', resize);
    loop();
    S.current.nav = (dir) => { S.current.target = centerTx(activeAbs() + dir); };
    // a clean tap (not a drag) opens that album directly
    S.current.tapAbs = (abs) => { if (S.current.moved > 6) return; const real = ((abs % N) + N) % N; onTap && onTap(items[real], real); };
    if (controllerRef) controllerRef.current = { nav: (d) => S.current.nav(d) };
    return () => {
      cancelAnimationFrame(raf);
      vp.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      vp.removeEventListener('wheel', wheel); window.removeEventListener('keydown', key); window.removeEventListener('resize', resize);
    };
  }, [resetKey, N]);

  if (!N) return null;
  return (
    <>
      <div className={'belt-vp ' + size} ref={vpRef} data-lenis-prevent>
        <div className="belt-track" ref={beltRef}>
          {cells.map((c) => (
            <div className="belt-card" key={c.abs} onClick={() => S.current.tapAbs && S.current.tapAbs(c.abs)}>
              {renderCard(c.item, c.real, { wasDrag })}
            </div>
          ))}
        </div>
      </div>
      {arrows && N > 1 && (
        <div className="belt-arrows">
          <button className="disc-arrow" onClick={() => S.current.nav && S.current.nav(-1)} aria-label="Previous">‹</button>
          <button className="disc-arrow" onClick={() => S.current.nav && S.current.nav(1)} aria-label="Next">›</button>
        </div>
      )}
    </>
  );
}

function Discography({ albums, tracks, onOpen }) {
  const [active, setActive] = useState(0);
  const ctrl = useRef(null);
  const counts = React.useMemo(() => albums.map((a) =>
    (tracks || []).filter((t) => Array.isArray(t.album) && t.album.indexOf(a.id) !== -1).length), [albums, tracks]);
  if (!albums.length) {
    return (<section className="sec discsec" id="discography"><span className="eyebrow b">02 — RELEASES</span><h2>DISCOGRAPHY</h2></section>);
  }
  const a = albums[active];
  return (
    <section className="sec discsec" id="discography">
      <span className="eyebrow b">02 — RELEASES</span>
      <h2>DISCOGRAPHY</h2>
      <Belt
        items={albums} size="md" arrows={false} resetKey={albums.length}
        controllerRef={ctrl} onActive={setActive} onTap={(al) => onOpen(al)}
        renderCard={(al) => (
          <div className="bc-frame"><img className="bc-img" src={att(al.cover)} alt={al.title} draggable="false" /></div>
        )}
      />
      <div className="disc-readout">
        {albums.length > 1 && <button className="disc-arrow" onClick={() => ctrl.current && ctrl.current.nav(-1)} aria-label="Previous album">‹</button>}
        <div className="disc-read-mid" onClick={() => onOpen(a)}>
          <div className="disc-title">{a.title}</div>
          <div className="disc-date">{[a.release_date, counts[active] ? `${counts[active]} TRACKS` : ''].filter(Boolean).join(' · ')}</div>
          <span className="disc-view">VIEW ALBUM →</span>
        </div>
        {albums.length > 1 && <button className="disc-arrow" onClick={() => ctrl.current && ctrl.current.nav(1)} aria-label="Next album">›</button>}
      </div>
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

function MediaLightbox({ photos, index, title, onClose, onNav }) {
  const it = photos[index];
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && photos.length > 1) onNav((index - 1 + photos.length) % photos.length);
      else if (e.key === 'ArrowRight' && photos.length > 1) onNav((index + 1) % photos.length);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [index, photos.length]);
  if (!it) return null;
  const prev = (e) => { e.stopPropagation(); onNav((index - 1 + photos.length) % photos.length); };
  const next = (e) => { e.stopPropagation(); onNav((index + 1) % photos.length); };
  return createPortal(
    <div className="media-lb" onClick={onClose}>
      <button className="lb-close" onClick={onClose} aria-label="Close">✕</button>
      {photos.length > 1 && <div className="lb-count">{index + 1} / {photos.length}</div>}
      {photos.length > 1 && <button className="lb-nav lb-prev" onClick={prev} aria-label="Previous">‹</button>}
      <div className="lb-content" onClick={(e) => e.stopPropagation()}>
        {it.type === 'image'
          ? <img src={it.url} alt={title} />
          : <video src={it.url} controls autoPlay playsInline />}
        {title && <div className="lb-title">{title}</div>}
      </div>
      {photos.length > 1 && <button className="lb-nav lb-next" onClick={next} aria-label="Next">›</button>}
    </div>,
    document.body
  );
}

function MediaSection({ media }) {
  const albums = React.useMemo(() => (media || [])
    .filter((m) => !m.vault_only)
    .map((m) => {
      const photos = attRaw(m.file).map((f) => {
        const name = f.filename || f.url || '';
        const isVid = (f.type || '').startsWith('video') || /\.(mp4|mov|webm|m4v)(\?|$)/i.test(name);
        return { type: isVid ? 'video' : 'image', url: f.url };
      }).filter((x) => x.url);
      const firstImg = photos.find((p) => p.type === 'image');
      const cover = att(m.thumb) || (firstImg ? firstImg.url : (photos[0] ? photos[0].url : ''));
      const kind = (photos[0] && photos[0].type === 'video') ? 'video' : 'image';
      return { id: m.id, title: m.title || '', category: m.category || '', cover, kind, photos, count: photos.length };
    })
    .filter((a) => a.photos.length), [media]);
  const [tab, setTab] = useState('image');
  const [cat, setCat] = useState('All');
  const [album, setAlbum] = useState(null);
  const [idx, setIdx] = useState(0);
  const tabAlbums = albums.filter((a) => a.kind === tab);
  const cats = ['All', ...Array.from(new Set(tabAlbums.map((a) => a.category).filter(Boolean)))];
  const shown = cat === 'All' ? tabAlbums : tabAlbums.filter((a) => a.category === cat);
  const switchTab = (t) => { setTab(t); setCat('All'); setAlbum(null); };
  const openAlbum = (a) => { setAlbum(a); setIdx(0); };
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
        <Belt
          items={shown} size="md" resetKey={`${tab}-${cat}-${shown.length}`}
          onTap={(a) => openAlbum(a)}
          renderCard={(a) => (
            <>
              <div className="bc-frame">
                <div className="bc-bg" style={{ backgroundImage: `url(${a.cover})` }} />
                {a.kind === 'video' && <span className="bc-play">▶</span>}
                {a.count > 1 && <span className="bc-badge">⬚ {a.count}</span>}
              </div>
              {a.title && <span className="bc-cap">{a.title}</span>}
            </>
          )}
        />
      ) : <p className="media-empty">Nothing here yet — upload to the MEDIA table.</p>}
      {album && <MediaLightbox photos={album.photos} index={idx} title={album.title} onClose={() => setAlbum(null)} onNav={setIdx} />}
    </section>
  );
}

function PrivateContent({ packs }) {
  return (
    <section className="sec vault" id="private">
      <span className="eyebrow">07 — MEMBERS ONLY</span>
      <h2>PRIVATE CONTENT <i className="hex">⬡</i></h2>
      {packs.length ? (
        <Belt
          items={packs} size="md" resetKey={packs.length} onTap={() => {}}
          renderCard={(p, i, api) => (
            <>
              <div className="bc-frame">
                {p.teaser && <img className="bc-img bc-blur" src={p.teaser} alt="" draggable="false" />}
                <div className="bc-veil"><span>⬡</span></div>
                {p.price != null && <span className="bc-price">${p.price}</span>}
                {p.count > 0 && <span className="bc-badge">{p.count} PHOTOS</span>}
              </div>
              <span className="bc-cap">{p.title}</span>
              <a className="bc-btn" href={DOORMAN_URL ? `${DOORMAN_URL}?route=buy&pack=${p.id}` : '#'}
                 target="_blank" rel="noopener noreferrer"
                 onClick={(e) => { if (api.wasDrag()) { e.preventDefault(); } }}>UNLOCK →</a>
            </>
          )}
        />
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

function RatePill() {
  const [rate, setRate] = useState(null);
  useEffect(() => {
    let on = true;
    const load = () => fetch('https://open.er-api.com/v6/latest/USD')
      .then((r) => r.json())
      .then((d) => { if (on && d && d.rates && d.rates.PHP) setRate(d.rates.PHP); })
      .catch(() => {});
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => { on = false; clearInterval(id); };
  }, []);
  if (!rate) return null;
  return (
    <div className="ratepill" title="Live reference rate">
      <span className="rp-dot" />
      <span className="rp-label">1 USD</span>
      <span className="rp-eq">≈</span>
      <span className="rp-val">₱{rate.toFixed(2)}</span>
    </div>
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
  const packs = usePrivate();
  const partners = pub(data && data.partners);
  const merch = pub(data && data.merch);
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

  // Stage 1 — buttery smooth scrolling (Lenis + GSAP ticker). Reduced-motion safe.
  useEffect(() => { const cleanup = initSmoothScroll(); return cleanup; }, []);

  // Stage 2 — scroll-reveal. Re-applies when the site appears or content counts change.
  const revealsRef = useRef(null);
  useEffect(() => {
    if (phase !== 'site') return;
    const id = requestAnimationFrame(() => {
      if (revealsRef.current) revealsRef.current();
      revealsRef.current = setupReveals(document.getElementById('root') || document);
    });
    return () => { cancelAnimationFrame(id); if (revealsRef.current) { revealsRef.current(); revealsRef.current = null; } };
    // eslint-disable-next-line
  }, [phase, members.length, albums.length, media.length, packs.length, partners.length, merch.length]);

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
  function scrollTo(id) { setMenuOpen(false); const el = document.getElementById(id); if (!el) return; setTimeout(() => { if (window.__lenis) window.__lenis.scrollTo(el, { offset: 0 }); else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }, 200); }
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
            {merch.length ? (
              <Belt
                items={merch} size="lg" resetKey={merch.length} onTap={() => {}}
                renderCard={(m) => (
                  <>
                    <div className="bc-frame">
                      <img className="bc-img" src={att(m.image) || att(m.photo) || att(m.cover)} alt={m.name || m.title} draggable="false" />
                      {m.price != null && <span className="bc-price">${m.price}</span>}
                    </div>
                    <span className="bc-cap">{m.name || m.title}</span>
                    <button className="bc-btn ghost" disabled>STORE OPENS SOON</button>
                  </>
                )}
              />
            ) : <p className="media-empty">Store opening soon.</p>}
          </section>

          <section className="sec" id="partners">
            <span className="eyebrow">05 — NXG IRL</span>
            <h2>PARTNERS</h2>
            {partners.length ? (
              <Belt
                items={partners} size="sm" resetKey={partners.length}
                onTap={(p) => { if (p.url) window.open(p.url, '_blank', 'noopener'); }}
                renderCard={(p) => (
                  <>
                    <div className="bc-frame bc-logo"><img className="bc-img" src={att(p.logo)} alt={p.name} draggable="false" /></div>
                    {p.name && <span className="bc-cap">{p.name}</span>}
                  </>
                )}
              />
            ) : <p className="media-empty">Partners revealed soon.</p>}
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

      {entered && <RatePill />}

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
