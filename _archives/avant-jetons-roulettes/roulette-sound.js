/* Groupe Tranchant — moteur sonore de la roulette.
   Synthèse procédurale Web Audio uniquement (aucun fichier, aucune bibliothèque).
   Interface figée : enabled, enable(), disable(), roll(v), hit(intensity, kind), stop().
   Option de test : createRouletteSound({ context }) pour rendre dans un OfflineAudioContext. */

const MAX_VOICES = 12;          // polyphonie des impacts (vol de la voix la plus ancienne)
const OUT_TRIM = 0.21;          // niveau après compresseur (calibré : crête ≈ -18 dBFS)
const ROLL_GAIN = 0.2;         // niveau du roulement à v = 1
const RATTLE_GAIN = 0.075;       // niveau de la vibration contre la bande
const SMOOTH = 0.06;            // constante de temps du lissage de v (s)

const clamp01 = (x) => (x > 1 ? 1 : x > 0 ? x : 0);
const rand = (a, b) => a + Math.random() * (b - a);

function makeNoise(c, seconds) {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  // raccord de boucle sans clic : fondu croisé des 10 dernières ms vers le début
  const x = Math.floor(c.sampleRate * 0.01);
  for (let i = 0; i < x; i++) {
    const k = i / x;
    d[len - x + i] = d[len - x + i] * (1 - k) + d[i] * k;
  }
  return buf;
}

// Réponse impulsionnelle de petit salon feutré : bruit décroissant ~0,6 s, de plus en plus sombre.
function makeImpulse(c, seconds) {
  const sr = c.sampleRate;
  const len = Math.floor(sr * seconds);
  const pre = Math.floor(sr * 0.007);
  const buf = c.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = pre; i < len; i++) {
      const t = (i - pre) / sr;
      const u = t / seconds;
      const env = Math.exp(-6.9 * u) * Math.min(1, t / 0.002) * (1 - u * u * u);
      const k = 0.55 - 0.47 * u; // absorption des aigus (tentures, moquette)
      lp += k * ((Math.random() * 2 - 1) - lp);
      d[i] = lp * env;
    }
  }
  return buf;
}

function hold(param, t) {
  if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(t);
  else { param.cancelScheduledValues(t); param.setValueAtTime(param.value, t); }
}

export function createRouletteSound(options = {}) {
  const external = options && options.context ? options.context : null;
  let ctx = null;
  let g = null;           // graphe audio, construit au premier enable()
  let on = false;
  let offTimer = 0;
  const voices = [];

  const isOffline = (c) => typeof c.startRendering === 'function';

  function build(c) {
    const out = c.createGain(); out.gain.value = 0;          // fondu marche/arrêt
    const trim = c.createGain(); trim.gain.value = OUT_TRIM;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -24; comp.knee.value = 12; comp.ratio.value = 2.5;
    comp.attack.value = 0.004; comp.release.value = 0.18;
    const soft = c.createBiquadFilter();                      // salon feutré : aigus adoucis
    soft.type = 'highshelf'; soft.frequency.value = 7500; soft.gain.value = -4;
    const bus = c.createGain();
    bus.connect(soft); soft.connect(comp); comp.connect(trim); trim.connect(out); out.connect(c.destination);

    const send = c.createGain(); send.gain.value = 1;
    const verb = c.createConvolver(); verb.buffer = makeImpulse(c, 0.6);
    const wet = c.createGain(); wet.gain.value = 0.5;
    send.connect(verb); verb.connect(wet); wet.connect(soft);

    const noise = makeNoise(c, 2.7);

    // --- Roulement : grondement boisé (bande basse) + « chant » de la bille (bande médium)
    // Deux lectures décorrélées du même bruit. Débit légèrement ≠ 1 : contourne un défaut de Chrome
    // où un filtre alimenté par une source bouclée à débit exact 1 peut se taire au rebouclage.
    const srcA = c.createBufferSource(); srcA.buffer = noise; srcA.loop = true; srcA.playbackRate.value = 0.9973;
    const srcB = c.createBufferSource(); srcB.buffer = noise; srcB.loop = true; srcB.playbackRate.value = 1.0061;
    const lowBP = c.createBiquadFilter(); lowBP.type = 'bandpass'; lowBP.frequency.value = 130; lowBP.Q.value = 0.9;
    const lowG = c.createGain(); lowG.gain.value = 1.6;
    const midBP = c.createBiquadFilter(); midBP.type = 'bandpass'; midBP.frequency.value = 500; midBP.Q.value = 2.2;
    const midG = c.createGain(); midG.gain.value = 0.45;
    const dull = c.createBiquadFilter(); dull.type = 'lowpass'; dull.frequency.value = 1800; dull.Q.value = 0.5;
    const am = c.createGain(); am.gain.value = 1;
    const lfo = c.createOscillator(); lfo.frequency.value = 6;
    const lfoDepth = c.createGain(); lfoDepth.gain.value = 0;
    const rollLevel = c.createGain(); rollLevel.gain.value = 0;
    srcA.connect(lowBP); lowBP.connect(lowG); lowG.connect(dull);
    srcB.connect(midBP); midBP.connect(midG); midG.connect(dull);
    dull.connect(am); lfo.connect(lfoDepth); lfoDepth.connect(am.gain);
    am.connect(rollLevel); rollLevel.connect(bus);
    const rollSend = c.createGain(); rollSend.gain.value = 0.12; rollLevel.connect(rollSend); rollSend.connect(send);

    // --- Vibration contre la bande : bruit médium haché par deux LFO irréguliers
    const ratBP = c.createBiquadFilter(); ratBP.type = 'bandpass'; ratBP.frequency.value = 1500; ratBP.Q.value = 1.3;
    const ratAM = c.createGain(); ratAM.gain.value = 0.5;
    const r1 = c.createOscillator(); r1.type = 'sawtooth'; r1.frequency.value = 29;
    const r2 = c.createOscillator(); r2.type = 'square'; r2.frequency.value = 43.7;
    const rSmooth = c.createBiquadFilter(); rSmooth.type = 'lowpass'; rSmooth.frequency.value = 160;
    const rDepth = c.createGain(); rDepth.gain.value = 0.28;
    const ratLevel = c.createGain(); ratLevel.gain.value = 0;
    r1.connect(rSmooth); r2.connect(rSmooth); rSmooth.connect(rDepth); rDepth.connect(ratAM.gain);
    srcA.connect(ratBP); ratBP.connect(ratAM); ratAM.connect(ratLevel); ratLevel.connect(bus);

    const t0 = c.currentTime;
    srcA.start(t0); srcB.start(t0, 1.31); lfo.start(t0); r1.start(t0); r2.start(t0);

    return { out, bus, send, lowBP, midBP, lfo, lfoDepth, rollLevel, ratLevel, r1, r2,
      keep: [srcA, srcB, lowG, midG, dull, am, ratBP, ratAM, rSmooth, rDepth, verb, wet, comp, trim, soft, rollSend],
      lastV: -1, lastSet: -1, lastRollT: -1, rattle: 0, lastFret: -1 };
  }

  // ---------- Voix d'impact ----------
  function prune(t) {
    for (let i = voices.length - 1; i >= 0; i--) if (voices[i].end <= t) voices.splice(i, 1);
  }

  function newVoice(t, life, pan, wet) {
    prune(t);
    while (voices.length >= MAX_VOICES) {
      const old = voices.shift();               // vol de la plus ancienne, fondu de 8 ms
      old.steal.gain.setValueAtTime(1, t);
      old.steal.gain.linearRampToValueAtTime(0, t + 0.008);
    }
    const steal = ctx.createGain(); steal.gain.value = 1;
    let tail = steal;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner(); p.pan.value = pan; steal.connect(p); tail = p;
    }
    tail.connect(g.bus);
    const s = ctx.createGain(); s.gain.value = wet; tail.connect(s); s.connect(g.send);
    const v = { steal, end: t + life, nodes: [steal, tail, s], pending: 0 };
    voices.push(v);
    return v;
  }

  function track(v, src, nodes) {
    v.pending++;
    for (const n of nodes) v.nodes.push(n);
    src.onended = () => {
      if (--v.pending === 0) for (const n of v.nodes) { try { n.disconnect(); } catch (e) { /* déjà déconnecté */ } }
    };
  }

  function env(gain, t, amp, att, tau) {
    gain.setValueAtTime(0, t);
    gain.linearRampToValueAtTime(amp, t + att);
    gain.setTargetAtTime(0, t + att, tau);
    return t + att + tau * 9;
  }

  // Partiel sinusoïdal amorti (glissement de hauteur optionnel)
  function partial(v, t, f, amp, tau, fEnd) {
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(f, t);
    if (fEnd) o.frequency.exponentialRampToValueAtTime(fEnd, t + tau * 2.5);
    const e = ctx.createGain();
    const end = env(e.gain, t, amp, 0.0006, tau);
    o.connect(e); e.connect(v.steal);
    o.start(t); o.stop(end);
    track(v, o, [o, e]);
  }

  // Salve de bruit filtrée
  function burst(v, t, type, f, Q, amp, att, tau) {
    const b = ctx.createBufferSource(); b.buffer = g.noiseShort;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = Q;
    const e = ctx.createGain();
    const end = env(e.gain, t, amp, att, tau);
    b.connect(fl); fl.connect(e); e.connect(v.steal);
    b.start(t, Math.random() * 0.4, end - t + 0.01);
    track(v, b, [b, fl, e]);
  }

  function fret(t, i) {
    const k = 1 + rand(-0.08, 0.08);            // hauteur ±8 %
    let a = Math.pow(i, 1.1) * rand(0.85, 1.12);
    if (g.lastFret >= 0 && t - g.lastFret < 0.045) a *= 0.72; // coups trop rapprochés : la bille n'a pas d'élan
    g.lastFret = t;
    const v = newVoice(t, 0.2, rand(-0.3, 0.3), 0.22);
    const bright = rand(0.85, 1.15);             // timbre variable
    burst(v, t, 'bandpass', 4300 * k * bright, 1.4, 1.15 * a, 0.0004, 0.0035);
    burst(v, t, 'bandpass', 1650 * k, 3, 0.45 * a, 0.0004, 0.005);
    partial(v, t, 3300 * k, 0.16 * a, 0.008);
    partial(v, t, 3300 * k * rand(1.52, 1.64), 0.09 * a, 0.005);
    // creux du cylindre en bois
    partial(v, t, 420 * k * rand(0.95, 1.05), 0.09 * a, 0.015);
    burst(v, t, 'bandpass', 520 * k, 6, 0.22 * a, 0.0008, 0.016);
    // petit rebond sur la cloison
    if (Math.random() < 0.35 && a > 0.15) {
      const t2 = t + rand(0.009, 0.022), a2 = a * rand(0.18, 0.32);
      burst(v, t2, 'bandpass', 4600 * k, 1.4, a2, 0.0004, 0.0028);
      partial(v, t2, 3400 * k, 0.12 * a2, 0.006);
    }
  }

  function diamond(t, i) {
    const a = Math.pow(i, 1.05) * rand(0.9, 1.08);
    const v = newVoice(t, 0.32, rand(-0.15, 0.15), 0.32);
    const f0 = rand(2100, 2400);
    const ratios = [1, 1.41, 1.87, 2.44];
    const amps = [1, 0.7, 0.5, 0.32];
    const taus = [0.028, 0.022, 0.017, 0.013]; // -26 dB entre ~85 et ~40 ms
    for (let n = 0; n < 4; n++) {
      partial(v, t, Math.min(6000, f0 * ratios[n] * rand(0.985, 1.015)), 0.2 * amps[n] * a, taus[n] * rand(0.9, 1.1));
    }
    burst(v, t, 'highpass', 2600, 0.7, 0.85 * a, 0.0003, 0.0028);  // transitoire
    burst(v, t, 'bandpass', 900, 1.5, 0.35 * a, 0.0005, 0.007);    // la bille elle-même
  }

  function pocket(t, i, depth) {
    const k = 1 + rand(-0.06, 0.06);
    const a = Math.pow(i, 1.1) * rand(0.9, 1.05);
    const v = newVoice(t, 0.35, rand(-0.12, 0.12), 0.18);
    partial(v, t, 230 * k, 0.6 * a, 0.026, 145 * k);                // coup mat du fond
    burst(v, t, 'lowpass', 1200 * k, 0.7, 0.7 * a, 0.0012, 0.016);
    burst(v, t, 'bandpass', 2300 * k, 1.2, 0.2 * a, 0.0005, 0.003); // léger contact
    if (!depth && i > 0.25) {                                       // la bille se pose
      const b1 = t + rand(0.07, 0.09), b2 = b1 + rand(0.05, 0.07);
      pocketSmall(v, b1, a * 0.32, k);
      pocketSmall(v, b2, a * 0.12, k);
      v.end = b2 + 0.15;
    }
  }
  function pocketSmall(v, t, a, k) {
    partial(v, t, 260 * k, 0.5 * a, 0.018, 180 * k);
    burst(v, t, 'lowpass', 1100 * k, 0.7, 0.7 * a, 0.001, 0.01);
  }

  function rim(t, i) {
    const k = 1 + rand(-0.07, 0.07);
    const a = Math.pow(i, 1.1) * rand(0.85, 1.1);
    const v = newVoice(t, 0.25, rand(-0.25, 0.25), 0.2);
    burst(v, t, 'bandpass', 1100 * k, 1.1, 0.6 * a, 0.0006, 0.011);  // choc contre la bande
    partial(v, t, 260 * k, 0.28 * a, 0.02);                          // bois de la cuvette
    burst(v, t, 'bandpass', 2500 * k, 0.8, 0.16 * a, 0.006, 0.03);   // frottement
  }

  const api = {
    get enabled() { return on; },

    enable() {
      if (on) return;
      try {
        if (!ctx) {
          const AC = external ? null : (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext));
          ctx = external || (AC ? new AC({ latencyHint: 'interactive' }) : null);
          if (!ctx) return;
        }
        if (!g) { g = build(ctx); g.noiseShort = makeNoise(ctx, 0.6); }
        if (!isOffline(ctx) && ctx.state !== 'running') ctx.resume().catch(() => {});
      } catch (e) { return; }
      clearTimeout(offTimer);
      on = true;
      const t = ctx.currentTime;
      hold(g.out.gain, t); g.out.gain.setTargetAtTime(1, t, 0.03);
    },

    disable() {
      if (!on) return;
      on = false;
      const t = ctx.currentTime;
      hold(g.out.gain, t); g.out.gain.setTargetAtTime(0, t, 0.025);
      api_stopRoll(t);
      if (!isOffline(ctx)) {
        clearTimeout(offTimer);
        offTimer = setTimeout(() => { if (!on && ctx.state === 'running') ctx.suspend().catch(() => {}); }, 300);
      }
    },

    roll(v) {
      if (!on) return;
      v = clamp01(+v || 0);
      const t = ctx.currentTime;
      const dt = g.lastRollT < 0 ? 0 : Math.min(0.1, Math.max(0, t - g.lastRollT));
      g.lastRollT = t;
      // vibration de la bille contre la bande, juste avant la chute (v faible mais non nul)
      const r = v < 0.01 ? 0 : clamp01((0.36 - v) / 0.18) * clamp01((v - 0.01) / 0.05);
      if (r > 0.25 && Math.random() < 7 * r * dt) rim(t + rand(0, 0.01), rand(0.06, 0.14) * r);
      if (Math.abs(v - g.lastV) < 0.004 && Math.abs(r - g.rattle) < 0.01 && t - g.lastSet < 0.3) return;
      g.lastV = v; g.rattle = r; g.lastSet = t;
      const s = SMOOTH;
      g.rollLevel.gain.setTargetAtTime(ROLL_GAIN * Math.pow(v, 0.6), t, s);
      g.lowBP.frequency.setTargetAtTime(105 + 190 * v, t, s);
      g.midBP.frequency.setTargetAtTime(360 + 950 * v, t, s);
      g.lfo.frequency.setTargetAtTime(3.5 + 15 * v, t, s);        // la bille « chante »
      g.lfoDepth.gain.setTargetAtTime(0.1 + 0.22 * v, t, s);
      g.ratLevel.gain.setTargetAtTime(RATTLE_GAIN * r, t, s);
      g.r1.frequency.setTargetAtTime(22 + 30 * v, t, s);
      g.r2.frequency.setTargetAtTime(37 + 25 * v, t, s);
    },

    hit(intensity, kind) {
      if (!on) return;
      const i = clamp01(+intensity || 0);
      if (i < 0.005) return;
      const t = ctx.currentTime + rand(0, 0.003);
      if (kind === 'diamond') diamond(t, i);
      else if (kind === 'fret') fret(t, i);
      else if (kind === 'pocket') pocket(t, i);
      else rim(t, i);
    },

    stop() {
      if (!on) return;
      api_stopRoll(ctx.currentTime);
    },
  };

  function api_stopRoll(t) {
    g.rollLevel.gain.setTargetAtTime(0, t, 0.05);
    g.ratLevel.gain.setTargetAtTime(0, t, 0.05);
    g.lastV = 0; g.rattle = 0; g.lastSet = t;
  }

  return api;
}
