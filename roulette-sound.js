/* Groupe Tranchant — moteur sonore des jetons (carte des destinations de l'accueil).
   Claquements de jetons de table en céramique, synthèse procédurale Web Audio uniquement (aucun fichier, aucune bibliothèque).
   Interface : enabled, enable(), disable(), clack(intensité, sorte), stop().
   Sortes : 'land' (jeton posé sur la pile), 'drop' (jeton qui retombe à sa place), 'tick' (jeton effleuré), 'lift' (jeton soulevé).
   Option de test : createChipSound({ context }) pour rendre dans un OfflineAudioContext.
   (Nom de fichier conservé pour ne pas toucher à la construction du site ; createRouletteSound reste un alias.) */

const MAX_VOICES = 14;          // polyphonie (vol de la voix la plus ancienne)
const OUT_TRIM = 0.24;          // niveau après compresseur
const clamp01 = x => (x > 1 ? 1 : x > 0 ? x : 0);
const rand = (a, b) => a + Math.random() * (b - a);

function makeNoise(c, seconds) {
  const len = Math.floor(c.sampleRate * seconds), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}
// petite pièce feutrée : queue courte et sombre
function makeImpulse(c, seconds) {
  const sr = c.sampleRate, len = Math.floor(sr * seconds), pre = Math.floor(sr * 0.006), buf = c.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch); let lp = 0;
    for (let i = pre; i < len; i++) {
      const t = (i - pre) / sr, u = t / seconds, env = Math.exp(-7.5 * u) * Math.min(1, t / 0.002) * (1 - u * u * u), k = 0.6 - 0.5 * u;
      lp += k * ((Math.random() * 2 - 1) - lp); d[i] = lp * env;
    }
  }
  return buf;
}
function hold(param, t) {
  if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(t);
  else { param.cancelScheduledValues(t); param.setValueAtTime(param.value, t); }
}

export function createChipSound(options = {}) {
  const external = options && options.context ? options.context : null;
  let ctx = null, g = null, on = false, offTimer = 0;
  const voices = [];
  const isOffline = c => typeof c.startRendering === 'function';

  function build(c) {
    const out = c.createGain(); out.gain.value = 0;
    const trim = c.createGain(); trim.gain.value = OUT_TRIM;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -22; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.002; comp.release.value = 0.15;
    const soft = c.createBiquadFilter(); soft.type = 'highshelf'; soft.frequency.value = 8000; soft.gain.value = -5;
    const bus = c.createGain();
    bus.connect(soft); soft.connect(comp); comp.connect(trim); trim.connect(out); out.connect(c.destination);
    const send = c.createGain(), verb = c.createConvolver(), wet = c.createGain();
    verb.buffer = makeImpulse(c, 0.45); wet.gain.value = 0.35;
    send.connect(verb); verb.connect(wet); wet.connect(soft);
    return { out, bus, send, noise: makeNoise(c, 0.5), keep: [trim, comp, soft, verb, wet], lastT: -1 };
  }

  function prune(t) { for (let i = voices.length - 1; i >= 0; i--) if (voices[i].end <= t) voices.splice(i, 1); }
  function newVoice(t, life, pan, wetAmt) {
    prune(t);
    while (voices.length >= MAX_VOICES) { const old = voices.shift(); old.steal.gain.setValueAtTime(1, t); old.steal.gain.linearRampToValueAtTime(0, t + 0.006); }
    const steal = ctx.createGain(); let tail = steal;
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; steal.connect(p); tail = p; }
    tail.connect(g.bus);
    const s = ctx.createGain(); s.gain.value = wetAmt; tail.connect(s); s.connect(g.send);
    const v = { steal, end: t + life, nodes: [steal, tail, s], pending: 0 };
    voices.push(v); return v;
  }
  function track(v, src, nodes) {
    v.pending++; for (const n of nodes) v.nodes.push(n);
    src.onended = () => { if (--v.pending === 0) for (const n of v.nodes) { try { n.disconnect(); } catch (e) { /* déjà fait */ } } };
  }
  function env(gain, t, amp, att, tau) { gain.setValueAtTime(0, t); gain.linearRampToValueAtTime(amp, t + att); gain.setTargetAtTime(0, t + att, tau); return t + att + tau * 9; }
  function partial(v, t, f, amp, tau) {
    const o = ctx.createOscillator(), e = ctx.createGain(); o.frequency.value = f;
    const end = env(e.gain, t, amp, 0.0004, tau); o.connect(e); e.connect(v.steal); o.start(t); o.stop(end); track(v, o, [o, e]);
  }
  function burst(v, t, type, f, Q, amp, att, tau) {
    const b = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), e = ctx.createGain();
    b.buffer = g.noise; fl.type = type; fl.frequency.value = f; fl.Q.value = Q;
    const end = env(e.gain, t, amp, att, tau); b.connect(fl); fl.connect(e); e.connect(v.steal);
    b.start(t, Math.random() * 0.3, end - t + 0.01); track(v, b, [b, fl, e]);
  }

  /* un claquement céramique : transitoire très bref et clair, deux ou trois modes de plaque, un corps mat */
  function click(v, t, a, k) {
    burst(v, t, 'bandpass', 3600 * k, 1.6, 1.1 * a, 0.0003, 0.0026);
    burst(v, t, 'highpass', 6500 * k, 0.7, 0.35 * a, 0.0002, 0.0012);
    partial(v, t, 2650 * k, 0.17 * a, 0.0075);
    partial(v, t, 2650 * k * rand(1.55, 1.62), 0.1 * a, 0.0052);
    partial(v, t, 2650 * k * rand(2.28, 2.36), 0.05 * a, 0.0035);
    burst(v, t, 'bandpass', 950 * k, 2.2, 0.3 * a, 0.0005, 0.006);   // corps : jeton lourd sur jeton
  }
  function land(t, i, chatter) {
    const k = 1 + rand(-0.06, 0.06), a = Math.pow(i, 1.05) * rand(0.9, 1.08);
    const v = newVoice(t, 0.3, rand(-0.25, 0.25), 0.22);
    click(v, t, a, k);
    // le jeton se pose : un ou deux petits rebonds sur l'arête
    let tt = t, aa = a;
    for (let n = 0; n < chatter; n++) { tt += rand(0.018, 0.034) * (1 - n * 0.3); aa *= rand(0.22, 0.34); click(v, tt, aa, k * rand(1.01, 1.05)); }
    v.end = tt + 0.2;
  }
  function tick(t, i) {
    const k = 1 + rand(-0.08, 0.08), a = Math.pow(i, 1.1);
    const v = newVoice(t, 0.15, rand(-0.3, 0.3), 0.15);
    burst(v, t, 'bandpass', 4200 * k, 1.4, 0.7 * a, 0.0003, 0.002);
    partial(v, t, 3100 * k, 0.08 * a, 0.004);
  }
  function lift(t, i) {
    const a = Math.pow(i, 1.1), v = newVoice(t, 0.2, rand(-0.2, 0.2), 0.12);
    burst(v, t, 'bandpass', 2400, 0.9, 0.18 * a, 0.012, 0.02);       // glissé de feutre
    burst(v, t + 0.01, 'bandpass', 4400, 1.5, 0.3 * a, 0.0003, 0.002);
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
        if (!g) g = build(ctx);
        if (!isOffline(ctx) && ctx.state !== 'running') ctx.resume().catch(() => {});
      } catch (e) { return; }
      clearTimeout(offTimer); on = true;
      const t = ctx.currentTime; hold(g.out.gain, t); g.out.gain.setTargetAtTime(1, t, 0.02);
    },
    disable() {
      if (!on) return;
      on = false;
      const t = ctx.currentTime; hold(g.out.gain, t); g.out.gain.setTargetAtTime(0, t, 0.02);
      if (!isOffline(ctx)) { clearTimeout(offTimer); offTimer = setTimeout(() => { if (!on && ctx.state === 'running') ctx.suspend().catch(() => {}); }, 300); }
    },
    clack(intensity, kind = 'land') {
      if (!on) return;
      const i = clamp01(+intensity || 0); if (i < 0.01) return;
      const t = Math.max(ctx.currentTime + rand(0, 0.004), g.lastT + 0.006); g.lastT = t;   // jamais deux attaques collées
      if (kind === 'tick') tick(t, i);
      else if (kind === 'lift') lift(t, i);
      else land(t, i, kind === 'drop' ? 1 : 2);
    },
    stop() { /* aucun son continu : rien à couper */ }
  };
  return api;
}
export const createRouletteSound = createChipSound;
