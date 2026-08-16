/**
 * themeMusic.js — Synthesized magical ambient BGM for SuperXO themes.
 *
 * Generates an ORIGINAL atmospheric piece using Web Audio API.
 * No copyrighted material — all melodies, harmonies and patterns
 * are original compositions created programmatically.
 *
 * Hogwarts edition: celesta bells + harp arpeggios + string pads +
 * sparkle overtones + gentle mystery melody.
 * Designed to feel magical, warm and immersive on mobile.
 */

let _ctx = null;
let _masterGain = null;
let _reverbNode = null;
let _enabled = true;
let _currentTheme = null;
let _loopTimer = null;
let _scheduledNodes = [];

// ── Audio context ─────────────────────────────────────
function getCtx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

function getMaster() {
  const ctx = getCtx();
  if (!_masterGain) {
    _masterGain = ctx.createGain();
    _masterGain.gain.value = 0;
    _masterGain.connect(ctx.destination);
  }
  return _masterGain;
}

// ── Simple convolution reverb (IR approximated with noise) ───
function createReverb(ctx, duration = 2.2, decay = 2.0) {
  const sr   = ctx.sampleRate;
  const len  = Math.floor(sr * duration);
  const buf  = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  const conv = ctx.createConvolver();
  conv.buffer = buf;
  return conv;
}

function getRouting() {
  const ctx  = getCtx();
  const mst  = getMaster();

  // Reverb wet channel
  if (!_reverbNode) _reverbNode = createReverb(ctx);
  const wetGain = ctx.createGain();
  wetGain.gain.value = 0.38;
  _reverbNode.connect(wetGain);
  wetGain.connect(mst);

  // Dry channel
  const dryGain = ctx.createGain();
  dryGain.gain.value = 0.72;
  dryGain.connect(mst);

  // Input node (connect sources here)
  const input = ctx.createGain();
  input.gain.value = 1;
  input.connect(_reverbNode);
  input.connect(dryGain);

  return input;
}

// ── Note table ────────────────────────────────────────
const N = {
  B2:123.47, C3:130.81, D3:146.83, E3:164.81, F3:174.61, G3:196.00, A3:220.00, B3:246.94,
  C4:261.63, D4:293.66, E4:329.63, F4:349.23, G4:392.00, A4:440.00, B4:493.88,
  C5:523.25, D5:587.33, E5:659.25, F5:698.46, G5:783.99, A5:880.00, B5:987.77,
  C6:1046.5, D6:1174.7, E6:1318.5,
  Bb3:233.08, Eb4:311.13, Ab4:415.30, Bb4:466.16, Eb5:622.25, Ab5:830.61,
  Fs4:369.99, Cs5:554.37, Gs4:415.30, Fs5:739.99,
};

// ── Synthesis helpers ─────────────────────────────────

function track(osc) {
  _scheduledNodes.push(osc);
  osc.onended = () => {
    const i = _scheduledNodes.indexOf(osc);
    if (i !== -1) _scheduledNodes.splice(i, 1);
  };
}

/** Celesta-style bell: bright shimmer, long decay */
function bell(freq, t, dur, vol, dest) {
  const ctx = getCtx();
  const osc  = ctx.createOscillator();
  const osc2 = ctx.createOscillator(); // partials for brightness
  const gain = ctx.createGain();

  osc.type  = 'sine';  osc.frequency.value  = freq;
  osc2.type = 'sine';  osc2.frequency.value = freq * 2.756; // metallic partial

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.004);
  gain.gain.exponentialRampToValueAtTime(vol * 0.35, t + dur * 0.25);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  const gain2 = ctx.createGain();
  gain2.gain.setValueAtTime(0, t);
  gain2.gain.linearRampToValueAtTime(vol * 0.18, t + 0.004);
  gain2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.3);

  osc.connect(gain);   gain.connect(dest);
  osc2.connect(gain2); gain2.connect(dest);

  osc.start(t);  osc.stop(t + dur + 0.1);
  osc2.start(t); osc2.stop(t + dur * 0.35);
  track(osc); track(osc2);
}

/** Harp pluck: warm sine + gentle attack */
function harp(freq, t, dur, vol, dest) {
  const ctx  = getCtx();
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.value = freq;

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.006);
  gain.gain.exponentialRampToValueAtTime(vol * 0.4, t + dur * 0.3);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  osc.connect(gain); gain.connect(dest);
  osc.start(t); osc.stop(t + dur + 0.05);
  track(osc);
}

/** Soft string pad: slow attack, sustained, gentle filter */
function pad(freq, t, dur, vol, dest) {
  const ctx    = getCtx();
  const osc    = ctx.createOscillator();
  const filt   = ctx.createBiquadFilter();
  const gain   = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.value = freq;

  filt.type            = 'lowpass';
  filt.frequency.value = 700;
  filt.Q.value         = 0.6;

  const att = 1.0, rel = 1.4;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + att);
  gain.gain.setValueAtTime(vol, t + dur - rel);
  gain.gain.linearRampToValueAtTime(0, t + dur);

  osc.connect(filt); filt.connect(gain); gain.connect(dest);
  osc.start(t); osc.stop(t + dur + 0.1);
  track(osc);
}

/** Sparkle: very high short glint — wand-tip effect */
function sparkle(freq, t, dest) {
  const ctx  = getCtx();
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(0.09, t + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  osc.connect(gain); gain.connect(dest);
  osc.start(t); osc.stop(t + 0.22);
  track(osc);
}

// ══════════════════════════════════════════════════════
// ORIGINAL MAGICAL COMPOSITION — "Enchanted Corridors"
//
// Key: D minor / F major — ancient, mystical feel
// Structure: 32 bars at ~70 BPM ≈ 27.4 seconds per loop
//
// Section A (0–8s)   — Opening harp cascade + melody enters
// Section B (8–16s)  — Rising sequence + chord expansion
// Section C (16–24s) — Climax, full texture + sparkles
// Section D (24–27s) — Resolution, breath before loop
// ══════════════════════════════════════════════════════

const LOOP = 27.5; // seconds

function scheduleLoop(t0) {
  const dest = getRouting();

  // ═══ SECTION A: "The Torchlit Corridor" (t=0–8s) ════
  // Harp: slow ascending Dm arpeggio
  const arpA = [N.D3,N.F3,N.A3,N.D4,N.F4,N.A4,N.D5,N.F5,N.A5,N.D5,N.A4,N.F4];
  arpA.forEach((f,i) => harp(f, t0 + i*0.55, 2.2, 0.13, dest));

  // Bell melody — gentle entry
  [
    [N.F5, 0.0, 1.4, 0.18],
    [N.E5, 1.4, 0.9, 0.15],
    [N.D5, 2.3, 1.1, 0.16],
    [N.C5, 3.4, 0.7, 0.14],
    [N.D5, 4.1, 1.6, 0.20],
    [N.F5, 5.7, 0.8, 0.16],
    [N.G5, 6.5, 1.2, 0.18],
  ].forEach(([f,ti,d,v]) => bell(f, t0+ti, d, v, dest));

  // Pad: Dm (very soft foundation)
  pad(N.D3, t0+0,   8, 0.06, dest);
  pad(N.F3, t0+0,   8, 0.05, dest);
  pad(N.A3, t0+0,   8, 0.04, dest);

  // Sparkles — scattered wand glints
  [1.2, 3.8, 5.1, 7.4].forEach(ti =>
    sparkle(N.D6 * (1 + Math.random()*0.15), t0+ti, dest)
  );

  // ═══ SECTION B: "The Grand Staircase" (t=8–16s) ════
  // Harp: Bb major → F major movement
  const arpB = [N.Bb3,N.D4,N.F4,N.Bb4,N.D5,N.F5,N.Bb5,N.F5,N.D5,N.Bb4,N.F4,N.D4];
  arpB.forEach((f,i) => harp(f, t0+8 + i*0.52, 2.0, 0.12, dest));

  // Bell melody — more movement, tension building
  [
    [N.A5,  8.0, 1.1, 0.20],
    [N.G5,  9.1, 0.7, 0.16],
    [N.F5,  9.8, 0.9, 0.17],
    [N.Eb5, 10.7,0.8, 0.18],
    [N.F5,  11.5,1.2, 0.19],
    [N.G5,  12.7,0.8, 0.17],
    [N.A5,  13.5,0.7, 0.16],
    [N.Bb5, 14.2,1.1, 0.22],
  ].forEach(([f,ti,d,v]) => bell(f, t0+ti, d, v, dest));

  // Counter-bell line (lower voice)
  [
    [N.D5,  8.6, 1.0, 0.12],
    [N.C5,  9.6, 0.8, 0.11],
    [N.Bb4, 10.4,0.9, 0.12],
    [N.A4,  11.3,0.7, 0.10],
    [N.Bb4, 12.0,1.0, 0.12],
    [N.D5,  13.0,1.5, 0.13],
  ].forEach(([f,ti,d,v]) => bell(f, t0+ti, d, v, dest));

  // Pads: Bb maj → F maj
  pad(N.Bb3, t0+8,  4, 0.065, dest);
  pad(N.D4,  t0+8,  4, 0.055, dest);
  pad(N.F4,  t0+8,  4, 0.045, dest);
  pad(N.F3,  t0+12, 4, 0.065, dest);
  pad(N.A3,  t0+12, 4, 0.055, dest);
  pad(N.C4,  t0+12, 4, 0.045, dest);

  sparkle(N.E6, t0+8.8,  dest);
  sparkle(N.D6, t0+11.2, dest);
  sparkle(N.E6, t0+14.8, dest);

  // ═══ SECTION C: "The Great Hall" (t=16–24s) ════
  // Harp: full spread glissando feel (Am / C)
  const arpC1 = [N.A3,N.C4,N.E4,N.A4,N.C5,N.E5,N.A5,N.C5,N.E4,N.C4];
  arpC1.forEach((f,i) => harp(f, t0+16 + i*0.48, 2.2, 0.14, dest));

  const arpC2 = [N.C4,N.E4,N.G4,N.C5,N.E5,N.G5,N.C5,N.G4];
  arpC2.forEach((f,i) => harp(f, t0+21 + i*0.50, 2.0, 0.12, dest));

  // Bell melody — emotional peak
  [
    [N.C6,  16.0, 1.5, 0.24],
    [N.B5,  17.5, 0.8, 0.18],
    [N.A5,  18.3, 0.9, 0.20],
    [N.G5,  19.2, 1.0, 0.17],
    [N.A5,  20.2, 0.7, 0.18],
    [N.B5,  20.9, 0.8, 0.19],
    [N.C6,  21.7, 1.2, 0.22],
    [N.D6,  22.9, 0.8, 0.20],
    [N.C6,  23.7, 0.6, 0.17],
  ].forEach(([f,ti,d,v]) => bell(f, t0+ti, d, v, dest));

  // Harmony bells
  [
    [N.E5,  16.0, 1.3, 0.13],
    [N.F5,  17.5, 1.0, 0.12],
    [N.E5,  18.5, 0.8, 0.12],
    [N.D5,  19.3, 1.2, 0.13],
    [N.E5,  21.7, 1.0, 0.13],
    [N.F5,  22.9, 1.4, 0.14],
  ].forEach(([f,ti,d,v]) => bell(f, t0+ti, d, v, dest));

  // Pads: Am → C major
  pad(N.A3, t0+16, 4.5, 0.07, dest);
  pad(N.C4, t0+16, 4.5, 0.06, dest);
  pad(N.E4, t0+16, 4.5, 0.05, dest);
  pad(N.C3, t0+21, 3.5, 0.07, dest);
  pad(N.E3, t0+21, 3.5, 0.06, dest);
  pad(N.G3, t0+21, 3.5, 0.05, dest);

  // Sparkle burst at climax
  [16.4,17.2,18.8,19.6,21.0,22.4,23.2,24.0].forEach((ti, i) =>
    sparkle(N.D6 + (i % 3) * 80, t0+ti, dest)
  );

  // ═══ SECTION D: Resolution breath (t=24–27.5s) ════
  // Final Dm chord with long decay — prepares loop crossfade
  [
    [N.D5,  24.0, 3.2, 0.18],
    [N.F5,  24.3, 3.0, 0.15],
    [N.A5,  24.6, 2.8, 0.14],
    [N.D6,  24.9, 2.6, 0.12],
  ].forEach(([f,ti,d,v]) => bell(f, t0+ti, d, v, dest));

  harp(N.D4, t0+24.0, 3.0, 0.12, dest);
  harp(N.F4, t0+24.3, 2.8, 0.11, dest);
  harp(N.A4, t0+24.6, 2.6, 0.10, dest);

  pad(N.D3, t0+24.0, 3.5, 0.07, dest);
  pad(N.F3, t0+24.0, 3.5, 0.06, dest);
  pad(N.A3, t0+24.0, 3.5, 0.05, dest);

  sparkle(N.D6, t0+24.5, dest);
  sparkle(N.A5, t0+26.0, dest);
}

// ── Loop management ───────────────────────────────────
function startLoop() {
  if (!_enabled || !_ctx) return;
  const ctx = getCtx();
  scheduleLoop(ctx.currentTime);
  // Schedule next loop to start just before this one ends (smooth crossfade)
  _loopTimer = setTimeout(startLoop, (LOOP - 0.8) * 1000);
}

function fadeOutAndStop(onDone) {
  clearTimeout(_loopTimer);
  _loopTimer = null;
  if (!_masterGain) { onDone?.(); return; }
  const ctx = getCtx();
  const g   = _masterGain;
  g.gain.cancelScheduledValues(ctx.currentTime);
  g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
  g.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
  setTimeout(() => {
    _scheduledNodes.forEach(n => { try { n.stop(); } catch (_) {} });
    _scheduledNodes = [];
    if (_masterGain === g) {
      try { g.disconnect(); } catch (_) {}
      _masterGain = null;
    }
    onDone?.();
  }, 1600);
}

// ── Public API ────────────────────────────────────────

/**
 * Start theme-specific music if the theme supports it.
 * @param {string} themeId
 */
function playForTheme(themeId) {
  // Stop any current theme music
  if (_currentTheme !== null) {
    fadeOutAndStop(() => {
      if (themeId === 'hogwarts' && _enabled) _startHogwarts();
    });
    _currentTheme = null;
    return;
  }
  if (themeId === 'hogwarts' && _enabled) _startHogwarts();
}

function _startHogwarts() {
  setTimeout(() => {
    if (!_enabled) return;
    try {
      const ctx = getCtx();
      // Ensure old gain is disconnected
      if (_masterGain) { try { _masterGain.disconnect(); } catch (_) {} }
      _masterGain = ctx.createGain();
      _masterGain.gain.setValueAtTime(0, ctx.currentTime);
      _masterGain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 3.0);
      _masterGain.connect(ctx.destination);
      _reverbNode = null; // regenerate for fresh session
      _currentTheme = 'hogwarts';
      startLoop();
    } catch (e) {
      console.warn('[ThemeMusic] Could not start:', e);
    }
  }, 350);
}

/** Stop theme music with fade. */
function stop() {
  if (_currentTheme === null) return;
  _currentTheme = null;
  fadeOutAndStop();
}

/** 0–1 volume multiplier */
function setVolume(vol) {
  if (_masterGain) {
    const ctx = getCtx();
    _masterGain.gain.cancelScheduledValues(ctx.currentTime);
    _masterGain.gain.setValueAtTime(
      Math.max(0, Math.min(1, vol)) * 0.22,
      ctx.currentTime
    );
  }
}

/** Called when Music setting toggle changes. */
function setEnabled(bool) {
  _enabled = bool;
  if (!bool) stop();
  else if (_currentTheme) {/* already playing */}
}

function isPlaying() { return _currentTheme !== null; }

export const ThemeMusic = { playForTheme, stop, setVolume, setEnabled, isPlaying };
