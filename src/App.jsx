import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useData, usePrivate, pub, copyVal, att, atts, attRaw, setLang } from './lib/data.js';
import { initSmoothScroll } from './lib/smoothScroll.js';
import { setupReveals } from './lib/reveals.js';
import { gsap } from 'gsap';

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
const LANGS = [['EN', 'EN'], ['KO', '한국어'], ['JA', '日本語'], ['ZH', '中文'], ['FIL', 'Filipino'], ['ES', 'Español']];
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion:reduce)').matches;

// Lock the page (background) from scrolling while a modal/popup is open, WITHOUT
// stopping Lenis entirely — the popup's own scrollable area is marked with
// data-lenis-prevent so wheel/touch scroll works inside it natively.
function useScrollLock(active) {
  useEffect(() => {
    if (!active) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, [active]);
}

/* ===========================================================
   PHASE 2 — falling cultural particles (sparse, slow, premium)
   Reads the active language; draws the matching object on a
   lightweight canvas. Mobile-capped + reduced-motion safe.
   ES has a hidden paella easter egg (tap NXG wordmark x5).
   =========================================================== */
const PARTICLE_THEME = {
  EN:  { kind: 'dot',        colors: ['#ffffff'],                       count: 16, sizeMin: 1.5, sizeMax: 3,  fall: 0.35, sway: 0.4, spin: 0 },
  JA:  { kind: 'sakura',     colors: ['#ffd6e6', '#ffb3d1', '#ff9ec2'], count: 18, sizeMin: 8,   sizeMax: 14, fall: 0.55, sway: 1.1, spin: 0.9 },
  KO:  { kind: 'leaf',       colors: ['#e8a13c', '#d2691e', '#c0392b'], count: 16, sizeMin: 9,   sizeMax: 15, fall: 0.6,  sway: 1.3, spin: 1.4 },
  ZH:  { kind: 'coin',       colors: ['#f5c518', '#ffd700', '#e0a800'], count: 14, sizeMin: 9,   sizeMax: 14, fall: 0.7,  sway: 0.5, spin: 1.8 },
  FIL: { kind: 'sampaguita', colors: ['#ffffff', '#fff8e7', '#fcd116'], count: 16, sizeMin: 8,   sizeMax: 13, fall: 0.5,  sway: 1.0, spin: 0.7 },
  ES:  { kind: 'rose',       colors: ['#c60b1e', '#a00718', '#ffc400'], count: 16, sizeMin: 8,   sizeMax: 14, fall: 0.6,  sway: 1.2, spin: 1.1 },
};

function drawObject(ctx, p) {
  const s = p.size;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.globalAlpha = p.alpha;
  ctx.fillStyle = p.color;
  switch (p.kind) {
    case 'dot':
      ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill();
      break;
    case 'sakura': {
      // five soft petals
      for (let i = 0; i < 5; i++) {
        ctx.rotate((Math.PI * 2) / 5);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(s * 0.5, -s * 0.5, 0, -s);
        ctx.quadraticCurveTo(-s * 0.5, -s * 0.5, 0, 0);
        ctx.fill();
      }
      break;
    }
    case 'leaf': {
      // simple maple-ish leaf body
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(s * 0.8, -s * 0.2, s * 0.4, s * 0.6);
      ctx.quadraticCurveTo(0, s * 0.3, -s * 0.4, s * 0.6);
      ctx.quadraticCurveTo(-s * 0.8, -s * 0.2, 0, -s);
      ctx.fill();
      // stem
      ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(1, s * 0.08);
      ctx.beginPath(); ctx.moveTo(0, s * 0.6); ctx.lineTo(0, s); ctx.stroke();
      break;
    }
    case 'coin': {
      // gold disc with a square hole (Chinese cash coin)
      ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = p.alpha * 0.9;
      ctx.fillStyle = 'rgba(120,80,0,0.55)';
      const h = s * 0.32;
      ctx.fillRect(-h / 2, -h / 2, h, h);
      // rim shine
      ctx.globalAlpha = p.alpha;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = Math.max(1, s * 0.07);
      ctx.beginPath(); ctx.arc(0, 0, s * 0.92, -0.6, 0.8); ctx.stroke();
      break;
    }
    case 'sampaguita': {
      // five rounded white petals + tiny gold center
      for (let i = 0; i < 5; i++) {
        ctx.rotate((Math.PI * 2) / 5);
        ctx.beginPath();
        ctx.ellipse(0, -s * 0.55, s * 0.32, s * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fcd116';
      ctx.beginPath(); ctx.arc(0, 0, s * 0.22, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'rose': {
      // layered curled petal
      ctx.beginPath();
      ctx.moveTo(0, s * 0.6);
      ctx.bezierCurveTo(s, s * 0.2, s * 0.7, -s, 0, -s);
      ctx.bezierCurveTo(-s * 0.7, -s, -s, s * 0.2, 0, s * 0.6);
      ctx.fill();
      ctx.globalAlpha = p.alpha * 0.5;
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.moveTo(0, s * 0.3);
      ctx.bezierCurveTo(s * 0.5, 0, s * 0.4, -s * 0.5, 0, -s * 0.6);
      ctx.bezierCurveTo(-s * 0.4, -s * 0.5, -s * 0.5, 0, 0, s * 0.3);
      ctx.fill();
      break;
    }
    default:
      ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/* ===========================================================
   PHASE 2 — "TALK TO NXG" voice-call feature
   Floating button -> phone-call popup. Edition decides who
   answers (EN = random member for the day). Reads three CMS
   tables: talk_questions / talk_answers / talk_greetings.
   Answered questions lock until local midnight (per browser).
   Audio only — no captions (real call feel).
   =========================================================== */
const EDITION_MEMBER = { ZH: 'CHENXI', KO: 'YOORA', JA: 'HARUKA', FIL: 'SARAYA', ES: 'SARAYA' };
const TALK_MEMBERS = ['CHENXI', 'YOORA', 'HARUKA', 'SARAYA'];

// today's key (local) — used for daily reset + stable EN "member of the day"
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
// deterministic pick so EN gives the same member all day, then changes at midnight
const memberOfDay = () => {
  const k = todayKey();
  let h = 0;
  for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
  return TALK_MEMBERS[h % TALK_MEMBERS.length];
};

const LOCK_KEY = 'nxg_talk_lock';
const readLocks = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCK_KEY) || '{}');
    if (raw.day !== todayKey()) return { day: todayKey(), used: [] }; // reset at midnight
    return raw;
  } catch (e) { return { day: todayKey(), used: [] }; }
};
const writeLocks = (obj) => { try { localStorage.setItem(LOCK_KEY, JSON.stringify(obj)); } catch (e) {} };

function TalkToNXG({ lang, data, members }) {
  const [open, setOpen] = useState(false);
  useScrollLock(open);
  const [stage, setStage] = useState('idle');   // idle | ringing | connected
  const [locks, setLocks] = useState(() => (typeof window !== 'undefined' ? readLocks() : { day: '', used: [] }));
  const [lastClip, setLastClip] = useState({}); // question_key -> last audio url (avoid repeat)
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);
  const ringTimer = useRef(null);
  const ringAudioRef = useRef(null);   // synthesized ringtone (Web Audio)
  const answerTimer = useRef(null);    // pending "she answers after pause" timer

  // which member answers in this edition
  const memberName = (lang === 'EN' || !EDITION_MEMBER[lang]) ? memberOfDay() : EDITION_MEMBER[lang];

  const questions = (data && data.talk_questions) || [];
  const answers = (data && data.talk_answers) || [];
  const greetings = (data && data.talk_greetings) || [];

  // questions for this edition's language, published, ordered
  const myQuestions = questions
    .filter((q) => q.published && (q.lang === lang || (lang === 'EN' && q.lang === 'EN')))
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // this member's greeting for THIS edition's language (carries the call selfie photo)
  const myGreet = greetings.filter((g) => g.published && g.member === memberName && g.lang === lang);
  // fallback: if no greeting in this exact language, use any published greeting for the member
  const greetPool = myGreet.length ? myGreet : greetings.filter((g) => g.published && g.member === memberName);
  const selfie = greetPool.length ? att(greetPool[0].photo) : '';
  // member color from the members table for theming the call
  const memberObj = (members || []).find((m) => (m.name || '').toUpperCase() === memberName);
  const accent = (memberObj && memberObj.color) || 'var(--pink)';

  // ---- synthesized phone ringtone (no file needed) ----
  function startRing() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      ringAudioRef.current = { ctx, timers: [] };
      // one "ring" = two short warble tones; repeat with a gap, like a phone
      const ringOnce = (startAt) => {
        [0, 0.4].forEach((off) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.value = 440;          // classic ring pitch
          const t = ctx.currentTime + startAt + off;
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.15, t + 0.02);
          g.gain.setValueAtTime(0.15, t + 0.33);
          g.gain.linearRampToValueAtTime(0, t + 0.35);
          o.connect(g); g.connect(ctx.destination);
          o.start(t); o.stop(t + 0.36);
        });
      };
      // three rings across the ~4.2s window (ring, pause, ring, pause, ring)
      [0, 1.4, 2.8].forEach((s) => ringOnce(s));
    } catch (e) {}
  }
  function stopRing() {
    try {
      if (ringAudioRef.current && ringAudioRef.current.ctx) {
        ringAudioRef.current.ctx.close();
      }
    } catch (e) {}
    ringAudioRef.current = null;
  }

  // ---- "pick up" click: the line-connecting click before she speaks ----
  function pickupClick() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const t = ctx.currentTime;
      // a connect = two very short bright clicks (relay/contacts meeting), no bass thud
      const click = (at, freq, vol) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'square';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t + at);
        g.gain.exponentialRampToValueAtTime(vol, t + at + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.025);
        o.connect(g); g.connect(ctx.destination);
        o.start(t + at); o.stop(t + at + 0.03);
      };
      click(0, 2000, 0.09);      // first contact
      click(0.06, 1400, 0.07);   // second, slightly lower — the "cl-ick"
      setTimeout(() => { try { ctx.close(); } catch (e) {} }, 300);
    } catch (e) {}
  }

  // "question sent" — short rising blip
  function sentBlip() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(520, t);
      o.frequency.exponentialRampToValueAtTime(880, t + 0.12);   // rising = "sent"
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.18);
      setTimeout(() => { try { ctx.close(); } catch (e) {} }, 350);
    } catch (e) {}
  }

  // "answer finished" — soft descending tone
  function doneTone() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(660, t);
      o.frequency.exponentialRampToValueAtTime(440, t + 0.16);   // falling = "done"
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.08, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.24);
      setTimeout(() => { try { ctx.close(); } catch (e) {} }, 400);
    } catch (e) {}
  }

  function startCall() {
    setOpen(true);
    setStage('ringing');
    clearTimeout(ringTimer.current);
    startRing();                              // play the ring sound
    // 3 rings (~1.4s each) then she picks up + plays a random greeting
    ringTimer.current = setTimeout(() => {
      stopRing();
      pickupClick();                         // the line-connecting clunk
      setStage('connected');
      // small natural beat after pickup, then she speaks
      setTimeout(() => playRandom(greetPool, '_greeting'), 450);
    }, 4200);
  }
  function endCall() {
    clearTimeout(ringTimer.current);
    clearTimeout(answerTimer.current);   // cancel any pending answer
    stopRing();
    if (audioRef.current) {
      if (audioRef.current._nxgCleanup) audioRef.current._nxgCleanup();
      audioRef.current.pause();
      audioRef.current.muted = false;
    }
    setPlaying(false);
    setStage('idle');
    setOpen(false);
  }

  function playRandom(pool, qkey) {
    const usable = pool.map((r) => att(r.audio)).filter(Boolean);
    if (!usable.length) return;
    // avoid repeating the last clip for this question
    let choices = usable;
    if (usable.length > 1 && lastClip[qkey]) choices = usable.filter((u) => u !== lastClip[qkey]);
    const url = choices[Math.floor(Math.random() * choices.length)];
    setLastClip((m) => ({ ...m, [qkey]: url }));
    const a = audioRef.current;
    if (!a) return;

    // The old approach played on a blind 800ms timer. If the clip hadn't buffered
    // yet, play() silently did nothing (~50% failures, random by network speed).
    // Fix: wait for BOTH (a) the ~0.8s realistic beat AND (b) the audio actually
    // being ready to play. Only then start. No race, no silent no-ops.
    clearTimeout(answerTimer.current);
    if (a._nxgCleanup) { a._nxgCleanup(); }      // tear down any previous listeners
    try { a.pause(); } catch (e) {}
    a.muted = false;
    a.currentTime = 0;
    a.src = url;
    a.load();
    setPlaying(true);

    let beatDone = false;
    let ready = a.readyState >= 3;               // HAVE_FUTURE_DATA or better
    let started = false;

    const start = () => {
      if (started || !beatDone || !ready) return;
      started = true;
      cleanup();
      try {
        a.currentTime = 0;
        const p = a.play();
        if (p && typeof p.catch === 'function') p.catch(() => setPlaying(false));
      } catch (e) { setPlaying(false); }
    };

    const onCanPlay = () => { ready = true; start(); };
    const onError = () => { cleanup(); setPlaying(false); };
    const cleanup = () => {
      a.removeEventListener('canplay', onCanPlay);
      a.removeEventListener('canplaythrough', onCanPlay);
      a.removeEventListener('error', onError);
      a._nxgCleanup = null;
    };
    a._nxgCleanup = cleanup;

    a.addEventListener('canplay', onCanPlay);
    a.addEventListener('canplaythrough', onCanPlay);
    a.addEventListener('error', onError);

    // the realistic beat: after ~0.8s, mark the beat done and try to start
    answerTimer.current = setTimeout(() => { beatDone = true; start(); }, 800);

    // safety net: if something stalls and we never get "ready" within 6s,
    // force a play attempt anyway so it's never permanently stuck silent.
    setTimeout(() => { if (!started) { ready = true; beatDone = true; start(); } }, 6000);
  }

  function askQuestion(q) {
    if (locks.used.includes(q.key)) return;             // already used today
    const pool = answers.filter((a) => a.published && a.question_key === q.key && a.member === memberName);
    // lock immediately so it can't be double-tapped during the beat
    const next = { day: todayKey(), used: [...locks.used, q.key] };
    setLocks(next); writeLocks(next);
    // "sent" sound fires on tap; playRandom starts the (muted) audio on the same
    // gesture, then her voice comes in after the beat.
    sentBlip();
    playRandom(pool, q.key);
  }

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    // when her answer finishes playing, play the soft "done" tone
    const onEnd = () => { setPlaying(false); doneTone(); };
    a.addEventListener('ended', onEnd);
    return () => a.removeEventListener('ended', onEnd);
  }, []);

  // close call if language (edition) changes mid-call
  useEffect(() => { if (open) endCall(); /* eslint-disable-next-line */ }, [lang]);

  const label = copyVal((data && data.copy) || [], 'talk_cta', 'TALK TO NXG');

  return (
    <>
      <button className="talk-fab" onClick={startCall} aria-label="Talk to NXG">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.7 2.34a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.74-1.27a2 2 0 0 1 2.11-.45c.74.34 1.53.57 2.34.7A2 2 0 0 1 22 16.92z" /></svg>
        <span className="talk-fab-txt">{label}</span>
      </button>

      {open && createPortal(
        <div className="callwrap" onClick={endCall}>
          <div className="callphone" onClick={(e) => e.stopPropagation()} style={{ '--accent': accent }}>
            <div className="call-photo" style={selfie ? { backgroundImage: `url(${selfie})` } : {}}>
              {!selfie && <div className="call-photo-fallback">{memberName}</div>}
              <div className="call-grad" />
            </div>

            {stage === 'ringing' && (
              <div className="call-ringing">
                <div className="ring-rings"><i /><i /><i /></div>
                <div className="call-name">{memberName}</div>
                <div className="call-status">calling<span className="dots"><i>.</i><i>.</i><i>.</i></span></div>
              </div>
            )}

            {stage === 'connected' && (
              <div className="call-live">
                <div className="call-top">
                  <div className="call-name sm">{memberName}</div>
                  <div className={'call-eq' + (playing ? ' on' : '')}><i /><i /><i /><i /></div>
                </div>
                <div className="call-q-list" data-lenis-prevent>
                  {myQuestions.length === 0 && <div className="call-empty">No questions yet.</div>}
                  {myQuestions.map((q) => {
                    const used = locks.used.includes(q.key);
                    return (
                      <button key={q.key} className={'call-q' + (used ? ' used' : '')} disabled={used} onClick={() => askQuestion(q)}>
                        {q.question}
                      </button>
                    );
                  })}
                </div>
                <button className="call-end" onClick={endCall}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.7l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.51-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" /></svg>
                </button>
              </div>
            )}
          </div>
          <audio ref={audioRef} />
        </div>,
        document.body
      )}
    </>
  );
}

function Particles({ lang, paella }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const partsRef = useRef([]);
  useEffect(() => {
    if (reduce) return;                       // respect reduced-motion: no particles
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const isMobile = window.innerWidth < 720;

    const theme = paella
      ? { kind: 'paella', colors: ['#000'], count: isMobile ? 8 : 14, sizeMin: 22, sizeMax: 38, fall: 0.8, sway: 1.4, spin: 1.2 }
      : (PARTICLE_THEME[lang] || PARTICLE_THEME.EN);

    const count = isMobile ? Math.ceil(theme.count * 0.55) : theme.count;

    const resize = () => {
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const rnd = (a, b) => a + Math.random() * (b - a);
    const make = (initial) => ({
      kind: theme.kind,
      x: rnd(0, W),
      y: initial ? rnd(0, H) : rnd(-60, -10),
      size: rnd(theme.sizeMin, theme.sizeMax),
      color: theme.colors[Math.floor(Math.random() * theme.colors.length)],
      alpha: rnd(0.45, 0.9),
      rot: rnd(0, Math.PI * 2),
      vrot: rnd(-theme.spin, theme.spin) * 0.02,
      vy: rnd(theme.fall * 0.6, theme.fall * 1.4),
      swayAmp: rnd(0.3, 1) * theme.sway,
      swayPhase: rnd(0, Math.PI * 2),
      swaySpd: rnd(0.005, 0.015),
    });
    partsRef.current = Array.from({ length: count }, () => make(true));

    const paellaImg = '🥘';
    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      const ps = partsRef.current;
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        p.y += p.vy;
        p.swayPhase += p.swaySpd;
        p.x += Math.sin(p.swayPhase) * p.swayAmp * 0.6;
        p.rot += p.vrot;
        if (p.y - p.size > H) Object.assign(p, make(false));
        if (p.kind === 'paella') {
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.font = `${p.size}px serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillText(paellaImg, 0, 0);
          ctx.restore();
        } else {
          drawObject(ctx, p);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [lang, paella]);

  if (reduce) return null;
  return <canvas ref={canvasRef} className="nxg-particles" aria-hidden="true" />;
}


// hover slideshow uses every image attached in the member's `photo` cell (multi-attachment)
function memberImages(m) {
  const arr = atts(m.photo);
  if (!arr.length) arr.push((MEMBER_FALLBACK[m.name] && MEMBER_FALLBACK[m.name].photo) || HERO_FALLBACK);
  return arr;
}

const SOCIAL_PATHS = {
  spotify: 'M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.18-.96-.6-.12-.42.18-.84.6-.96 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.66.301 1.021zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.301.421-1.02.599-1.561.3z',
  youtube: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  applemusic: 'M23.997 6.124c0-.738-.065-1.47-.24-2.19-.317-1.31-1.062-2.31-2.18-3.043C20.99.517 20.325.285 19.628.155c-.469-.087-.944-.124-1.42-.155-.056-.005-.11-.013-.166-.018H5.962c-.054.005-.11.013-.165.018-.476.031-.951.068-1.42.155-.697.13-1.362.362-1.949.736C1.31 1.244.565 2.244.248 3.554.073 4.274.008 5.006.008 5.744v12.512c0 .738.065 1.47.24 2.19.317 1.31 1.062 2.31 2.18 3.043.587.374 1.252.606 1.949.736.469.087.944.124 1.42.155.056.005.11.013.165.018h12.08c.055-.005.11-.013.166-.018.476-.031.951-.068 1.42-.155.697-.13 1.362-.362 1.949-.736 1.118-.733 1.863-1.733 2.18-3.043.175-.72.24-1.452.24-2.19V6.124zm-6.84 4.917v6.137c0 .53-.16 1.01-.604 1.347-.27.205-.578.32-.91.366-.21.03-.42.046-.63.046-1.06.043-1.95-.79-1.95-1.86 0-.96.7-1.74 1.65-1.88.18-.027.36-.04.54-.06.32-.034.64-.06.95-.15.34-.097.5-.31.5-.66V8.4c0-.36-.16-.52-.51-.45l-5.06 1.02c-.36.075-.49.235-.49.595v7.51c0 .53-.16 1.01-.604 1.347-.27.205-.578.32-.91.366-.21.03-.42.046-.63.046-1.06.043-1.95-.79-1.95-1.86 0-.96.7-1.74 1.65-1.88.18-.027.36-.04.54-.06.32-.034.64-.06.95-.15.34-.097.5-.31.5-.66V6.99c0-.43.21-.66.62-.745l6.45-1.3c.41-.082.74.13.74.55z',
  instagram: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',
  tiktok: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
  x: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  facebook: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  threads: 'M17.336 11.07c-.11-.053-.222-.103-.335-.15-.197-3.636-2.183-5.717-5.52-5.738h-.045c-1.996 0-3.657.852-4.68 2.402l1.835 1.259c.764-1.159 1.963-1.406 2.846-1.406h.03c1.099.007 1.928.326 2.464.948.39.453.651 1.079.781 1.869-.982-.167-2.044-.218-3.18-.153-3.2.184-5.257 2.05-5.119 4.643.07 1.315.726 2.446 1.846 3.185.947.625 2.166.93 3.433.861 1.673-.092 2.985-.729 3.9-1.895.695-.885 1.135-2.032 1.33-3.476.8.483 1.392 1.119 1.72 1.883.555 1.301.587 3.439-1.158 5.183-1.529 1.527-3.366 2.188-6.143 2.208-3.08-.023-5.41-1.011-6.926-2.937C2.046 17.795 1.36 15.245 1.334 12c.026-3.245.712-5.795 2.043-7.582C4.893 2.492 7.223 1.504 10.303 1.48c3.1.023 5.47 1.016 7.044 2.95.772.95 1.354 2.144 1.737 3.539l2.099-.56c-.464-1.717-1.197-3.197-2.196-4.424C17.13 1.058 14.16-.024 10.31 0 6.469.024 3.476 1.108 1.42 3.219.518 4.142 0 5.96 0 12c0 6.04.518 7.858 1.42 8.781C3.476 22.892 6.47 23.976 10.31 24h.045c3.342-.024 5.692-.876 7.617-2.797 2.51-2.51 2.43-5.654 1.603-7.59-.595-1.395-1.737-2.535-3.32-3.31zm-5.39 5.952c-1.402.079-2.86-.55-2.931-1.886-.053-.99.704-2.096 3.02-2.23.265-.015.526-.023.781-.023.847 0 1.64.082 2.36.24-.268 3.349-1.84 3.825-3.21 3.9z',
  soundcloud: 'M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c0-.057-.045-.1-.09-.1m-.899.828c-.06 0-.091.037-.104.094L0 14.479l.165 1.308c0 .055.045.094.09.094s.089-.045.104-.104l.21-1.319-.21-1.334c0-.061-.044-.09-.09-.09m1.83-1.229c-.061 0-.12.045-.12.104l-.21 2.563.225 2.458c0 .062.044.119.119.119.061 0 .105-.057.121-.119l.254-2.458-.254-2.548c-.016-.072-.061-.13-.121-.13m.945-.089c-.075 0-.135.06-.15.135l-.193 2.64.21 2.544c.016.077.075.138.149.138.075 0 .135-.061.15-.15l.24-2.532-.24-2.623c0-.075-.06-.135-.135-.135l-.105.135zm1.155.36c-.005-.09-.075-.149-.159-.149-.09 0-.158.06-.164.149l-.217 2.43.2 2.563c.005.09.075.157.159.157s.151-.068.159-.157l.227-2.563-.227-2.44m.824-1.32c-.105 0-.18.09-.18.181l-.21 3.66.21 2.475c0 .105.075.18.18.18.105 0 .18-.075.18-.196l.24-2.46-.24-3.66c0-.104-.075-.18-.18-.18m.96-.045c-.105 0-.195.09-.195.196l-.181 3.51.196 2.475c0 .105.09.195.18.195.105 0 .195-.09.195-.195l.21-2.475-.21-3.526c0-.105-.09-.18-.18-.18m1.245.345c-.135 0-.224.105-.224.225l-.165 3.196.18 2.49c0 .12.104.225.224.225.12 0 .225-.105.225-.225l.195-2.49-.195-3.196c0-.12-.105-.225-.225-.225m.96-.105c-.135 0-.24.105-.24.24l-.151 3.301.165 2.476c0 .135.105.24.24.24.12 0 .24-.105.24-.24l.181-2.476-.18-3.286c-.016-.135-.121-.24-.241-.24m1.005-.345c-.15 0-.255.12-.255.27l-.135 3.62.15 2.456c0 .15.12.27.255.27.15 0 .27-.12.27-.27l.165-2.456-.165-3.605c0-.15-.12-.271-.27-.271m1.184.255a.275.275 0 0 0-.284.27l-.135 3.396.15 2.443c0 .149.135.284.285.284.149 0 .284-.135.284-.285l.149-2.442-.149-3.396a.282.282 0 0 0-.285-.27m1.395 6.124c.165 0 .285-.135.3-.285l.135-2.428-.135-5.067c0-.165-.135-.3-.3-.3s-.299.135-.299.3l-.12 5.052.135 2.443c0 .165.119.285.284.285m1.005.015c.18 0 .314-.135.314-.314l.12-2.428-.12-2.62c0-.18-.149-.315-.314-.315-.18 0-.315.135-.315.315l-.105 2.62.105 2.428c.016.18.135.314.315.314m1.124-.015c.18 0 .33-.149.33-.329l.105-2.413-.105-1.214c0-.18-.149-.33-.329-.33-.181 0-.33.15-.33.33l-.09 1.214.09 2.413c0 .18.149.329.329.329m4.47-3.84c-.359 0-.704.075-1.02.21-.21-2.371-2.2-4.231-4.63-4.231-.6 0-1.184.12-1.694.314-.195.075-.255.151-.255.301v7.41c0 .166.135.301.301.301.06 0 11.085.005 11.158.005 1.319 0 2.385-1.065 2.385-2.385s-1.065-2.385-2.385-2.385c-.45 0-.87.135-1.215.36',
};
function socialKey(name) { return (name || '').toLowerCase().replace(/[^a-z]/g, ''); }
const SOCIAL_ALIAS = { apple: 'applemusic', music: 'applemusic', itunes: 'applemusic', twitter: 'x', twitterx: 'x', xtwitter: 'x', fb: 'facebook', meta: 'facebook', ig: 'instagram', yt: 'youtube', threadsnet: 'threads', sc: 'soundcloud' };
function SocialIcon({ platform }) {
  const k = socialKey(platform);
  const key = SOCIAL_PATHS[k] ? k : (SOCIAL_ALIAS[k] || k);
  const path = SOCIAL_PATHS[key];
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      {path
        ? <path d={path} />
        : <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />}
    </svg>
  );
}

function MemberCard({ m, onOpen, copy }) {
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
        <span className="mcard-cta">{copyVal(copy, 'card_view_bio', 'VIEW BIO →')}</span>
      </div>
    </div>
  );
}

function MemberBio({ m, onClose, copy }) {
  useScrollLock(!!m);
  if (!m) return null;
  const img = memberImages(m)[0];
  return (
    <div className="bio-ov" onClick={onClose}>
      <div className="bio-panel" onClick={(e) => e.stopPropagation()}>
        <button className="bio-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="bio-img" style={{ backgroundImage: `url(${img})` }} />
        <div className="bio-txt" data-lenis-prevent>
          <span className="bio-eyebrow" style={{ color: m.color || '#ff2d8b' }}>{copyVal(copy, 'bio_eyebrow', 'NXG // MEMBER')}</span>
          <h2>{m.name}</h2>
          {m.tagline && <p className="bio-tag">“{m.tagline}”</p>}
          <h3>{copyVal(copy, 'bio_background', 'BACKGROUND')}</h3>
          <p className="bio-body">{m.bio || copyVal(copy, 'bio_empty', 'Bio coming soon.')}</p>
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

function SpotifyPlayer({ tracks, show, logo, nowLabel }) {
  const pool = React.useMemo(() => {
    const urls = (tracks || []).map((t) => t.spotify_url).filter(Boolean);
    return urls.length ? urls : (FALLBACK_SPOTIFY ? [FALLBACK_SPOTIFY] : []);
  }, [tracks]);
  const [i, setI] = useState(0);
  const [min, setMin] = useState(false);
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
    <div className={'splayer' + (show ? ' show' : '') + (min ? ' min' : '')} onClick={() => { if (min) setMin(false); }}>
      <div className="sp-top">
        <img className="sp-logo" src={logo} alt="NXG" />
        <span className="sp-now">{nowLabel || 'NOW PLAYING'}</span>
        {pool.length > 1 && <button className="sp-next" onClick={(e) => { e.stopPropagation(); shuffle(); }} aria-label="Shuffle">⤿</button>}
        <button className="sp-min" onClick={(e) => { e.stopPropagation(); setMin((m) => !m); }} aria-label={min ? 'Expand player' : 'Minimize player'} title={min ? 'Expand' : 'Minimize'}>{min ? '▢' : '—'}</button>
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
    const wheel = (e) => {
      // only steal clearly-horizontal wheel; vertical scrolling passes through to the page
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      S.current.tx -= e.deltaX; S.current.vel = 0;
      clearTimeout(vp._wt); vp._wt = setTimeout(() => { S.current.target = centerTx(activeAbs()); }, 90);
    };
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
      <div className={'belt-vp ' + size} ref={vpRef}>
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

function Discography({ albums, tracks, onOpen, copy }) {
  const [active, setActive] = useState(0);
  const ctrl = useRef(null);
  const counts = React.useMemo(() => albums.map((a) =>
    (tracks || []).filter((t) => Array.isArray(t.album) && t.album.indexOf(a.id) !== -1).length), [albums, tracks]);
  if (!albums.length) {
    return (<section className="sec discsec" id="discography"><span className="eyebrow b">{copyVal(copy, 'eyebrow_discography', '02 — RELEASES')}</span><h2>{copyVal(copy, 'head_discography', 'DISCOGRAPHY')}</h2></section>);
  }
  const a = albums[active];
  return (
    <section className="sec discsec" id="discography">
      <span className="eyebrow b">{copyVal(copy, 'eyebrow_discography', '02 — RELEASES')}</span>
      <h2>{copyVal(copy, 'head_discography', 'DISCOGRAPHY')}</h2>
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
          <div className="disc-date">{[a.release_date, counts[active] ? `${counts[active]} ${copyVal(copy, 'disc_tracks', 'TRACKS')}` : ''].filter(Boolean).join(' · ')}</div>
          <span className="disc-view">{copyVal(copy, 'disc_view_album', 'VIEW ALBUM →')}</span>
        </div>
        {albums.length > 1 && <button className="disc-arrow" onClick={() => ctrl.current && ctrl.current.nav(1)} aria-label="Next album">›</button>}
      </div>
    </section>
  );
}

function TrackRow({ t, n, open, onToggle, copy }) {
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
          {t.story && (<><h4>{copyVal(copy, 'track_story', 'STORY')}</h4><p className="trk-story">{t.story}</p></>)}
          {t.lyrics && (<><h4>{copyVal(copy, 'track_lyrics', 'LYRICS')}{t.lyricist ? ` — ${t.lyricist}` : ''}</h4><pre className="trk-lyrics">{t.lyrics}</pre></>)}
        </div>
      )}
    </div>
  );
}

function AlbumView({ album, tracks, onClose, copy }) {
  const [openTrack, setOpenTrack] = useState(null);
  const ovRef = useRef(null), panelRef = useRef(null);
  useScrollLock(!!album);
  useEffect(() => {
    if (!album || reduce || !panelRef.current) return;
    gsap.fromTo(ovRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
    gsap.fromTo(panelRef.current, { scale: 0.9, y: 26, opacity: 0 }, { scale: 1, y: 0, opacity: 1, duration: 0.55, ease: 'expo.out' });
  }, [album]);
  const doClose = () => {
    if (reduce || !panelRef.current) { onClose(); return; }
    gsap.to(panelRef.current, { scale: 0.93, y: 18, opacity: 0, duration: 0.3, ease: 'power3.in' });
    gsap.to(ovRef.current, { opacity: 0, duration: 0.3, onComplete: onClose });
  };
  if (!album) return null;
  const list = (tracks || [])
    .filter((t) => Array.isArray(t.album) && t.album.includes(album.id))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  return (
    <div className="bio-ov" ref={ovRef} onClick={doClose}>
      <div className="album-panel" ref={panelRef} data-lenis-prevent onClick={(e) => e.stopPropagation()}>
        <button className="bio-close" onClick={doClose} aria-label="Close">✕</button>
        <div className="album-head">
          <img className="album-cover" src={att(album.cover)} alt={album.title} />
          <div className="album-info">
            <span className="bio-eyebrow" style={{ color: 'var(--blue)' }}>{copyVal(copy, 'album_eyebrow', 'NXG // RELEASE')}</span>
            <h2>{album.title}</h2>
            {album.release_date && <div className="album-date">{album.release_date}</div>}
            {album.blurb && <p className="album-blurb">{album.blurb}</p>}
          </div>
        </div>
        <div className="tracklist">
          {list.length
            ? list.map((t, i) => (
              <TrackRow key={t.id} t={t} n={i + 1} open={openTrack === t.id} onToggle={() => setOpenTrack(openTrack === t.id ? null : t.id)} copy={copy} />
            ))
            : <div className="track-empty">{copyVal(copy, 'album_empty', 'No tracks linked to this album yet.')}</div>}
        </div>
      </div>
    </div>
  );
}

function MediaLightbox({ photos, index, title, onClose, onNav }) {
  const it = photos[index];
  useScrollLock(true);
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && photos.length > 1) onNav((index - 1 + photos.length) % photos.length);
      else if (e.key === 'ArrowRight' && photos.length > 1) onNav((index + 1) % photos.length);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [index, photos.length]);
  // preload the next & previous images so navigating feels instant instead of laggy
  useEffect(() => {
    if (!photos || photos.length < 2) return;
    [(index + 1) % photos.length, (index - 1 + photos.length) % photos.length].forEach((j) => {
      const p = photos[j];
      if (p && p.type === 'image' && p.url) { const im = new Image(); im.src = p.url; }
    });
  }, [index, photos]);
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

function MediaSection({ media, copy }) {
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
      <span className="eyebrow">{copyVal(copy, 'eyebrow_media', '03 — THE FEED')}</span>
      <h2>{copyVal(copy, 'head_media', 'MEDIA')}</h2>
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

function PrivateContent({ packs, copy }) {
  return (
    <section className="sec vault" id="private">
      <span className="eyebrow">{copyVal(copy, 'eyebrow_private', '07 — MEMBERS ONLY')}</span>
      <h2>{copyVal(copy, 'head_private', 'PRIVATE CONTENT')} <i className="hex">⬡</i></h2>
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
  const bg = (u) => (u ? `url(${u})` : 'none');
  return (
    <>
      <div className="bg-layer" style={{ backgroundImage: bg(prev.current) }} />
      <div className="bg-layer bg-top" key={cur} style={{ backgroundImage: bg(cur) }} />
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
  const [paella, setPaella] = useState(false);
  const paellaTaps = useRef({ n: 0, t: 0 });
  const [bioMember, setBioMember] = useState(null);
  const [openAlbum, setOpenAlbum] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [bgPool, setBgPool] = useState([]);
  const [bgUrl, setBgUrl] = useState('');
  const [isMobileView, setIsMobileView] = useState(
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const onChange = (e) => setIsMobileView(e.matches);
    mq.addEventListener ? mq.addEventListener('change', onChange) : mq.addListener(onChange);
    return () => { mq.removeEventListener ? mq.removeEventListener('change', onChange) : mq.removeListener(onChange); };
  }, []);

  const lastRef = useRef(null);
  const chibiRef = useRef(null), innerRef = useRef(null), pctRef = useRef(null),
    fillRef = useRef(null), bootRef = useRef(null), nodeRef = useRef(null),
    flashRef = useRef(null), tiltRef = useRef(null);

  /* ---- resolved content (Airtable over fallback) ---- */
  const settings = (data && data.settings && data.settings[0]) || {};
  const logo = att(settings.logo, LOGO_FALLBACK);
  const hero = att(settings.hero_image, HERO_FALLBACK);
  const aboutBrands = ((data && data.about) || []).filter((b) => att(b.logo));
  const copy = (data && data.copy) || [];
  setLang(activeLang);                          // keep data-layer column in sync each render
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

  // discover landing background photos in /assets/landing.
  // Mobile (<=768px): use ONLY "{i}-mobile.png" — never desktop images.
  // Desktop: use ONLY "{i}.png".
  // Each set is discovered independently, so you can have any number of mobile
  // photos (fewer OR more than desktop). Drop files in /assets/landing/ and they
  // appear automatically — no code changes needed.
  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const found = []; let pending = 0, done = false; const MAX = 50;
    const finalize = () => {
      if (done) return; done = true;
      found.sort((a, b) => a.i - b.i);
      const urls = found.map((f) => f.url);
      setBgPool(urls);
      if (urls.length) setBgUrl(urls[Math.floor(Math.random() * urls.length)]);
    };
    for (let i = 1; i <= MAX; i++) {
      pending++;
      const url = isMobile ? `/assets/landing/${i}-mobile.png` : `/assets/landing/${i}.png`;
      const im = new Image();
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
  function pickLang(code) {
    setActiveLang(code);
    setLang(code);                              // tell the data layer which column to read
    if (code !== 'ES') setPaella(false);        // easter egg only lives on ES
    paellaTaps.current = { n: 0, t: 0 };
    try {
      const c = code.toLowerCase();
      document.documentElement.setAttribute('lang', c === 'fil' ? 'fil' : c);
      document.documentElement.setAttribute('data-lang', c);  // CSS themes + fonts hook
    } catch (e) {}
  }

  // hidden easter egg: tap the NXG wordmark 5x quickly while on Español → raining paella
  function wordmarkTap() {
    const now = Date.now();
    const s = paellaTaps.current;
    s.n = (now - s.t < 800) ? s.n + 1 : 1;
    s.t = now;
    if (s.n >= 5 && activeLang === 'ES') { setPaella((v) => !v); s.n = 0; }
  }

  const entered = phase === 'site';

  return (
    <>
      {/* ===== FALLING CULTURAL PARTICLES (Phase 2) — site only, clean reveal after ENTER ===== */}
      {entered && <Particles lang={activeLang} paella={paella} />}

      {/* ===== TALK TO NXG (Phase 2) ===== */}
      {entered && <TalkToNXG lang={activeLang} data={data} members={members} />}

      {/* ===== SITE ===== */}
      {entered && (
        <main className="site">
          <section className="hero" id="home">
            <div className="hero-bg"><BgLayers url={bgUrl} /></div>
            <div className="hero-fade" />
            <div className="socials">
              <span className="soc-label">{copyVal(copy, 'hero_follow', 'LISTEN & FOLLOW')}</span>
              <div className="soc-row">
                {socials.map((s, i) => (
                  <a className="soc" key={i} href={s.url || '#'} target="_blank" rel="noreferrer" aria-label={s.platform} title={s.platform}><SocialIcon platform={s.platform} /></a>
                ))}
              </div>
            </div>
            <div className="scrollhint">{copyVal(copy, 'hero_scroll', 'SCROLL')} <span>↓</span></div>
          </section>

          <section className="sec memsec" id="members">
            <span className="eyebrow">{copyVal(copy, 'eyebrow_members', '01 — THE GROUP')}</span>
            <h2>{copyVal(copy, 'head_members', 'MEMBERS')}</h2>
            <div className="mgrid">
              {members.map((m, i) => <MemberCard key={i} m={m} onOpen={setBioMember} copy={copy} />)}
            </div>
          </section>

          <Discography albums={albums} tracks={tracks} onOpen={setOpenAlbum} copy={copy} />

          <MediaSection media={media} copy={copy} />

          <section className="sec" id="merch">
            <span className="eyebrow b">{copyVal(copy, 'eyebrow_merch', '04 — SHOP')}</span>
            <h2>{copyVal(copy, 'head_merch', 'MERCH')}</h2>
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
                    <button className="bc-btn ghost" disabled>{copyVal(copy, 'merch_btn', 'STORE OPENS SOON')}</button>
                  </>
                )}
              />
            ) : <p className="media-empty">{copyVal(copy, 'merch_empty', 'Store opening soon.')}</p>}
          </section>

          <section className="sec" id="partners">
            <span className="eyebrow">{copyVal(copy, 'eyebrow_partners', '05 — NXG IRL')}</span>
            <h2>{copyVal(copy, 'head_partners', 'PARTNERS')}</h2>
            {partners.length ? (
              <Belt
                items={partners} size="md" resetKey={partners.length}
                onTap={(p) => setPhoto(att(p.logo))}
                renderCard={(p) => (
                  <>
                    <div className="bc-frame bc-logo"><img className="bc-img" src={att(p.logo)} alt={p.name} draggable="false" /></div>
                    {p.name && <span className="bc-cap">{p.name}</span>}
                  </>
                )}
              />
            ) : <p className="media-empty">{copyVal(copy, 'partners_empty', 'Partners revealed soon.')}</p>}
          </section>

          <section className="sec" id="about">
            <span className="eyebrow b">{copyVal(copy, 'eyebrow_about', '06 — THE CONCEPT')}</span>
            <h2>{copyVal(copy, 'head_about', 'ABOUT')}</h2>
            {copyVal(copy, 'about_body') && <p style={{ maxWidth: 620, textTransform: 'none', lineHeight: 1.7, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{copyVal(copy, 'about_body')}</p>}
            {aboutBrands.length > 0 && (
              <div className="about-brands">
                <div className="ab-logos">
                  {aboutBrands.map((b, i) => (
                    <a key={i} href={b.url || '#'} target="_blank" rel="noreferrer" aria-label={b.name}>
                      <img src={att(b.logo)} alt={b.name || ''} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </section>

          <PrivateContent packs={packs} copy={copy} />
        </main>
      )}

      {/* ===== TOP BAR ===== */}
      <header className={'topnav' + (entered ? ' show' : '')}>
        <span className="tn-mark" onClick={wordmarkTap}>NXG</span>
        <button className="burger" aria-label="Open menu" onClick={() => setMenuOpen(true)}><i /><i /><i /></button>
      </header>

      {entered && <RatePill />}

      {/* ===== MENU ===== */}
      <nav className={'menu' + (menuOpen ? ' open' : '')} aria-hidden={!menuOpen}>
        <div className="menu-bg" style={{ backgroundImage: `url(/assets/menu/${activeLang.toLowerCase()}${isMobileView ? '-mobile' : ''}.png)` }} aria-hidden="true" />
        <div className="menu-top"><span className="tn-mark">NXG</span><button className="menu-x" aria-label="Close menu" onClick={() => setMenuOpen(false)}>✕</button></div>
        <ul className="menu-links">
          {[['home', 'nav_home', 'HOME'], ['members', 'nav_members', 'MEMBERS'], ['discography', 'nav_discography', 'DISCOGRAPHY'], ['media', 'nav_media', 'MEDIA'], ['merch', 'nav_merch', 'MERCH'], ['partners', 'nav_partners', 'PARTNERS'], ['about', 'nav_about', 'ABOUT']].map(([id, k, label]) => (
            <li key={id} onClick={() => scrollTo(id)}>{copyVal(copy, k, label)}</li>
          ))}
          <li onClick={() => scrollTo('private')}>{copyVal(copy, 'nav_private', 'PRIVATE CONTENT')} <span className="lock">⬡</span></li>
        </ul>
        <div className="menu-foot">
          <span className="t-node">NODE</span> <span className="t-x">X</span> <span className="t-gen">GENERATION</span> &nbsp;·&nbsp;
          <button className="replay" onClick={() => { setMenuOpen(false); runBoot(); }}>↺ {copyVal(copy, 'menu_replay', 'replay intro')}</button>
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
          <div className="topbar"><span className="status"><i className="dot" /> {copyVal(copy, 'gate_signal', 'SIGNAL ACTIVE')}</span><span className="est">EST · MMXXVI</span></div>
          <div className="hero-gate">
            <div className="emblem-tilt" ref={tiltRef}><img className="emblem" src={logo} alt="NXG" draggable="false" /></div>
            <div className="tagline"><span className="t-node">NODE</span> <span className="t-x">X</span> <span className="t-gen">GENERATION</span></div>
            <div className="langs">
              {LANGS.map(([code, label]) => (
                <button key={code} className={'lang' + (activeLang === code ? ' on' : '')} onClick={() => pickLang(code)}>{label}</button>
              ))}
            </div>
            <button className="enter" onClick={enter}>{copyVal(copy, 'cta_enter', 'ENTER')}<span className="ar">→</span></button>
          </div>
        </section>
      )}

      {/* ===== PLAYER (real Spotify, plays count) ===== */}
      <SpotifyPlayer tracks={pub(data && data.tracks)} show={entered} logo={logo} nowLabel={copyVal(copy, 'player_now', 'NOW PLAYING')} />
      <MemberBio m={bioMember} onClose={() => setBioMember(null)} copy={copy} />
      <AlbumView album={openAlbum} tracks={tracks} onClose={() => setOpenAlbum(null)} copy={copy} />
      {photo && (
        <div className="photo-ov" onClick={() => setPhoto(null)}>
          <button className="photo-x" onClick={() => setPhoto(null)} aria-label="Close">✕</button>
          <img src={photo} alt="" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
