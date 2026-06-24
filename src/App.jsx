import React, { useEffect, useRef, useState } from 'react';
import { useData, pub, copyVal, att, atts } from './lib/data.js';

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

export default function App() {
  const data = useData();
  const [phase, setPhase] = useState('boot');     // boot | gate | site
  const [member, setMember] = useState('CHENXI'); // current boot member
  const [menuOpen, setMenuOpen] = useState(false);
  const [langNote, setLangNote] = useState(false);
  const [activeLang, setActiveLang] = useState('EN');
  const [bioMember, setBioMember] = useState(null);

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
  const media = pub(data && data.media);
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
  useEffect(() => { runBoot(); /* eslint-disable-next-line */ }, []);

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
  function enter() { startAudio(); setPhase('site'); }
  function scrollTo(id) { setMenuOpen(false); const el = document.getElementById(id); if (el) setTimeout(() => el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }), 200); }
  function pickLang(code) { setActiveLang(code); if (code !== 'EN') { setLangNote(true); clearTimeout(window._lt); window._lt = setTimeout(() => setLangNote(false), 1800); } }

  const entered = phase === 'site';

  return (
    <>
      {/* ===== SITE ===== */}
      {entered && (
        <main className="site">
          <section className="hero" id="home">
            <div className="hero-bg" style={{ backgroundImage: `url(${hero})` }} />
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

          <section className="sec" id="discography">
            <span className="eyebrow b">02 — RELEASES</span>
            <h2>DISCOGRAPHY</h2>
            <p>Gravity · The Popification of the Robots</p>
            {albums.length > 0 && (
              <div className="alb-grid">
                {albums.map((a, i) => (
                  <div className="alb" key={i}>
                    <img className="cover" src={att(a.cover)} alt={a.title} />
                    <div className="alb-t">{a.title}</div>
                    {a.release_date && <div className="alb-d">{a.release_date}</div>}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="sec" id="media">
            <span className="eyebrow">03 — THE FEED</span>
            <h2>MEDIA</h2>
            <p>clips · canvases · stills · the unreleased</p>
            {media.length > 0 && (
              <div className="med-grid">
                {media.map((m, i) => (
                  <div className="med" key={i}>
                    {m.type === 'video'
                      ? <video src={att(m.file)} poster={att(m.thumb)} muted loop playsInline />
                      : <img src={att(m.file)} alt={m.title} />}
                    {m.vault_only && <span className="lockbadge">⬡</span>}
                  </div>
                ))}
              </div>
            )}
          </section>

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
            {copyVal(copy, 'about_body') && <p style={{ maxWidth: 620, textTransform: 'none', lineHeight: 1.7, color: 'var(--ink)' }}>{copyVal(copy, 'about_body')}</p>}
          </section>

          <section className="sec vault" id="private">
            <span className="eyebrow">07 — MEMBERS ONLY</span>
            <h2>PRIVATE CONTENT <i className="hex">⬡</i></h2>
          </section>
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
          <div className="void" style={{ backgroundImage: `url(${hero})` }} />
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

      {/* ===== PLAYER ===== */}
      <div className={'player' + (entered ? ' show' : '')}>
        <div className="pl-art" />
        <div className="pl-mid"><div className="pl-track">{copyVal(copy, 'now_playing', 'GRAVITY — NXG')}</div><div className="pl-prog"><span style={{ width: prog + '%' }} /></div></div>
        <button className="pl-btn" aria-label="Play / pause" onClick={togglePlay}>{playing ? '❚❚' : '▶'}</button>
        <button className="pl-mute" aria-label="Mute" onClick={toggleMute}>{muted ? '✕' : '♪'}</button>
      </div>
      <MemberBio m={bioMember} onClose={() => setBioMember(null)} />
    </>
  );
}
