// Fixed scenes for screenshots: ?shot=editor shows the page with a sample photo; ?shot=cover shows the cover alone.
// `photo` picks the sample (samples/<photo>.jpg) and `caption` the title; `layout`, `grade`, `size`,
// `kicker` and `tagline` are applied by the page's loader before it paints.
// window.__shotReady is set once painted.
export async function runShot(shot, query, load) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await load(query.get('photo') ?? 'pier', query.get('caption') ?? 'Vice City');
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
