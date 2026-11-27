'use strict';
/* =====================================================================
   QUI GAGNE LA PRÉSIDENTIELLE ?
   ---------------------------------------------------------------------
   1) LA LISTE DES CANDIDATS — c'est ici qu'il faut modifier.
      - nom         : nom complet (écran de victoire)
      - nomCourt    : nom affiché sous les cercles en bas
      - description : description du dessin (pour vous y retrouver)
      - dessin      : réglages du dessin de la patate
          cheveux        : "court" | "raie" | "ondule" | "arriere" | "milong" | "aucun"
          couleurCheveux : couleur des cheveux
          sourcils       : couleur des sourcils
          veste          : couleur de la veste
          col            : "revers" (veste classique) | "mao" (col Mao) | "ouvert" (chemise col ouvert)
          chemise        : couleur de la chemise (blanc par défaut)
          cravate        : couleur de la cravate, ou null pour aucune
          lunettes       : true / false
          barbe          : couleur de la barbe, ou null pour aucune
          visageFin      : true pour des yeux un peu plus rapprochés
   Vous pouvez mettre plus ou moins de 8 candidats : tout s'adapte.
   L'ordre des niveaux est tiré au sort à chaque partie (neutralité).
   ===================================================================== */
const CANDIDATS = [
  {
    nom: 'Marine Le Pen', nomCourt: 'Le Pen',
    description: 'Cheveux blonds mi-longs, veste bleu marine',
    dessin: { cheveux: 'milong', couleurCheveux: '#EAC66A', sourcils: '#B8944C', veste: '#1C2A55', col: 'revers', cravate: null, lunettes: false, barbe: null },
  },
  {
    nom: 'Jean-Luc Mélenchon', nomCourt: 'Mélenchon',
    description: 'Cheveux gris-blancs, veste à col Mao sans cravate',
    dessin: { cheveux: 'arriere', couleurCheveux: '#DCDCDC', sourcils: '#9A9A9A', veste: '#3A3D4A', col: 'mao', cravate: null, lunettes: false, barbe: null },
  },
  {
    nom: 'Édouard Philippe', nomCourt: 'Philippe',
    description: 'Barbe blanche, cheveux courts',
    dessin: { cheveux: 'court', couleurCheveux: '#CFCFCF', sourcils: '#A0A0A0', veste: '#2B3448', col: 'revers', cravate: '#4C6290', lunettes: false, barbe: '#F5F5F5' },
  },
  {
    nom: 'Gabriel Attal', nomCourt: 'Attal',
    description: 'Jeune, cheveux bruns bien coiffés, rasé, costume ajusté',
    dessin: { cheveux: 'raie', couleurCheveux: '#3A2517', sourcils: '#3A2517', veste: '#1E2A40', col: 'revers', cravate: '#2F4B7C', lunettes: false, barbe: null },
  },
  {
    nom: 'Bruno Retailleau', nomCourt: 'Retailleau',
    description: 'Cheveux gris, lunettes, cravate',
    dessin: { cheveux: 'court', couleurCheveux: '#9C9C9C', sourcils: '#7A7A7A', veste: '#2A303C', col: 'revers', cravate: '#8A3B44', lunettes: true, barbe: null },
  },
  {
    nom: 'Raphaël Glucksmann', nomCourt: 'Glucksmann',
    description: 'Cheveux bruns un peu ondulés, chemise col ouvert',
    dessin: { cheveux: 'ondule', couleurCheveux: '#4A2F1F', sourcils: '#3E271A', veste: '#323846', col: 'ouvert', cravate: null, lunettes: false, barbe: null },
  },
  {
    nom: 'Éric Zemmour', nomCourt: 'Zemmour',
    description: 'Cheveux bruns courts, visage fin, costume sombre',
    dessin: { cheveux: 'court', couleurCheveux: '#3A2A20', sourcils: '#2E2119', veste: '#17171D', col: 'revers', cravate: '#30303F', lunettes: false, barbe: null, visageFin: true },
  },
  {
    nom: 'Marine Tondelier', nomCourt: 'Tondelier',
    description: 'Cheveux châtains mi-longs, veste verte',
    dessin: { cheveux: 'milong', couleurCheveux: '#7A4828', sourcils: '#5E3720', veste: '#3C8C4E', col: 'revers', cravate: null, lunettes: false, barbe: null },
  },
];

/* 2) RÉGLAGES DU JEU */
const NIVEAUX_LACHABLES = 4;          // seuls les N premiers niveaux peuvent tomber
const DUREE_DEBORDEMENT = 2;          // secondes au-dessus de l'ouverture avant game over
const INTERVALLE_VIDEO = 0.85;        // secondes entre deux boules en mode vidéo

/* 3) SONS MP3 (optionnel)
   Déposez des fichiers portant ces noms dans le dossier sounds/ :
   ils remplaceront automatiquement les sons générés. Sinon, rien à faire. */
const FICHIERS_SONS = {
  boing: 'sounds/boing.mp3',          // une boule est lâchée
  choc: 'sounds/choc.mp3',            // deux boules se touchent
  victoire: 'sounds/victoire.mp3',    // fanfare du dernier niveau
  // fusion1.mp3 … fusion8.mp3 : un son par niveau (ajoutés automatiquement ci-dessous)
};
for (let i = 1; i <= CANDIDATS.length; i++) FICHIERS_SONS['fusion' + i] = 'sounds/fusion' + i + '.mp3';

/* =====================================================================
   Moteur du jeu — normalement rien à modifier en dessous
   ===================================================================== */
const { Engine, Bodies, Body, Composite, Events } = Matter;

const W = 540, H = 960;                       // coordonnées logiques (9:16)
const N = CANDIDATS.length;
const RING = { x: 270, y: 530, r: 225 };
const OPEN_HALF = Math.PI / 5;                // ouverture = 1/5 du cercle (72°)
const OPENING_Y = RING.y - RING.r * Math.cos(OPEN_HALF);
const OPEN_HALF_W = RING.r * Math.sin(OPEN_HALF);
const R_MIN = 18, R_MAX = 100;
const RADII = Array.from({ length: N }, (_, i) => N === 1 ? R_MAX : R_MIN * Math.pow(R_MAX / R_MIN, i / (N - 1)));
const DROP_LEVELS = Math.min(NIVEAUX_LACHABLES, N);
const CORR_HALF = RADII[DROP_LEVELS - 1] + 8;
const CORR_TOP = 158;
const CORR_RANGE = OPEN_HALF_W - CORR_HALF - 6;
const HOLD_Y = CORR_TOP + RADII[DROP_LEVELS - 1] + 10;
const IMG_RATIO = 100 / 94;                   // la patate SVG fait 94/100 de l'image
const SCORE_Y = 818, ROW_Y = 888, ROW_R = 27;
const SPEED = Math.max(0.25, Math.min(8, parseFloat(new URLSearchParams(location.search).get('speed')) || 1));

const $ = (id) => document.getElementById(id);
const frame = $('frame'), canvas = $('game'), fxCanvas = $('fx');
const ctx = canvas.getContext('2d'), fx = fxCanvas.getContext('2d');

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ } },
};

/* ---------------------------------------------------------------------
   Dessin des patates (SVG généré)
   --------------------------------------------------------------------- */
function potatoPath() {
  const pts = [], n = 40;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 94 * (1 + 0.022 * Math.sin(3 * a + 0.6) + 0.014 * Math.sin(5 * a + 2.1) - 0.01);
    pts.push([100 + r * Math.cos(a), 100 + r * Math.sin(a)]);
  }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {   // Catmull-Rom -> Bézier
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + 'Z';
}
const POTATO = potatoPath();

function hairSVG(style, c) {
  const hl = 'rgba(255,255,255,.28)';
  switch (style) {
    case 'court': return `
      <path d="M0 0H200V58Q186 44 172 46Q150 30 100 32Q50 30 28 46Q14 44 0 58Z" fill="${c}"/>
      <path d="M0 52Q14 50 22 62L24 88Q14 82 0 84Z M200 52Q186 50 178 62L176 88Q186 82 200 84Z" fill="${c}"/>
      <path d="M60 22Q100 12 140 22" stroke="${hl}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    case 'raie': return `
      <path d="M0 0H200V66Q190 52 176 50Q160 34 124 38Q96 40 72 48Q48 50 28 62Q14 60 0 70Z" fill="${c}"/>
      <path d="M0 60Q16 58 24 70L25 92Q14 86 0 88Z M200 60Q186 56 177 66L175 90Q186 84 200 86Z" fill="${c}"/>
      <path d="M66 8Q64 30 72 48" stroke="rgba(0,0,0,.35)" stroke-width="3" fill="none"/>
      <path d="M84 26Q120 16 160 30" stroke="${hl}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    case 'ondule': return `
      <path d="M0 0H200V70Q190 54 178 62Q170 42 152 50Q140 32 120 42Q104 28 86 40Q68 30 54 46Q36 40 26 60Q14 54 0 70Z" fill="${c}"/>
      <path d="M0 62Q16 58 24 72L25 92Q14 86 0 88Z M200 62Q186 58 176 72L175 92Q186 86 200 88Z" fill="${c}"/>
      <path d="M58 24q10 -8 20 0 M96 16q10 -8 20 0 M134 24q10 -8 20 0" stroke="${hl}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    case 'arriere': return `
      <path d="M0 0H200V84Q188 66 178 72Q172 42 140 34Q100 24 60 34Q28 42 22 72Q12 66 0 84Z" fill="${c}"/>
      <path d="M60 30Q72 14 92 10 M100 28Q112 12 132 10 M140 34Q150 20 166 22" stroke="rgba(0,0,0,.14)" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    case 'milong': return `
      <path d="M0 0H200V178H170Q172 132 164 98Q156 66 134 54Q118 60 96 52Q72 62 50 74Q38 100 38 132L36 178H0Z" fill="${c}"/>
      <path d="M50 74Q74 46 134 54" stroke="rgba(0,0,0,.12)" stroke-width="3" fill="none"/>
      <path d="M70 24Q110 12 150 28 M24 90Q20 130 26 168 M176 90Q182 130 174 168" stroke="${hl}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    default: return '';
  }
}

function suitSVG(d) {
  const v = d.veste, shirt = d.chemise || '#FFFFFF', dark = 'rgba(0,0,0,.28)';
  const skin = '#D8A65C';
  if (d.col === 'mao') return `
    <path d="M-5 205V166Q40 146 100 148Q160 146 205 166V205Z" fill="${v}"/>
    <path d="M70 146Q100 156 130 146L132 160Q100 170 68 160Z" fill="${v}" stroke="${dark}" stroke-width="2.5"/>
    <path d="M100 160V205" stroke="${dark}" stroke-width="2.5"/>
    <circle cx="106" cy="174" r="2.8" fill="${dark}"/><circle cx="106" cy="188" r="2.8" fill="${dark}"/>`;
  const tie = d.cravate ? `
    <path d="M95 154H105L107 162L102 166H98L93 162Z" fill="${d.cravate}"/>
    <path d="M98 165H102L108 205H92Z" fill="${d.cravate}"/>
    <path d="M98 165H102L108 205H92Z" fill="rgba(0,0,0,.12)" transform="translate(4 0) scale(.96 1)"/>` : '';
  const open = d.col === 'ouvert';
  return `
    <path d="M64 148L100 205L136 148Z" fill="${shirt}"/>
    ${open ? `<path d="M86 150L100 176L114 150Z" fill="${skin}"/>` : ''}
    ${tie}
    <path d="M${open ? 76 : 80} 146L100 ${open ? 160 : 157}L${open ? 88 : 92} ${open ? 176 : 168}Z M${open ? 124 : 120} 146L100 ${open ? 160 : 157}L${open ? 112 : 108} ${open ? 176 : 168}Z" fill="${shirt}" stroke="rgba(0,0,0,.18)" stroke-width="1.5"/>
    <path d="M-5 205V164Q36 146 66 147L100 205Z M205 205V164Q164 146 134 147L100 205Z" fill="${v}"/>
    <path d="M68 150L90 188L78 164L84 160Z M132 150L110 188L122 164L116 160Z" fill="${dark}"/>
    <circle cx="100" cy="198" r="3" fill="${dark}"/>`;
}

function faceSVG(d) {
  const gap = d.visageFin ? 21 : 24;
  const ex1 = 100 - gap, ex2 = 100 + gap, ey = 100;
  const rx = d.visageFin ? 11.5 : 12.5, ry = d.visageFin ? 14 : 15;
  const ink = '#3A2414';
  let s = '';
  s += `<ellipse cx="60" cy="122" rx="11" ry="7" fill="#FF7B7B" opacity=".35"/><ellipse cx="140" cy="122" rx="11" ry="7" fill="#FF7B7B" opacity=".35"/>`;
  if (d.barbe) s += `
    <path d="M44 104Q46 152 100 160Q154 152 156 104Q150 126 132 128Q118 120 100 121Q82 120 68 128Q50 126 44 104Z" fill="${d.barbe}"/>
    <path d="M82 120Q100 112 118 120Q110 126 100 124Q90 126 82 120Z" fill="${d.barbe}" stroke="rgba(0,0,0,.12)" stroke-width="1.5"/>`;
  for (const ex of [ex1, ex2]) s += `
    <ellipse cx="${ex}" cy="${ey}" rx="${rx}" ry="${ry}" fill="#fff" stroke="${ink}" stroke-width="2.5"/>
    <circle cx="${ex + 2}" cy="${ey + 3}" r="${rx * 0.55}" fill="#2A1A10"/>
    <circle cx="${ex + 4.5}" cy="${ey - 0.5}" r="2.6" fill="#fff"/>`;
  s += `<path d="M${ex1 - 12} ${ey - 22}Q${ex1} ${ey - 29} ${ex1 + 12} ${ey - 23} M${ex2 - 12} ${ey - 23}Q${ex2} ${ey - 29} ${ex2 + 12} ${ey - 22}" stroke="${d.sourcils || ink}" stroke-width="5.5" fill="none" stroke-linecap="round"/>`;
  if (d.lunettes) s += `
    <circle cx="${ex1}" cy="${ey}" r="18" fill="rgba(200,230,255,.12)" stroke="#2B2B33" stroke-width="3.5"/>
    <circle cx="${ex2}" cy="${ey}" r="18" fill="rgba(200,230,255,.12)" stroke="#2B2B33" stroke-width="3.5"/>
    <path d="M${ex1 + 18} ${ey - 2}Q100 ${ey - 8} ${ex2 - 18} ${ey - 2} M${ex1 - 18} ${ey - 3}L${ex1 - 34} ${ey - 8} M${ex2 + 18} ${ey - 3}L${ex2 + 34} ${ey - 8}" stroke="#2B2B33" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M99 106Q93 116 101 118" stroke="#9A6430" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M84 128Q100 142 116 128Q100 133 84 128Z" fill="#7A2C22" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>`;
  return s;
}

function potatoSVG(d) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="512" height="512">
  <defs>
    <radialGradient id="g" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#F6D696"/><stop offset=".6" stop-color="#DCA85E"/><stop offset="1" stop-color="#A8723A"/></radialGradient>
    <radialGradient id="sh" cx="35%" cy="30%" r="80%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#3A1E08" stop-opacity=".45"/></radialGradient>
    <clipPath id="c"><path d="${POTATO}"/></clipPath>
  </defs>
  <path d="${POTATO}" fill="url(#g)"/>
  <g clip-path="url(#c)">
    <g fill="#9E6A34" opacity=".55">
      <ellipse cx="150" cy="118" rx="4" ry="3"/><ellipse cx="46" cy="134" rx="4.5" ry="3"/>
      <ellipse cx="134" cy="76" rx="3" ry="2.2"/><ellipse cx="64" cy="72" rx="3.2" ry="2.4"/><ellipse cx="160" cy="140" rx="2.6" ry="2"/>
    </g>
    ${hairSVG(d.cheveux, d.couleurCheveux || '#3A2A20')}
    ${suitSVG(d)}
    <path d="M0 0H200V200H0Z" fill="url(#sh)"/>
  </g>
  ${faceSVG(d)}
  <ellipse cx="66" cy="40" rx="20" ry="9" fill="#fff" opacity=".22" transform="rotate(-25 66 40)"/>
  <path d="${POTATO}" fill="none" stroke="#5E3A1C" stroke-width="4"/>
</svg>`;
}

const POTATO_IMG = [];      // Image (pour HTML) par candidat
const POTATO_TEX = [];      // canvas pré-rendu par candidat
function loadPotatoes() {
  return Promise.all(CANDIDATS.map((c, i) => new Promise((res) => {
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(potatoSVG(c.dessin));
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 512;
      cv.getContext('2d').drawImage(img, 0, 0, 512, 512);
      POTATO_TEX[i] = cv; res();
    };
    img.onerror = () => res();
    img.src = url; POTATO_IMG[i] = url;
  })));
}

/* ---------------------------------------------------------------------
   Son (Web Audio, avec remplacement mp3 optionnel)
   --------------------------------------------------------------------- */
const NOTES = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99];
const Sound = {
  ctx: null, out: null, noise: null, buffers: {}, muted: store.get('qgp_muted', '0') === '1', lastHit: 0,
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* */ }
      this.ctx = new AC();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 6;
      this.out = this.ctx.createGain(); this.out.gain.value = 0.9;
      this.out.connect(comp); comp.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.5, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
      this.noise = buf;
      // iOS : jouer un son vide pour débloquer
      const s = this.ctx.createBufferSource(); s.buffer = this.ctx.createBuffer(1, 1, 22050); s.connect(this.ctx.destination); s.start(0);
      this.loadFiles();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  loadFiles() {
    if (location.protocol === 'file:') return;
    for (const [name, url] of Object.entries(FICHIERS_SONS)) {
      fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
        .then((ab) => new Promise((res, rej) => this.ctx.decodeAudioData(ab, res, rej)))
        .then((b) => { this.buffers[name] = b; }).catch(() => { /* pas de fichier : son généré */ });
    }
  },
  setMuted(m) { this.muted = m; store.set('qgp_muted', m ? '1' : '0'); },
  ok() { return this.ctx && !this.muted && this.ctx.state === 'running'; },
  file(name, vol = 1) {
    const b = this.buffers[name]; if (!b) return false;
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain();
    s.buffer = b; g.gain.value = vol; s.connect(g); g.connect(this.out); s.start();
    return true;
  },
  osc(type, freq, t0, dur, vol, dest, attack = 0.005) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || this.out); o.start(t0); o.stop(t0 + dur + 0.05);
    return o;
  },
  boing() {
    if (!this.ok() || this.file('boing', 0.8)) return;
    const c = this.ctx, t = c.currentTime;
    const o = this.osc('sine', 170, t, 0.32, 0.22);
    o.frequency.exponentialRampToValueAtTime(420, t + 0.06);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.3);
    const lfo = c.createOscillator(), lg = c.createGain();
    lfo.frequency.value = 22; lg.gain.value = 25; lfo.connect(lg); lg.connect(o.frequency);
    lfo.start(t); lfo.stop(t + 0.35);
  },
  hit(strength) {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime;
    if (t - this.lastHit < 0.05) return;
    this.lastHit = t;
    const vol = 0.03 + 0.12 * Math.min(1, strength);
    if (this.file('choc', vol * 4)) return;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; f.type = 'bandpass'; f.frequency.value = 900 + Math.random() * 900; f.Q.value = 4;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    s.connect(f); f.connect(g); g.connect(this.out); s.start(t, Math.random() * 0.3, 0.08);
  },
  merge(level) {   // level : 1..N-1 (niveau créé)
    if (!this.ok() || this.file('fusion' + (level + 1), 0.9)) return;
    const c = this.ctx, t = c.currentTime;
    // pop
    const p = this.osc('sine', 900, t, 0.09, 0.3);
    p.frequency.exponentialRampToValueAtTime(220, t + 0.08);
    // note qui monte avec le niveau, de plus en plus riche
    const f = NOTES[Math.min(level, NOTES.length - 1)] * 2;
    const rich = level / Math.max(1, N - 1);
    const dur = 0.35 + rich * 0.6, t1 = t + 0.04;
    const bus = c.createGain(); bus.gain.value = 1; bus.connect(this.out);
    if (rich > 0.4) {   // petit écho pour les gros niveaux
      const dl = c.createDelay(); dl.delayTime.value = 0.14;
      const fb = c.createGain(); fb.gain.value = 0.3;
      bus.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(this.out);
    }
    this.osc('triangle', f, t1, dur, 0.22, bus);
    this.osc('sine', f * 2, t1, dur * 0.7, 0.08 + 0.06 * rich, bus);
    if (level >= 2) this.osc('sine', f * 1.5, t1, dur * 0.8, 0.05 + 0.05 * rich, bus);
    if (level >= 3) this.osc('sine', f / 2, t1, dur, 0.1 * rich, bus);
    if (level >= 4) { this.osc('triangle', f * 1.005, t1, dur, 0.1, bus); this.osc('triangle', f * 0.995, t1, dur, 0.1, bus); }
    if (level >= 5) this.osc('sine', f * 1.25, t1 + 0.06, dur * 0.8, 0.07, bus);
    if (level >= 6) this.osc('square', f, t1, dur * 0.5, 0.025, bus);
  },
  fanfare() {
    if (!this.ok() || this.file('victoire', 1)) return;
    const c = this.ctx, t = c.currentTime + 0.25;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; lp.connect(this.out);
    const seq = [[523.25, 0, 0.14], [659.25, 0.14, 0.14], [783.99, 0.28, 0.14], [1046.5, 0.42, 0.3], [783.99, 0.74, 0.12], [1046.5, 0.88, 0.9]];
    for (const [f, d, l] of seq) {
      this.osc('sawtooth', f, t + d, l + 0.1, 0.09, lp, 0.02);
      this.osc('square', f / 2, t + d, l + 0.1, 0.04, lp, 0.02);
    }
    for (const f of [523.25, 659.25, 783.99]) this.osc('sawtooth', f, t + 0.88, 1.1, 0.05, lp, 0.03);
    const s = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; hp.type = 'highpass'; hp.frequency.value = 5000;
    g.gain.setValueAtTime(0.12, t + 0.88); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    s.connect(hp); hp.connect(g); g.connect(this.out); s.start(t + 0.88); s.stop(t + 1.9);
  },
};

/* ---------------------------------------------------------------------
   Affichage : mise à l'échelle 9:16
   --------------------------------------------------------------------- */
let scale = 1, dpr = 1, staticLayer = null;
function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  let w = vw, h = vw * 16 / 9;
  if (h > vh) { h = vh; w = vh * 9 / 16; }
  frame.style.width = w + 'px'; frame.style.height = h + 'px';
  document.documentElement.style.setProperty('--u', (w / W) + 'px');
  dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  scale = w / W;
  for (const c of [canvas, fxCanvas]) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  buildStatic();
}

function fitFont(c, text, maxW, size, weight = 900) {
  let s = size;
  do { c.font = `${weight} ${s}px "Arial Black", "Helvetica Neue", Arial, sans-serif`; s -= 1; } while (c.measureText(text).width > maxW && s > 6);
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

const RAINBOW = ['#9B3DFF', '#FF3DC8', '#FF2E4A', '#FFE03A', '#3DFF6A', '#3DF0FF', '#3D6BFF'];
function buildStatic() {
  staticLayer = document.createElement('canvas');
  staticLayer.width = canvas.width; staticLayer.height = canvas.height;
  const c = staticLayer.getContext('2d');
  c.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  // fond bleu nuit
  const bg = c.createRadialGradient(RING.x, RING.y, 40, RING.x, RING.y, 700);
  bg.addColorStop(0, '#0B1233'); bg.addColorStop(1, '#03051A');
  c.fillStyle = bg; c.fillRect(0, 0, W, H);
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(255,255,255,${0.08 + rnd() * 0.25})`; c.beginPath(); c.arc(rnd() * W, rnd() * H, rnd() * 1.4 + 0.3, 0, 7); c.fill(); }
  // anneau néon
  const a0 = -Math.PI / 2 + OPEN_HALF, a1 = -Math.PI / 2 - OPEN_HALF + Math.PI * 2, span = (a1 - a0) / (Math.PI * 2);
  const rr = RING.r + 7;
  let stroke;
  if (c.createConicGradient) {
    stroke = c.createConicGradient(a0, RING.x, RING.y);
    RAINBOW.forEach((col, i) => stroke.addColorStop((i / (RAINBOW.length - 1)) * span, col));
    stroke.addColorStop(Math.min(1, span + 0.001), RAINBOW[RAINBOW.length - 1]);
  }
  const hue = (t) => (280 + t * 310) % 360;
  const passes = [
    { w: 54, a: 0.06, blur: 0, add: true }, { w: 32, a: 0.12, blur: 0, add: true }, { w: 18, a: 0.3, blur: 24, add: true }, { w: 9, a: 1, blur: 10, add: false },
  ];
  c.lineCap = 'round';
  for (const p of passes) {
    c.save(); c.globalAlpha = p.a; if (p.add) c.globalCompositeOperation = 'lighter';
    if (stroke) {
      c.strokeStyle = stroke; c.lineWidth = p.w; c.shadowBlur = p.blur; c.shadowColor = 'rgba(255,255,255,.35)';
      c.beginPath(); c.arc(RING.x, RING.y, rr, a0, a1); c.stroke();
    } else {
      const n = 120;
      c.lineCap = 'butt';
      for (let i = 0; i < n; i++) {
        const t = i / n; c.strokeStyle = `hsl(${hue(t)},100%,60%)`; c.lineWidth = p.w;
        c.beginPath(); c.arc(RING.x, RING.y, rr, a0 + (a1 - a0) * t, a0 + (a1 - a0) * (i + 1.1) / n); c.stroke();
      }
    }
    c.restore();
  }
  c.save(); c.globalAlpha = 0.35; c.strokeStyle = '#fff'; c.lineWidth = 2; c.lineCap = 'round';
  c.beginPath(); c.arc(RING.x, RING.y, rr, a0, a1); c.stroke(); c.restore();
  // titre
  c.save();
  c.shadowColor = 'rgba(255,255,255,.5)'; c.shadowBlur = 12;
  roundRect(c, 38, 24, W - 76, 120, 24); c.lineWidth = 5; c.strokeStyle = '#fff'; c.stroke();
  c.restore();
  c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
  fitFont(c, 'QUI GAGNE LA', 420, 46); c.fillText('QUI GAGNE LA', W / 2, 60);
  fitFont(c, 'PRÉSIDENTIELLE ?', 430, 46); c.fillText('PRÉSIDENTIELLE ?', W / 2, 110);
}

/* ---------------------------------------------------------------------
   État du jeu
   --------------------------------------------------------------------- */
let engine = null, balls = [], mergeQueue = [];
let mode = 'home';             // home | play | video | end
let order = [];                // order[niveau] = index du candidat
let unlocked = [], unlockAt = [];
let score = 0, best = parseInt(store.get('qgp_best', '0'), 10) || 0;
let held = null, nextLevel = 0, holdTimer = 0, corridorX = RING.x, aiming = false;
let dangerTime = 0, maxLevel = 0, ending = 0, endReason = '';
let videoTimer = 0, shakeTimer = 0;
let shockwaves = [], particles = [], confetti = [];
let now = 0;
const HOME_ORDER = shuffleInit(CANDIDATS.map((_, i) => i));
function shuffleInit(a) { return shuffle(a); }

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function buildWalls() {
  const segs = 80, thick = 24, rr = RING.r + thick / 2;
  const a0 = -Math.PI / 2 + OPEN_HALF, a1 = -Math.PI / 2 - OPEN_HALF + Math.PI * 2;
  const step = (a1 - a0) / segs, len = 2 * rr * Math.sin(step / 2) + 6;
  const walls = [];
  for (let i = 0; i <= segs; i++) {
    const a = a0 + step * i;
    walls.push(Bodies.rectangle(RING.x + rr * Math.cos(a), RING.y + rr * Math.sin(a), len, thick, {
      isStatic: true, angle: a + Math.PI / 2, friction: 0.08, restitution: 0.1, label: 'wall',
    }));
  }
  Composite.add(engine.world, walls);
}

function startGame(m) {
  Sound.unlock();
  mode = m;
  if (engine) { Composite.clear(engine.world, false); Engine.clear(engine); }
  engine = Engine.create({ positionIterations: 10, velocityIterations: 8 });
  engine.gravity.y = 1;
  buildWalls();
  Events.on(engine, 'collisionStart', (e) => onPairs(e.pairs, true));
  Events.on(engine, 'collisionActive', (e) => onPairs(e.pairs, false));
  balls = []; mergeQueue = []; shockwaves = []; particles = []; confetti = [];
  order = shuffle(CANDIDATS.map((_, i) => i));
  unlocked = new Array(N).fill(false); unlockAt = new Array(N).fill(-10);
  score = 0; dangerTime = 0; maxLevel = 0; ending = 0; endReason = ''; aiming = false;
  corridorX = RING.x; videoTimer = 0.6; shakeTimer = 0;
  held = null; holdTimer = 0.3; nextLevel = randomDropLevel();
  $('home').classList.add('hidden'); $('victory').classList.add('hidden');
  $('hud').classList.toggle('hidden', m !== 'play');
  updateMuteBtn();
  if (m === 'play') tryFullscreen();
}

function randomDropLevel() {
  const w = [0.38, 0.3, 0.2, 0.12].slice(0, DROP_LEVELS);
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return i; }
  return 0;
}

function unlock(level) {
  if (!unlocked[level]) { unlocked[level] = true; unlockAt[level] = now; }
  if (level > maxLevel) maxLevel = level;
}

function addBall(x, y, level, vx = 0, vy = 0) {
  const b = Bodies.circle(x, y, RADII[level], {
    restitution: 0.18, friction: 0.06, frictionStatic: 0.3, frictionAir: 0.008, density: 0.0016, label: 'ball',
  });
  b.level = level; b.born = now; b.merging = false;
  Body.setVelocity(b, { x: vx, y: vy });
  Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.05);
  Composite.add(engine.world, b);
  balls.push(b);
  unlock(level);
  return b;
}

function onPairs(pairs, isStart) {
  for (const p of pairs) {
    const a = p.bodyA, b = p.bodyB;
    if (a.label === 'ball' && b.label === 'ball') {
      if (a.level === b.level && !a.merging && !b.merging && a.level < N - 1) {
        a.merging = b.merging = true; mergeQueue.push([a, b]);
      } else if (isStart) {
        const rv = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
        if (rv > 1.5) Sound.hit((rv - 1.5) / 8);
      }
    } else if (isStart && (a.label === 'ball' || b.label === 'ball')) {
      const ball = a.label === 'ball' ? a : b;
      const v = Math.hypot(ball.velocity.x, ball.velocity.y);
      if (v > 2.5) Sound.hit((v - 2.5) / 14);
    }
  }
}

function removeBall(b) { Composite.remove(engine.world, b); const i = balls.indexOf(b); if (i >= 0) balls.splice(i, 1); }

function processMerges() {
  for (const [a, b] of mergeQueue) {
    if (balls.indexOf(a) < 0 || balls.indexOf(b) < 0) continue;
    const L = a.level + 1;
    const x = (a.position.x + b.position.x) / 2, y = (a.position.y + b.position.y) / 2;
    const vx = (a.velocity.x + b.velocity.x) / 2, vy = (a.velocity.y + b.velocity.y) / 2;
    removeBall(a); removeBall(b);
    addBall(x, y, L, vx, vy);
    score += (L * (L + 1)) / 2 * 2;
    burst(x, y, RADII[L], L);
    Sound.merge(L);
    if (L === N - 1 && !ending) { ending = 1.6; endReason = 'win'; Sound.fanfare(); }
  }
  mergeQueue = [];
}

function burst(x, y, r, level) {
  shockwaves.push({ x, y, r0: r * 0.8, r1: r * 2.4 + 20, t: 0, life: 0.55 });
  if (level >= N - 3) shockwaves.push({ x, y, r0: r, r1: r * 3.2 + 40, t: -0.12, life: 0.7 });
  const cols = ['#FFFFFF', '#FFE6A8', '#F2C46D', '#FFD84D'];
  const n = 12 + level * 3;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 120 + Math.random() * 220;
    particles.push({ x: x + Math.cos(a) * r * 0.6, y: y + Math.sin(a) * r * 0.6, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60,
      life: 0.5 + Math.random() * 0.4, t: 0, size: 2 + Math.random() * 3.5, col: cols[i % cols.length] });
  }
}

function dropHeld() {
  if (!held) return;
  const x = mode === 'video' ? RING.x + (Math.random() - 0.5) * 36 : corridorX;
  addBall(x, HOLD_Y, held.level, 0, 1);
  Sound.boing();
  held = null; holdTimer = mode === 'video' ? 0.25 : 0.45;
}

/* Choix des boules en mode vidéo : on favorise les paires pour que la partie
   aboutisse à un gagnant en ~40-70 s, avec une part d'aléatoire. */
function videoPickLevel() {
  if (Math.random() < 0.3) return randomDropLevel();
  const counts = new Array(N).fill(0);
  for (const b of balls) counts[b.level]++;
  for (let L = DROP_LEVELS - 1; L >= 0; L--) if (counts[L] % 2 === 1) return L;
  return Math.random() < 0.5 ? DROP_LEVELS - 1 : DROP_LEVELS - 2;
}

function update(dt) {
  if (mode === 'home') return;
  // boule en attente dans le couloir
  if (!held && !ending && (mode === 'play' || mode === 'video')) {
    holdTimer -= dt;
    if (holdTimer <= 0) {
      if (mode === 'play') { held = { level: nextLevel, t: now }; nextLevel = randomDropLevel(); unlock(held.level); }
      else if (dangerTime < 0.3) { held = { level: videoPickLevel(), t: now }; unlock(held.level); videoTimer = INTERVALLE_VIDEO - 0.25; }
    }
  }
  if (mode === 'video' && held && !ending) { videoTimer -= dt; if (videoTimer <= 0) dropHeld(); }

  // physique (pas fixe)
  const STEP = 1000 / 60;
  update.acc = (update.acc || 0) + dt * 1000;
  let steps = 0;
  while (update.acc >= STEP && steps < 10 * SPEED) {
    Engine.update(engine, STEP);
    processMerges();
    update.acc -= STEP; steps++;
  }
  if (steps >= 10 * SPEED) update.acc = 0;

  // débordement
  let danger = false;
  for (const b of balls.slice()) {
    if (b.position.y > H + 150 || b.position.x < -150 || b.position.x > W + 150) {   // boule échappée
      removeBall(b);
      if (mode === 'play' && !ending) { ending = 0.2; endReason = 'over'; }
      continue;
    }
    if (now - b.born > 1.2 && b.position.y < OPENING_Y && Math.abs(b.velocity.y) < 3) danger = true;
  }
  dangerTime = danger ? dangerTime + dt : Math.max(0, dangerTime - dt * 2);
  if (mode === 'play' && !ending && dangerTime > DUREE_DEBORDEMENT) { ending = 0.3; endReason = 'over'; Sound.fanfare(); }
  if (mode === 'video' && dangerTime > 2.2) {   // en vidéo : petite secousse pour débloquer
    shakeTimer -= dt;
    if (shakeTimer <= 0) {
      shakeTimer = 0.8;
      for (const b of balls) Body.setVelocity(b, { x: b.velocity.x + (Math.random() - 0.5) * 6, y: b.velocity.y - Math.random() * 3 });
    }
  }

  if (ending) { ending -= dt; if (ending <= 0) { ending = 0; showVictory(); } }
}

/* ---------------------------------------------------------------------
   Rendu
   --------------------------------------------------------------------- */
function drawPotato(c, level, x, y, r, angle = 0) {
  const tex = POTATO_TEX[order[level]]; if (!tex) return;
  const s = 2 * r * IMG_RATIO;
  c.save(); c.translate(x, y); if (angle) c.rotate(angle);
  c.drawImage(tex, -s / 2, -s / 2, s, s); c.restore();
}

function easeOutBack(t) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }

function render(dt) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (staticLayer) ctx.drawImage(staticLayer, 0, 0);
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);

  if (mode === 'home') { renderHome(); return; }

  // ligne de danger
  if (dangerTime > 0.05) {
    const a = 0.4 + 0.4 * Math.sin(now * 14);
    ctx.save(); ctx.strokeStyle = `rgba(255,60,80,${a})`; ctx.lineWidth = 4; ctx.setLineDash([12, 10]);
    ctx.shadowColor = '#ff3050'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(RING.x - OPEN_HALF_W - 10, OPENING_Y); ctx.lineTo(RING.x + OPEN_HALF_W + 10, OPENING_Y); ctx.stroke();
    ctx.restore();
  }

  // couloir
  const cx = mode === 'video' ? RING.x : corridorX;
  ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(255,255,255,.7)'; ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(cx - CORR_HALF, CORR_TOP); ctx.lineTo(cx - CORR_HALF, OPENING_Y - 6);
  ctx.moveTo(cx + CORR_HALF, CORR_TOP); ctx.lineTo(cx + CORR_HALF, OPENING_Y - 6);
  ctx.stroke(); ctx.restore();
  if (mode === 'play' && held && aiming) {
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
    ctx.beginPath(); ctx.moveTo(cx, HOLD_Y + RADII[held.level]); ctx.lineTo(cx, RING.y + RING.r - 10); ctx.stroke(); ctx.restore();
  }
  if (held) {
    const k = easeOutBack(Math.min(1, (now - held.t) / 0.25));
    drawPotato(ctx, held.level, cx, HOLD_Y, RADII[held.level] * Math.max(0.01, k));
  }

  // boules
  for (const b of balls) {
    const k = Math.min(1, (now - b.born) / 0.18);
    const s = 0.75 + 0.25 * easeOutBack(k);
    drawPotato(ctx, b.level, b.position.x, b.position.y, RADII[b.level] * s, b.angle);
  }

  // onde de choc + particules
  for (const w of shockwaves) {
    w.t += dt; if (w.t < 0) continue;
    const p = w.t / w.life; if (p > 1) continue;
    ctx.save(); ctx.strokeStyle = `rgba(255,255,255,${(1 - p) * 0.9})`; ctx.lineWidth = 3.5 * (1 - p) + 0.8;
    ctx.beginPath(); ctx.arc(w.x, w.y, w.r0 + (w.r1 - w.r0) * (1 - Math.pow(1 - p, 3)), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  shockwaves = shockwaves.filter((w) => w.t < w.life);
  for (const q of particles) {
    q.t += dt; q.vy += 500 * dt; q.vx *= 0.98; q.x += q.vx * dt; q.y += q.vy * dt;
    const a = Math.max(0, 1 - q.t / q.life);
    ctx.globalAlpha = a; ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (0.5 + a * 0.5), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  particles = particles.filter((q) => q.t < q.life);

  // prochaine boule
  if (mode === 'play') {
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont(ctx, 'SUIVANT', 90, 15); ctx.fillText('SUIVANT', 474, 170);
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(474, 222, 38, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    if (!ending) drawPotato(ctx, nextLevel, 474, 222, Math.min(32, RADII[nextLevel] * 0.9));
  }

  // score
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.save(); ctx.shadowColor = 'rgba(255,255,255,.45)'; ctx.shadowBlur = 10;
  fitFont(ctx, 'SCORE : ' + score, 460, 48); ctx.fillText('SCORE : ' + score, W / 2, SCORE_Y);
  ctx.restore();

  renderRow();
}

function renderRow() {
  const gap = W / N, r = Math.min(ROW_R, gap / 2 - 4);
  for (let L = 0; L < N; L++) {
    const x = gap * (L + 0.5), y = ROW_Y;
    const t = now - unlockAt[L];
    const pop = t < 0.5 ? 1 + 0.35 * Math.sin((t / 0.5) * Math.PI) : 1;
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r * pop, 0, Math.PI * 2);
    ctx.fillStyle = unlocked[L] ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.05)'; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = unlocked[L] ? '#fff' : 'rgba(255,255,255,.55)';
    if (unlocked[L] && t < 0.6) { ctx.shadowColor = '#fff'; ctx.shadowBlur = 18; }
    ctx.stroke(); ctx.restore();
    if (unlocked[L]) {
      drawPotato(ctx, L, x, y, r * 0.92 * pop);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      const name = CANDIDATS[order[L]].nomCourt.toUpperCase();
      fitFont(ctx, name, gap - 4, 12); ctx.fillText(name, x, y + r + 7);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      fitFont(ctx, '?', 40, 26); ctx.fillText('?', x, y + 1);
    }
  }
}

function renderHome() {
  // les candidats tournent doucement dans l'anneau (mystère : visages, pas de niveau)
  for (let i = 0; i < N; i++) {
    const a = Math.PI * (0.11 + 0.78 * (i / Math.max(1, N - 1))) + Math.sin(now * 0.6) * 0.04;
    const x = RING.x + Math.cos(a) * 182, y = RING.y + Math.sin(a) * 182 - Math.abs(Math.sin(now * 3 + i)) * 8;
    const tex = POTATO_TEX[HOME_ORDER[i]]; if (!tex) continue;
    const s = 2 * 30 * IMG_RATIO;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(now * 2 + i) * 0.2); ctx.globalAlpha = 0.9;
    ctx.drawImage(tex, -s / 2, -s / 2, s, s); ctx.restore();
  }
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  fitFont(ctx, '8 CANDIDATS · 1 SEUL GAGNANT', 460, 26); ctx.fillText('8 CANDIDATS · 1 SEUL GAGNANT'.replace('8', N), W / 2, SCORE_Y);
  const gap = W / N, r = Math.min(ROW_R, gap / 2 - 4);
  for (let L = 0; L < N; L++) {
    const x = gap * (L + 0.5);
    ctx.save(); ctx.beginPath(); ctx.arc(x, ROW_Y, r, 0, Math.PI * 2); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.stroke(); ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.75)'; fitFont(ctx, '?', 40, 26); ctx.fillText('?', x, ROW_Y + 1);
  }
}

/* Confettis (calque au-dessus des écrans) */
function spawnConfetti() {
  const cols = RAINBOW.concat(['#FFFFFF']);
  for (let i = 0; i < 170; i++) {
    confetti.push({ x: Math.random() * W, y: -20 - Math.random() * H * 0.8, vx: (Math.random() - 0.5) * 80, vy: 120 + Math.random() * 160,
      rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10, w: 6 + Math.random() * 7, h: 3 + Math.random() * 5, col: cols[i % cols.length], ph: Math.random() * 6 });
  }
}
function renderFx(dt) {
  fx.setTransform(1, 0, 0, 1, 0, 0); fx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
  if (!confetti.length) return;
  fx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  for (const p of confetti) {
    p.ph += dt * 5; p.x += (p.vx + Math.sin(p.ph) * 40) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    if (p.y > H + 20 && mode === 'end') { p.y = -20; p.x = Math.random() * W; }
    fx.save(); fx.translate(p.x, p.y); fx.rotate(p.rot); fx.scale(1, Math.cos(p.ph));
    fx.fillStyle = p.col; fx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); fx.restore();
  }
}

/* ---------------------------------------------------------------------
   Écrans
   --------------------------------------------------------------------- */
let lastMode = 'play', winnerIdx = 0, buttonsTimer = null;
function showVictory() {
  lastMode = mode;
  const level = endReason === 'win' ? N - 1 : maxLevel;
  winnerIdx = order[level];
  const cand = CANDIDATS[winnerIdx];
  if (lastMode === 'play' && score > best) { best = score; store.set('qgp_best', String(best)); }
  mode = 'end'; held = null; aiming = false;
  $('winImg').src = POTATO_IMG[winnerIdx];
  $('winName').textContent = cand.nom.toUpperCase() + ' GAGNE !';
  $('winKicker').textContent = endReason === 'win' ? 'VICTOIRE !' : 'ÇA DÉBORDE ! LE PLUS GROS :';
  $('winSub').textContent = 'Score : ' + score + (lastMode === 'play' ? '  ·  Record : ' + best : '');
  $('victory').classList.remove('hidden');
  $('hud').classList.add('hidden');
  const btns = $('winButtons');
  clearTimeout(buttonsTimer);
  if (lastMode === 'video') {        // en vidéo : boutons après quelques secondes (fin de clip propre)
    btns.style.opacity = '0'; btns.style.pointerEvents = 'none';
    buttonsTimer = setTimeout(() => { btns.style.opacity = '1'; btns.style.pointerEvents = ''; }, 4500);
  } else { btns.style.opacity = '1'; btns.style.pointerEvents = ''; }
  spawnConfetti();
}

function showHome() {
  mode = 'home'; held = null; confetti = []; ending = 0;
  if (engine) { Composite.clear(engine.world, false); }
  balls = [];
  $('best').textContent = 'Meilleur score : ' + best;
  $('home').classList.remove('hidden'); $('victory').classList.add('hidden'); $('hud').classList.add('hidden');
}

function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2200); }

function makeShareImage() {
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1920;
  const g = c.getContext('2d'); g.scale(2, 2);
  const bg = g.createRadialGradient(270, 520, 40, 270, 520, 700); bg.addColorStop(0, '#0B1233'); bg.addColorStop(1, '#03051A');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#fff'; g.lineWidth = 5; roundRect(g, 38, 60, W - 76, 120, 24); g.stroke();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  fitFont(g, 'QUI GAGNE LA', 420, 46); g.fillText('QUI GAGNE LA', W / 2, 96);
  fitFont(g, 'PRÉSIDENTIELLE ?', 430, 46); g.fillText('PRÉSIDENTIELLE ?', W / 2, 146);
  const tex = POTATO_TEX[winnerIdx];
  g.save(); g.shadowColor = 'rgba(255,220,90,.6)'; g.shadowBlur = 40; if (tex) g.drawImage(tex, 110, 280, 320, 320); g.restore();
  const name = CANDIDATS[winnerIdx].nom.toUpperCase() + ' GAGNE !';
  fitFont(g, name, 480, 44); g.fillText(name, W / 2, 680);
  g.font = '700 26px "Helvetica Neue", Arial, sans-serif'; g.fillText('Score : ' + score, W / 2, 740);
  return new Promise((res) => c.toBlob(res, 'image/png'));
}

async function share() {
  const name = CANDIDATS[winnerIdx].nom;
  const text = `${name} gagne la présidentielle des patates 🥔🗳️ Score : ${score}. Qui gagne chez toi ?`;
  const url = location.href.split('?')[0];
  try {
    const blob = await makeShareImage();
    const file = blob && new File([blob], 'qui-gagne-la-presidentielle.png', { type: 'image/png' });
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text, title: 'Qui gagne la présidentielle ?' }); return; }
    if (navigator.share) { await navigator.share({ title: 'Qui gagne la présidentielle ?', text, url }); return; }
    await navigator.clipboard.writeText(text + ' ' + url); toast('Lien copié !');
  } catch (e) { if (e && e.name !== 'AbortError') toast('Partage impossible'); }
}

function tryFullscreen() {
  const el = document.documentElement;
  try { if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {}); } catch (e) { /* iPhone : non supporté */ }
}

function updateMuteBtn() { $('btnMute').textContent = Sound.muted ? '🔇' : '🔊'; }

/* ---------------------------------------------------------------------
   Commandes tactiles
   --------------------------------------------------------------------- */
function toLogicalX(clientX) { const r = canvas.getBoundingClientRect(); return ((clientX - r.left) / r.width) * W; }
function aimAt(clientX) { corridorX = Math.max(RING.x - CORR_RANGE, Math.min(RING.x + CORR_RANGE, toLogicalX(clientX))); }

let lastTap = 0;
canvas.addEventListener('pointerdown', (e) => {
  Sound.unlock();
  if (mode === 'play') { aiming = true; aimAt(e.clientX); try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* */ } }
  if (mode === 'video') {   // double-tap = retour à l'accueil (aucun bouton visible)
    if (now - lastTap < 0.35) showHome();
    lastTap = now;
  }
});
canvas.addEventListener('pointermove', (e) => { if (mode === 'play' && aiming) aimAt(e.clientX); });
const release = (e) => {
  if (mode === 'play' && aiming) { aiming = false; aimAt(e.clientX); if (held && !ending) dropHeld(); }
};
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', () => { aiming = false; });
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('pointerdown', () => Sound.unlock(), { capture: true });

$('btnPlay').addEventListener('click', () => startGame('play'));
$('btnVideo').addEventListener('click', () => startGame('video'));
$('btnReplay').addEventListener('click', () => startGame(lastMode));
$('btnShare').addEventListener('click', share);
$('btnHome').addEventListener('click', showHome);
$('btnMute').addEventListener('click', () => { Sound.unlock(); Sound.setMuted(!Sound.muted); updateMuteBtn(); });
$('victory').addEventListener('dblclick', () => { if (lastMode === 'video') showHome(); });
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));

/* ---------------------------------------------------------------------
   Boucle principale
   --------------------------------------------------------------------- */
let lastT = 0;
function loop(t) {
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0);
  lastT = t;
  const sdt = mode === 'home' ? dt : dt * SPEED;
  now += sdt;
  update(sdt);
  render(sdt);
  renderFx(dt);
  requestAnimationFrame(loop);
}

resize();
loadPotatoes().then(() => {
  $('best').textContent = 'Meilleur score : ' + best;
  requestAnimationFrame(loop);
});

// accès pour les tests
window.__game = { get mode() { return mode; }, get score() { return score; }, get balls() { return balls.length; }, get maxLevel() { return maxLevel; }, get order() { return order; }, startGame };
