// main.js — wires the page: pick a layout and grade, fill the panels from the samples or your
// own photos, drag a panel's photo to place it, letter the caption, export the PNG.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawPoster, panelAt, LAYOUTS, GRADES, SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('poster');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

const samples = {}; // name -> Image, filled at start
const uploads = []; // { name, img } in upload order

const state = {
  layout: 'poster',
  grade: 'sunset',
  size: '1080x1080',
  kicker: 'GRAND THEFT AUTO',
  title: 'VICE CITY',
  tagline: 'SUNSET HEIST',
  panels: [], // { img, label, zoom, ox, oy }
  selected: 0,
};

function panelCount() {
  return LAYOUTS[state.layout].panels.length;
}

/** Keeps one panel per layout slot: old photos carry over by index, new slots take the samples. */
/** Puts a freshly assigned photo at a sensible crop: favour the top of the picture when the
 *  frame is wider than the photo, so faces stay in frame instead of being cropped out. */
function settlePhoto(panel, index) {
  panel.zoom = 1;
  panel.ox = 0;
  panel.oy = 0;
  if (!panel.img) return;
  const rect = LAYOUTS[state.layout].panels[index];
  const { w, h } = sizeDef();
  const pw = rect[2] * w;
  const ph = rect[3] * h;
  const base = Math.max(pw / panel.img.naturalWidth, ph / panel.img.naturalHeight);
  const dh = panel.img.naturalHeight * base;
  if (dh - ph > 40) panel.oy = 0.25; // wide frame: show the top of the photo (faces)
}

function syncPanels() {
  const n = panelCount();
  const next = [];
  for (let i = 0; i < n; i++) {
    if (state.panels[i]) next.push(state.panels[i]);
    else {
      const name = i % 2 === 0 ? 'pier' : 'boulevard';
      const p = { img: samples[name] || null, label: name, zoom: 1, ox: 0, oy: 0 };
      next.push(p);
      settlePhoto(p, i); // only a fresh panel gets a fresh crop
    }
  }
  state.panels = next;
  if (state.selected >= n) state.selected = 0;
}

function sizeDef() {
  return SIZES.find((s) => s.id === state.size) || SIZES[0];
}

function render() {
  const { w, h } = sizeDef();
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawPoster(ctx, state, w, h);
  renderPanelEditor();
}

function setStatus(text) {
  statusEl.textContent = text;
}

// ---- Option rows (layout / grade / size) ------------------------------------

function buildOptions(el, items, current, onPick) {
  el.innerHTML = '';
  items.forEach((item) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'opt' + (item.id === current ? ' on' : '');
    b.textContent = item.label;
    b.addEventListener('click', () => onPick(item.id));
    el.appendChild(b);
  });
}

function renderOptions() {
  buildOptions(
    document.getElementById('layouts'),
    Object.entries(LAYOUTS).map(([id, l]) => ({ id, label: l.label })),
    state.layout,
    (id) => { state.layout = id; syncPanels(); render(); },
  );
  buildOptions(
    document.getElementById('grades'),
    Object.entries(GRADES).map(([id, g]) => ({ id, label: g.label })),
    state.grade,
    (id) => { state.grade = id; render(); },
  );
  buildOptions(
    document.getElementById('sizes'),
    SIZES,
    state.size,
    (id) => { state.size = id; render(); },
  );
}

// ---- The selected panel's editor --------------------------------------------

function photoChoices() {
  const choices = [
    { id: 'pier', label: 'Pier', img: samples.pier },
    { id: 'boulevard', label: 'Boulevard', img: samples.boulevard },
  ];
  uploads.forEach((u, i) => choices.push({ id: `upload:${i}`, label: u.name, img: u.img }));
  choices.push({ id: 'none', label: 'Empty', img: null });
  return choices;
}

function renderPanelEditor() {
  const box = document.getElementById('panel-editor');
  const panel = state.panels[state.selected];
  if (!panel) { box.innerHTML = ''; return; }
  box.innerHTML = '';
  const head = document.createElement('p');
  head.className = 'panel-head';
  head.textContent = `Panel ${state.selected + 1} of ${panelCount()} — ${panel.label || 'empty'}`;
  box.appendChild(head);

  const photos = document.createElement('div');
  photos.className = 'row wrap';
  photoChoices().forEach((c) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'opt small' + (panel.label === c.id ? ' on' : '');
    b.textContent = c.label;
    b.addEventListener('click', () => {
      panel.img = c.img;
      panel.label = c.id;
      settlePhoto(panel, state.selected);
      render();
    });
    photos.appendChild(b);
  });
  box.appendChild(photos);

  const zoomRow = document.createElement('label');
  zoomRow.className = 'slider-row';
  zoomRow.textContent = 'Zoom';
  const zoom = document.createElement('input');
  zoom.type = 'range';
  zoom.min = '1';
  zoom.max = '3';
  zoom.step = '0.05';
  zoom.value = String(panel.zoom || 1);
  zoom.addEventListener('input', () => { panel.zoom = Number(zoom.value); render(); });
  zoomRow.appendChild(zoom);
  box.appendChild(zoomRow);

  const recenter = document.createElement('button');
  recenter.type = 'button';
  recenter.className = 'opt small';
  recenter.textContent = 'Recentre photo';
  recenter.addEventListener('click', () => {
    panel.zoom = 1;
    panel.ox = 0;
    panel.oy = 0;
    render();
  });
  box.appendChild(recenter);
}

// ---- Photos: samples and uploads -------------------------------------------

async function loadSamples() {
  for (const name of ['pier', 'boulevard']) {
    try {
      samples[name] = await loadImage(`samples/${name}.jpg`);
    } catch {
      samples[name] = null;
    }
  }
}

document.getElementById('use-samples').addEventListener('click', () => {
  state.panels.forEach((p, i) => {
    const name = i % 2 === 0 ? 'pier' : 'boulevard';
    p.img = samples[name] || null;
    p.label = name;
    settlePhoto(p, i);
  });
  render();
  setStatus('Sample photos loaded into every panel.');
});

document.getElementById('upload').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  if (!files.length) return;
  for (const file of files) {
    try {
      const img = await loadImage(URL.createObjectURL(file));
      uploads.push({ name: file.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'Photo', img });
    } catch {
      // A file that is not a readable image is skipped.
    }
  }
  // Fresh uploads go straight into the empty panels, first come first served.
  let u = 0;
  state.panels.forEach((p, i) => {
    if (!p.img && u < uploads.length) {
      p.img = uploads[u].img;
      p.label = `upload:${u}`;
      settlePhoto(p, i);
      u++;
    }
  });
  render();
  setStatus(`${files.length} photo${files.length > 1 ? 's' : ''} loaded.`);
  e.target.value = '';
});

// ---- Caption ----------------------------------------------------------------

for (const [id, key] of [['kicker', 'kicker'], ['title', 'title'], ['tagline', 'tagline']]) {
  document.getElementById(id).addEventListener('input', (e) => {
    state[key] = e.target.value;
    render();
  });
}

// ---- Pointer: click a panel to pick it, drag to pan its photo ---------------

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  const hit = panelAt(state, x, y, canvas.width, canvas.height);
  if (hit < 0) return;
  state.selected = hit;
  drag = { x, y, ox: state.panels[hit].ox || 0, oy: state.panels[hit].oy || 0 };
  canvas.setPointerCapture(e.pointerId);
  render();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const panel = state.panels[state.selected];
  if (!panel || !panel.img) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  const layout = LAYOUTS[state.layout].panels[state.selected];
  const pw = layout[2] * canvas.width;
  const ph = layout[3] * canvas.height;
  const base = Math.max(pw / panel.img.naturalWidth, ph / panel.img.naturalHeight);
  const dw = panel.img.naturalWidth * base * (panel.zoom || 1);
  const dh = panel.img.naturalHeight * base * (panel.zoom || 1);
  panel.ox = clamp(drag.ox + (x - drag.x) / Math.max(1, dw - pw), -0.5, 0.5);
  panel.oy = clamp(drag.oy + (y - drag.y) / Math.max(1, dh - ph), -0.5, 0.5);
  render();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointercancel', () => { drag = null; });

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

// ---- Export -----------------------------------------------------------------

function renderTo(w, h) {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawPoster(off.getContext('2d'), { ...state, selected: -1 }, w, h);
  return off;
}

function download(canvasEl, filename) {
  return new Promise((resolve) => {
    canvasEl.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve();
    }, 'image/png');
  });
}

document.getElementById('export').addEventListener('click', async () => {
  const { w, h } = sizeDef();
  await download(renderTo(w, h), `vice-cover-${w}x${h}.png`);
  setStatus(`Saved vice-cover-${w}x${h}.png`);
});

document.getElementById('export-all').addEventListener('click', async () => {
  for (const s of SIZES) {
    await download(renderTo(s.w, s.h), `vice-cover-${s.w}x${s.h}.png`);
  }
  setStatus('Saved all three sizes.');
});

// ---- Start ------------------------------------------------------------------

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  await loadSamples();
  syncPanels();
  renderOptions();
  await runShot(shot, new URLSearchParams(location.search), async (sample, text) => {
    const q = new URLSearchParams(location.search);
    if (q.get('layout') && LAYOUTS[q.get('layout')]) state.layout = q.get('layout');
    if (q.get('grade') && GRADES[q.get('grade')]) state.grade = q.get('grade');
    if (q.get('size') && SIZES.some((s) => s.id === q.get('size'))) state.size = q.get('size');
    if (q.get('kicker')) state.kicker = q.get('kicker');
    if (q.get('tagline')) state.tagline = q.get('tagline');
    syncPanels();
    // Alternate the chosen sample with the other one, so the cover shows both photos
    // instead of the same picture in every panel.
    const other = sample === 'pier' ? 'boulevard' : 'pier';
    state.panels.forEach((p, i) => {
      const name = i % 2 === 0 ? sample : other;
      p.img = samples[name] || samples.pier;
      p.label = name;
      settlePhoto(p, i);
    });
    state.title = text;
    state.selected = -1;
    renderOptions();
    render();
  });
} else {
  await loadSamples();
  syncPanels();
  renderOptions();
  render();
  setStatus('Pick a panel, drag its photo, then export.');
}
