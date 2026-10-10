// The manual is one sheet of paper folded in quarters like a road map. While it opens or closes, four clones of the
// sheet are hung on hinges in a 3D rig. A wide sheet folds into four upright strips: the whole thing first stands up from
// its top edge, then the panels swing out and flatten. A tall, narrow sheet (a phone) folds the other way, like a leaflet:
// four bands one above the other, a small zigzag stack that drops in from above and unfolds downwards from its top edge.
// The real sheet stays hidden until it is flat, so it is never interactive mid-fold.
const DURATION_MS = 1000;
const PERSPECTIVE = 2600;
const MAX_ANGLE = 84;
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const outCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const outQuart = (t: number) => 1 - Math.pow(1 - t, 4);
const hinge = (zig: number) => (zig % 2 === 0 ? 1 : -1) * (zig === 0 ? 1 : 2);

let lastSheet: HTMLElement | null = null;
let pos = 0;

export function foldSheet(sheet: HTMLElement, overlay: HTMLElement, target: 0 | 1): () => void {
  if (sheet !== lastSheet) { lastSheet = sheet; pos = 0 }
  const box = sheet.getBoundingClientRect();
  const host = sheet.parentElement ?? overlay;
  const frame = host.getBoundingClientRect();
  const W = box.width, H = box.height, vert = W < 600, q = (vert ? H : W) / 4;
  const stage = document.createElement('div');
  stage.className = 'manual-fold-stage';
  stage.setAttribute('aria-hidden', 'true');
  Object.assign(stage.style, { position: 'absolute', left: box.left - frame.left + 'px', top: box.top - frame.top + 'px', width: W + 'px', height: H + 'px', perspective: PERSPECTIVE + 'px', perspectiveOrigin: vert ? '50% 40%' : '50% 30%', pointerEvents: 'none', zIndex: '2' });
  const ground = document.createElement('div');
  Object.assign(ground.style, vert ? { position: 'absolute', top: '0', left: '0', width: W + 'px', boxShadow: '0 18px 34px #000a' } : { position: 'absolute', top: '0', height: H + 'px', boxShadow: '0 18px 34px #000a', left: '50%' });
  const rig = document.createElement('div');
  Object.assign(rig.style, { position: 'absolute', inset: '0', transformStyle: 'preserve-3d', transformOrigin: '50% 0' });
  const hinges: HTMLElement[] = [], shades: HTMLElement[] = [];
  let parent: HTMLElement = rig;
  for (let i = 0; i < 4; i++) {
    const h = document.createElement('div');
    Object.assign(h.style, vert ? { position: 'absolute', left: '0', top: i === 0 ? '0' : q + 'px', width: W + 'px', height: q + 'px', transformStyle: 'preserve-3d', transformOrigin: '50% 0' } : { position: 'absolute', top: '0', left: i === 0 ? '0' : q + 'px', width: q + 'px', height: H + 'px', transformStyle: 'preserve-3d', transformOrigin: '0 50%' });
    const face = document.createElement('div');
    Object.assign(face.style, { position: 'absolute', inset: '0', overflow: 'hidden', backfaceVisibility: 'hidden' });
    const copy = sheet.cloneNode(true) as HTMLElement;
    copy.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    copy.removeAttribute('id');
    copy.setAttribute('inert', '');
    copy.style.setProperty('--fw', W + 'px'); copy.style.setProperty('--fh', H + 'px'); copy.style.setProperty('--fl', (vert ? 0 : -i * q) + 'px'); copy.style.setProperty('--ft', (vert ? -i * q : 0) + 'px'); copy.style.visibility = 'visible';
    const shade = document.createElement('div');
    Object.assign(shade.style, { position: 'absolute', inset: '0', background: '#14120a', opacity: '0' });
    face.append(copy, shade);
    h.append(face);
    parent.append(h);
    hinges.push(h); shades.push(shade);
    parent = h;
  }
  stage.append(ground, rig);
  host.append(stage);
  sheet.style.visibility = 'hidden';

  const render = (p: number) => {
    const rise = outCubic(clamp(p / 0.4));
    const open = outQuart(clamp((p - 0.32) / 0.68));
    const a = MAX_ANGLE * (1 - open);
    const rad = (a * Math.PI) / 180;
    const span = (vert ? H : W) * Math.cos(rad);
    if (vert) { rig.style.transform = `translateY(${-(span + 40) * (1 - rise)}px)`; rig.style.opacity = String(Math.min(1, rise * 2)) }
    else rig.style.transform = `translateX(${(W - span) / 2}px) rotateX(${-86 * (1 - rise)}deg)`;
    hinges.forEach((h, i) => { h.style.transform = vert ? `rotateX(${-hinge(i) * a}deg)` : `rotateY(${hinge(i) * a}deg)` });
    shades.forEach((s, i) => { s.style.opacity = String(Math.sin(rad) * (i % 2 === 0 ? 0.42 : 0.1) + (1 - rise) * 0.35) });
    if (vert) ground.style.height = span + 'px';
    else { ground.style.width = span + 'px'; ground.style.marginLeft = -span / 2 + 'px' }
    ground.style.opacity = String(rise);
    if (p >= 1 && target === 1) { stage.remove(); sheet.style.visibility = '' }
  };
  render(pos);
  const from = pos, t0 = performance.now(), dur = Math.max(1, DURATION_MS * Math.abs(target - from));
  let raf = 0;
  const tick = (now: number) => {
    const s = clamp((now - t0) / dur);
    pos = from + (target - from) * s;
    render(pos);
    if (s < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => { cancelAnimationFrame(raf); stage.remove(); if (target === 1 && pos >= 1) sheet.style.visibility = '' };
}
