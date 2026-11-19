// cover.js — draws the GTA-style multi-panel cover.
// The poster is a pure function of `state` and the output size, so the live preview and the
// exported PNG are the same drawing: what you see is what you share.
//
// A poster is a neon-sunset sky (gradient, slit sun, stars, palm silhouettes) with a grid of
// photo panels in white gutters, a lettered kicker, a big outlined title across its own band,
// and a tagline pill at the foot. Each panel holds its own photo with its own crop: `zoom`
// magnifies it and `ox`/`oy` pan it inside the frame (-0.5..0.5, 0 is centred).

export const SIZES = [
  { id: '1080x1080', label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  { id: '1080x1350', label: 'Portrait · 1080 × 1350', w: 1080, h: 1350 },
  { id: '1920x1080', label: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
];

// Panels are [x, y, w, h] as fractions of the poster; titleBand is [y0, y1] as fractions of height.
export const LAYOUTS = {
  poster: {
    label: 'Poster',
    titleBand: [0.305, 0.465],
    panels: [
      [0.05, 0.095, 0.435, 0.195],
      [0.515, 0.095, 0.435, 0.195],
      [0.05, 0.48, 0.9, 0.23],
      [0.05, 0.725, 0.29, 0.155],
      [0.355, 0.725, 0.29, 0.155],
      [0.66, 0.725, 0.29, 0.155],
    ],
  },
  loading: {
    label: 'Loading screen',
    titleBand: [0.56, 0.71],
    panels: [
      [0.05, 0.095, 0.9, 0.45],
      [0.05, 0.725, 0.29, 0.155],
      [0.355, 0.725, 0.29, 0.155],
      [0.66, 0.725, 0.29, 0.155],
    ],
  },
  grid: {
    label: 'Comic grid',
    titleBand: [0.71, 0.855],
    panels: [
      [0.05, 0.095, 0.435, 0.19],
      [0.515, 0.095, 0.435, 0.19],
      [0.05, 0.30, 0.435, 0.19],
      [0.515, 0.30, 0.435, 0.19],
      [0.05, 0.505, 0.435, 0.19],
      [0.515, 0.505, 0.435, 0.19],
    ],
  },
  strip: {
    label: 'Strip',
    titleBand: [0.53, 0.68],
    panels: [
      [0.05, 0.095, 0.9, 0.42],
      [0.05, 0.695, 0.29, 0.185],
      [0.355, 0.695, 0.29, 0.185],
      [0.66, 0.695, 0.29, 0.185],
    ],
  },
};

export const GRADES = {
  sunset: {
    label: 'Sunset',
    filter: 'saturate(1.35) contrast(1.08) brightness(1.02)',
    tintTop: 'rgba(255,110,60,0.16)',
    tintBottom: 'rgba(190,30,110,0.20)',
    sky: ['#160a2e', '#5b1a5e', '#c22e6e', '#ff7a30'],
    sun: ['#fff3b0', '#ffb347', '#ff5e7a'],
  },
  neon: {
    label: 'Neon Nights',
    filter: 'saturate(1.7) contrast(1.14) hue-rotate(-14deg)',
    tintTop: 'rgba(0,229,255,0.14)',
    tintBottom: 'rgba(255,0,170,0.22)',
    sky: ['#05051f', '#1b0f4a', '#7b1fa2', '#00c2ff'],
    sun: ['#e0ffff', '#00e5ff', '#ff2fb3'],
  },
  noir: {
    label: 'Noir',
    filter: 'grayscale(1) contrast(1.28) brightness(1.06)',
    tintTop: 'rgba(255,255,255,0.05)',
    tintBottom: 'rgba(40,20,80,0.22)',
    sky: ['#0a0a0f', '#1c1c26', '#3a3a4d', '#6d6d85'],
    sun: ['#ffffff', '#d8d8e0', '#9a9ab0'],
  },
  dusk: {
    label: 'Palm Dusk',
    filter: 'saturate(1.12) contrast(1.05) brightness(0.94)',
    tintTop: 'rgba(120,60,180,0.14)',
    tintBottom: 'rgba(30,10,50,0.26)',
    sky: ['#120826', '#3b1c5c', '#8e3b78', '#ff8c42'],
    sun: ['#ffe9a8', '#ff9a3d', '#e8487a'],
  },
};

/** A small deterministic generator, so the stars never move between renders. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** The sky: a four-stop sunset gradient, stars up top, the slit sun, and palm silhouettes. */
function drawSky(ctx, grade, W, H) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(0.45, grade.sky[1]);
  sky.addColorStop(0.75, grade.sky[2]);
  sky.addColorStop(1, grade.sky[3]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Stars, only in the dark top half, fixed by the seeded generator.
  const rand = rng(20261119);
  for (let i = 0; i < 70; i++) {
    const x = rand() * W;
    const y = rand() * H * 0.42;
    const r = (0.6 + rand() * 1.3) * Math.max(1, W / 1080);
    ctx.globalAlpha = 0.25 + rand() * 0.55;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // The sun: a warm disc low in the sky, cut with horizontal slits. The slits are painted
  // with the same sky gradient, so they read as gaps in the disc rather than holes.
  const cx = W * 0.5;
  const cy = H * 0.4;
  const r = Math.min(W, H) * 0.17;
  const disc = ctx.createRadialGradient(cx, cy - r * 0.25, r * 0.1, cx, cy, r);
  disc.addColorStop(0, grade.sun[0]);
  disc.addColorStop(0.55, grade.sun[1]);
  disc.addColorStop(1, grade.sun[2]);
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 5; i++) {
    const sy = cy + r * 0.05 + i * r * 0.17;
    const half = Math.sqrt(Math.max(0, r * r - (sy - cy) * (sy - cy)));
    ctx.fillStyle = sky;
    ctx.fillRect(cx - half, sy, half * 2, r * 0.085);
  }

  // Palm silhouettes hugging the bottom corners, so their trunks stay at the edges
  // and only the fronds reach into the poster.
  drawPalm(ctx, -W * 0.01, H * 1.02, H * 0.42, 0.1, 'rgba(18,6,26,0.92)');
  drawPalm(ctx, W * 1.01, H * 1.02, H * 0.38, -0.1, 'rgba(18,6,26,0.92)');
  drawPalm(ctx, W * 0.93, H * 1.0, H * 0.22, -0.08, 'rgba(18,6,26,0.85)');
}

/** One palm: a curved trunk and seven drooping fronds, drawn as a silhouette. */
function drawPalm(ctx, x, y, s, lean, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  const topX = x + lean * s;
  const topY = y - s * 0.92;
  // Trunk.
  ctx.lineWidth = Math.max(2, s * 0.045);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * s * 0.3, y - s * 0.5, topX, topY);
  ctx.stroke();
  // Fronds: wide drooping blades, so the silhouette reads as a palm, not spikes.
  for (let i = 0; i < 7; i++) {
    const a = (-Math.PI * 0.92) + (i / 6) * Math.PI * 0.84;
    const len = s * (0.34 + (i % 2) * 0.06);
    const tipX = topX + Math.cos(a) * len;
    const tipY = topY + Math.sin(a) * len * 0.55 + len * 0.22;
    const midX = topX + Math.cos(a) * len * 0.55;
    const midY = topY + Math.sin(a) * len * 0.3 - len * 0.08;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.quadraticCurveTo(midX + Math.cos(a + 0.5) * len * 0.28, midY + len * 0.24, topX, topY);
    ctx.fill();
  }
  // Coconuts.
  ctx.beginPath();
  ctx.arc(topX - s * 0.02, topY + s * 0.02, s * 0.03, 0, Math.PI * 2);
  ctx.arc(topX + s * 0.035, topY + s * 0.03, s * 0.025, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** One photo panel: cover-fit with its own pan/zoom, the grade's filter and tint, white gutter border. */
function drawPanel(ctx, rect, panel, grade, W, H) {
  const [nx, ny, nw, nh] = rect;
  const x = nx * W;
  const y = ny * H;
  const w = nw * W;
  const h = nh * H;
  const r = Math.max(2, Math.min(W, H) * 0.006);

  // Drop shadow under the panel.
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  roundRect(ctx, x + W * 0.004, y + H * 0.005, w, h, r);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  if (panel && panel.img) {
    const img = panel.img;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const zoom = panel.zoom || 1;
    const base = Math.max(w / iw, h / ih);
    const scale = base * zoom;
    const dw = iw * scale;
    const dh = ih * scale;
    const ox = panel.ox || 0;
    const oy = panel.oy || 0;
    const dx = x + (w - dw) / 2 + ox * Math.max(0, dw - w);
    const dy = y + (h - dh) / 2 + oy * Math.max(0, dh - h);
    ctx.filter = grade.filter;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = 'none';
    const tint = ctx.createLinearGradient(0, y, 0, y + h);
    tint.addColorStop(0, grade.tintTop);
    tint.addColorStop(1, grade.tintBottom);
    ctx.fillStyle = tint;
    ctx.fillRect(x, y, w, h);
  } else {
    const empty = ctx.createLinearGradient(x, y, x + w, y + h);
    empty.addColorStop(0, '#241633');
    empty.addColorStop(1, '#120a1e');
    ctx.fillStyle = empty;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `700 ${Math.max(11, h * 0.09)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADD PHOTO', x + w / 2, y + h / 2);
  }
  ctx.restore();

  // White gutter border.
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, Math.min(W, H) * 0.004);
  roundRect(ctx, x, y, w, h, r);
  ctx.stroke();
  ctx.restore();
}

/** Splits a title onto one or two lines that fit maxWidth at the biggest size that works.
 *  A two-line title must also fit the band's height, so it never spills into the panels. */
function layoutTitle(ctx, text, maxWidth, bandH, minSize) {
  const words = text.split(/\s+/).filter(Boolean);
  const singleMax = bandH * 0.78;
  const doubleMax = bandH / 2.1;
  for (let size = singleMax; size >= minSize; size -= 2) {
    ctx.font = `900 ${size}px "Arial Black", Arial, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) return { lines: [text], size };
    if (size <= doubleMax) {
      for (let cut = 1; cut < words.length; cut++) {
        const a = words.slice(0, cut).join(' ');
        const b = words.slice(cut).join(' ');
        if (ctx.measureText(a).width <= maxWidth && ctx.measureText(b).width <= maxWidth) {
          return { lines: [a, b], size };
        }
      }
    }
  }
  ctx.font = `900 ${minSize}px "Arial Black", Arial, sans-serif`;
  return { lines: [text], size: minSize };
}

/** The lettering: kicker up top, the big outlined title in its band, tagline pill at the foot. */
function drawLettering(ctx, state, layout, W, H) {
  const unit = Math.min(W, H);
  const [by0, by1] = layout.titleBand;
  const bandH = (by1 - by0) * H;
  const bandY = (by0 + by1) / 2 * H;

  // Kicker: small tracked-out capitals.
  const kicker = (state.kicker || '').trim().toUpperCase();
  if (kicker) {
    const ks = Math.max(12, unit * 0.026);
    ctx.save();
    ctx.font = `800 ${ks}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    try { ctx.letterSpacing = `${Math.round(ks * 0.42)}px`; } catch { /* older canvas */ }
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = ks * 0.3;
    ctx.fillText(kicker, W / 2, H * 0.052);
    ctx.restore();
  }

  // Title: heavy capitals, black outline, warm fill, neon drop shadow.
  const title = (state.title || '').trim().toUpperCase();
  if (title) {
    const maxW = W * 0.9;
    const { lines, size } = layoutTitle(ctx, title, maxW, bandH, unit * 0.045);
    const lineH = size * 1.02;
    const startY = bandY - ((lines.length - 1) * lineH) / 2;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((line, i) => {
      const y = startY + i * lineH;
      ctx.font = `900 ${size}px "Arial Black", Arial, sans-serif`;
      // Neon shadow pass, drawn first so the fill sits on top of it.
      ctx.shadowColor = 'rgba(255,47,179,0.85)';
      ctx.shadowBlur = size * 0.14;
      ctx.shadowOffsetY = size * 0.05;
      const grad = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, '#ffd166');
      ctx.fillStyle = grad;
      ctx.fillText(line, W / 2, y);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.lineWidth = Math.max(2, size * 0.09);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#14081f';
      ctx.strokeText(line, W / 2, y);
      ctx.fillStyle = grad;
      ctx.fillText(line, W / 2, y);
    });
    ctx.restore();
  }

  // Tagline pill.
  const tag = (state.tagline || '').trim().toUpperCase();
  if (tag) {
    const ts = Math.max(12, unit * 0.024);
    ctx.save();
    ctx.font = `800 ${ts}px system-ui, sans-serif`;
    const tw = ctx.measureText(tag).width;
    const pw = tw + ts * 2.4;
    const ph = ts * 2.1;
    const px = (W - pw) / 2;
    const py = H * 0.905 - ph / 2;
    ctx.fillStyle = 'rgba(12,5,22,0.88)';
    roundRect(ctx, px, py, pw, ph, ph / 2);
    ctx.fill();
    ctx.strokeStyle = '#ff2fb3';
    ctx.lineWidth = Math.max(1.5, unit * 0.002);
    roundRect(ctx, px, py, pw, ph, ph / 2);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, W / 2, H * 0.905);
    ctx.restore();
  }
}

/** Draws the whole poster onto ctx at W x H. state.selected (-1 or a panel index) draws the editor highlight. */
export function drawPoster(ctx, state, W, H) {
  const layout = LAYOUTS[state.layout] || LAYOUTS.poster;
  const grade = GRADES[state.grade] || GRADES.sunset;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  drawSky(ctx, grade, W, H);
  layout.panels.forEach((rect, i) => drawPanel(ctx, rect, state.panels[i], grade, W, H));
  // A soft vignette over the panels, before the lettering goes on top.
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  vig.addColorStop(0, 'rgba(10,4,18,0)');
  vig.addColorStop(1, 'rgba(10,4,18,0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
  drawLettering(ctx, state, layout, W, H);
  if (typeof state.selected === 'number' && state.selected >= 0 && state.selected < layout.panels.length) {
    const [nx, ny, nw, nh] = layout.panels[state.selected];
    ctx.save();
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = Math.max(3, Math.min(W, H) * 0.006);
    ctx.setLineDash([Math.max(8, W * 0.012), Math.max(6, W * 0.008)]);
    roundRect(ctx, nx * W - 4, ny * H - 4, nw * W + 8, nh * H + 8, 6);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/** Which panel (if any) sits at canvas point (x, y)? Returns the index, or -1. */
export function panelAt(state, x, y, W, H) {
  const layout = LAYOUTS[state.layout] || LAYOUTS.poster;
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    const [nx, ny, nw, nh] = layout.panels[i];
    if (x >= nx * W && x <= (nx + nw) * W && y >= ny * H && y <= (ny + nh) * H) return i;
  }
  return -1;
}
