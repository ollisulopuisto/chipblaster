// CRT visualizer in the manner of the C64's VIC-II: a picture with a 320x200 display window inside a border that overscan trims,
// the 16 Pepto colours only, 8x8 character cells, 2x1 multicolour pixels, hardware sprites (24x21, expandable, 8 per
// scanline) multiplexed into two bands, raster bars and per-line border colours. The analogue CRT faults are always on but
// mostly asleep: a faint bass wobble, hum bar and noise, a tiny tick every ~45 s and one real glitch about every two and a half minutes.
// The effects are drawn at the C64's own size: 368x240 with a 24x20 border around the 320x200 window. A second pass stretches
// that to the tube: the border keeps a fixed thickness on screen (8.5% of the shorter side, the same on all four sides) and
// the window takes whatever is left, so its pixels may come out wider or taller than square.
export const C64_TEX_W = 368;
export const C64_TEX_H = 240;
const C64_BORDER_X = 24;
const C64_BORDER_Y = 20;
// The tube is convex: the picture bows outward at the middle of each edge and the corners fall into black.
const C64_TUBE_BULGE = 0.05;
export const C64_PRESENT = `precision highp float;
uniform sampler2D tex;
uniform vec2 outRes;
uniform float bpx;
float mapAxis(float o,float outLen,float texLen,float bl){
  if(o<bpx)return o/bpx*bl;
  if(o>=outLen-bpx)return texLen-bl+(o-(outLen-bpx))/bpx*bl;
  return bl+(o-bpx)/(outLen-2.*bpx)*(texLen-2.*bl);
}
void main(){
  vec2 o=vec2(gl_FragCoord.x,outRes.y-gl_FragCoord.y);
  vec2 n=o/outRes*2.-1.;
  vec2 s=n*(1.+${C64_TUBE_BULGE}*dot(n,n));
  if(abs(s.x)>1.||abs(s.y)>1.){gl_FragColor=vec4(0.,0.,0.,1.);return;}
  o=(s*.5+.5)*outRes;
  vec2 texRes=vec2(${C64_TEX_W}.,${C64_TEX_H}.);
  vec2 u=vec2(mapAxis(o.x,outRes.x,texRes.x,${C64_BORDER_X}.),mapAxis(o.y,outRes.y,texRes.y,${C64_BORDER_Y}.));
  vec2 f=(floor(u)+.5)/texRes;
  gl_FragColor=texture2D(tex,vec2(f.x,1.-f.y));
}`;
export const C64_BANDS = 40;

export const c64Presets = ['Raster bars', 'Sprite multiplex', 'Char plasma', 'SID spectrum', 'Rotozoom', 'Tunnel', 'Scope', 'Outrun', 'Open borders', 'DYCP scroller', 'FLD plasma', 'FLI picture', 'Linecrunch', 'Chess zoomer', 'AFLI plasma', 'Dot plotter', 'Parallax floor', 'Shadow cube', 'Rotating bars', 'Zoomscroll', 'Stick dancer', 'Noisefader', 'Chips DNA', 'Circle scroll', 'Balloons', 'Piano roll', 'Ghostbytes', 'Marchers', 'Phyllotaxis', 'Big sprites'];
export const c64PresetKeys = ['raster-bars', 'sprite-multiplex', 'char-plasma', 'sid-spectrum', 'rotozoom', 'tunnel', 'scope', 'outrun', 'open-borders', 'dycp', 'fld', 'fli', 'linecrunch', 'chess-zoomer', 'afli-plasma', 'dot-plotter', 'parallax-floor', 'shadow-cube', 'rotating-bars', 'zoomscroll', 'stick-dancer', 'noisefader', 'chips-dna', 'circle-scroll', 'balloons', 'piano-roll', 'ghostbytes', 'marchers', 'phyllotaxis', 'big-sprites'];
// What a PAL C64 could manage: 50 frames a second for raster and sprite work, every second frame for full-screen
// bitmap and char effects, every third frame for the chunky rotozoomer and tunnel.
export const C64_FPS = [50, 50, 25, 50, 16.7, 16.7, 25, 25, 50, 50, 50, 25, 50, 25, 25, 25, 50, 16.7, 50, 50, 25, 25, 50, 25, 50, 50, 50, 50, 25, 50];

// The C64 character ROM shapes (uppercase set) that the scrollers draw, as an 8-pixel-high atlas texture, plus the text as a
// row of glyph numbers. The text is whatever the scrollers should say: the tune's name and an optional message.
const GLYPH_CHARS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!"#$%&\'()*+,-./:;<=>?@';
const GLYPH_ROWS: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0x18, 0x3c, 0x66, 0x7e, 0x66, 0x66, 0x66, 0], [0x7c, 0x66, 0x66, 0x7c, 0x66, 0x66, 0x7c, 0], [0x3c, 0x66, 0x60, 0x60, 0x60, 0x66, 0x3c, 0],
  [0x78, 0x6c, 0x66, 0x66, 0x66, 0x6c, 0x78, 0], [0x7e, 0x60, 0x60, 0x78, 0x60, 0x60, 0x7e, 0], [0x7e, 0x60, 0x60, 0x78, 0x60, 0x60, 0x60, 0],
  [0x3c, 0x66, 0x60, 0x6e, 0x66, 0x66, 0x3c, 0], [0x66, 0x66, 0x66, 0x7e, 0x66, 0x66, 0x66, 0], [0x3c, 0x18, 0x18, 0x18, 0x18, 0x18, 0x3c, 0],
  [0x1e, 0x0c, 0x0c, 0x0c, 0x0c, 0x6c, 0x38, 0], [0x66, 0x6c, 0x78, 0x70, 0x78, 0x6c, 0x66, 0], [0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x7e, 0],
  [0x63, 0x77, 0x7f, 0x6b, 0x63, 0x63, 0x63, 0], [0x66, 0x76, 0x7e, 0x7e, 0x6e, 0x66, 0x66, 0], [0x3c, 0x66, 0x66, 0x66, 0x66, 0x66, 0x3c, 0],
  [0x7c, 0x66, 0x66, 0x7c, 0x60, 0x60, 0x60, 0], [0x3c, 0x66, 0x66, 0x66, 0x66, 0x3c, 0x0e, 0], [0x7c, 0x66, 0x66, 0x7c, 0x78, 0x6c, 0x66, 0],
  [0x3c, 0x66, 0x60, 0x3c, 0x06, 0x66, 0x3c, 0], [0x7e, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0], [0x66, 0x66, 0x66, 0x66, 0x66, 0x66, 0x3c, 0],
  [0x66, 0x66, 0x66, 0x66, 0x66, 0x3c, 0x18, 0], [0x63, 0x63, 0x63, 0x6b, 0x7f, 0x77, 0x63, 0], [0x66, 0x66, 0x3c, 0x18, 0x3c, 0x66, 0x66, 0],
  [0x66, 0x66, 0x66, 0x3c, 0x18, 0x18, 0x18, 0], [0x7e, 0x06, 0x0c, 0x18, 0x30, 0x60, 0x7e, 0],
  [0x3c, 0x66, 0x6e, 0x76, 0x66, 0x66, 0x3c, 0], [0x18, 0x18, 0x38, 0x18, 0x18, 0x18, 0x7e, 0], [0x3c, 0x66, 0x06, 0x0c, 0x30, 0x60, 0x7e, 0],
  [0x3c, 0x66, 0x06, 0x1c, 0x06, 0x66, 0x3c, 0], [0x06, 0x0e, 0x1e, 0x66, 0x7f, 0x06, 0x06, 0], [0x7e, 0x60, 0x7c, 0x06, 0x06, 0x66, 0x3c, 0],
  [0x3c, 0x66, 0x60, 0x7c, 0x66, 0x66, 0x3c, 0], [0x7e, 0x66, 0x0c, 0x18, 0x18, 0x18, 0x18, 0], [0x3c, 0x66, 0x66, 0x3c, 0x66, 0x66, 0x3c, 0],
  [0x3c, 0x66, 0x66, 0x3e, 0x06, 0x66, 0x3c, 0],
  [0x18, 0x18, 0x18, 0x18, 0, 0, 0x18, 0], [0x66, 0x66, 0x66, 0, 0, 0, 0, 0], [0x66, 0x66, 0xff, 0x66, 0xff, 0x66, 0x66, 0],
  [0x18, 0x3e, 0x60, 0x3c, 0x06, 0x7c, 0x18, 0], [0x62, 0x66, 0x0c, 0x18, 0x30, 0x66, 0x46, 0], [0x3c, 0x66, 0x3c, 0x38, 0x67, 0x66, 0x3f, 0],
  [0x06, 0x0c, 0x18, 0, 0, 0, 0, 0], [0x0c, 0x18, 0x30, 0x30, 0x30, 0x18, 0x0c, 0], [0x30, 0x18, 0x0c, 0x0c, 0x0c, 0x18, 0x30, 0],
  [0, 0x66, 0x3c, 0xff, 0x3c, 0x66, 0, 0], [0, 0x18, 0x18, 0x7e, 0x18, 0x18, 0, 0], [0, 0, 0, 0, 0, 0x18, 0x18, 0x30],
  [0, 0, 0, 0x7e, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0x18, 0x18, 0], [0, 0x03, 0x06, 0x0c, 0x18, 0x30, 0x60, 0],
  [0, 0, 0x18, 0, 0, 0x18, 0, 0], [0, 0, 0x18, 0, 0, 0x18, 0x18, 0x30], [0x0e, 0x18, 0x30, 0x60, 0x30, 0x18, 0x0e, 0],
  [0, 0, 0x7e, 0, 0x7e, 0, 0, 0], [0x70, 0x18, 0x0c, 0x06, 0x0c, 0x18, 0x70, 0], [0x3c, 0x66, 0x06, 0x0c, 0x18, 0, 0x18, 0],
  [0x3c, 0x66, 0x6e, 0x6e, 0x60, 0x62, 0x3c, 0],
];
export const C64_ATLAS_W = GLYPH_CHARS.length * 8;
export const C64_ATLAS = new Uint8Array(C64_ATLAS_W * 8);
GLYPH_ROWS.forEach((rows, g) => {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) C64_ATLAS[r * C64_ATLAS_W + g * 8 + c] = (rows[r] >> (7 - c)) & 1 ? 255 : 0;
});
export const C64_SCROLL_MAX = 512;
export const C64_SCREEN_COLS = 40;
export const C64_SCREEN_ROWS = 25;
/** A 40x25 text screen as glyph numbers, one byte per character cell. */
export function encodeScreen(rows: string[]): Uint8Array {
  const out = new Uint8Array(C64_SCREEN_COLS * C64_SCREEN_ROWS);
  for (let r = 0; r < Math.min(rows.length, C64_SCREEN_ROWS); r++) {
    let line = rows[r].toUpperCase();
    const rev = line[0] === '\u0001';
    if (rev) line = line.slice(1).padEnd(C64_SCREEN_COLS, ' ');
    for (let c = 0; c < Math.min(line.length, C64_SCREEN_COLS); c++) out[r * C64_SCREEN_COLS + c] = Math.max(0, GLYPH_CHARS.indexOf(line[c])) + (rev ? 64 : 0);
  }
  return out;
}
export const C64_BOOT_ROWS = ['', '    **** CHIPBLASTER 64 BASIC V2 ****', '', ' 64K RAM SYSTEM  38911 BASIC BYTES FREE', '', 'READY.', ''];
/**
 * The screen while the next effect "loads from the built-in drive": the LOAD command is typed, the drive searches and loads
 * (the border stripes for a moment), READY. comes back and RUN is typed. `fromBoot` keeps the start-up text above the command.
 */
/** When the drive starts looking, starts loading and is done, in seconds from the moment the LOAD command begins to be typed. */
export function loadTimes(name: string): { search: number; load: number; ready: number } {
  const nm = name.toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 22);
  const search = 0.15 + ('LOAD"' + nm + '",8,1').length * 0.03 + 0.2;
  return { search, load: search + 0.45, ready: search + 1.05 };
}
export function loadScreen(t: number, name: string, fromBoot: boolean): { rows: string[]; cx: number; cy: number; load: number; done: boolean } {
  const rows = fromBoot ? C64_BOOT_ROWS.slice(0, 6) : ['READY.'];
  const nm = name.toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 22);
  const cmd = 'LOAD"' + nm + '",8,1';
  const typeAt = 0.15, per = 0.03;
  const typed = Math.max(0, Math.min(cmd.length, Math.floor((t - typeAt) / per)));
  const { search: tSearch, load: tLoad, ready: tReady } = loadTimes(name);
  rows.push(cmd.slice(0, typed));
  let cx = typed, load = 0;
  if (t >= tSearch) {
    rows.push('', 'SEARCHING FOR ' + nm);
    if (t >= tLoad) rows.push('LOADING');
    if (t >= tLoad && t < tReady) load = 1;
    if (t >= tReady) {
      rows.push('READY.', '');
      const n = Math.max(0, Math.min(3, Math.floor((t - tReady - 0.15) / 0.07)));
      rows[rows.length - 1] = 'RUN'.slice(0, n);
      cx = n;
    } else { rows.push(''); cx = 0; }
  }
  return { rows, cx, cy: rows.length - 1, load, done: t >= tReady + 0.7 };
}
/** The start of a scroll through the effects: LOAD"$",8, the drive reads the directory, LIST. */
export const DIR_TIMES = (() => { const search = 0.05 + 'LOAD"$",8'.length * 0.03 + 0.12; return { search, load: search + 0.15, ready: search + 0.45 }; })();
export function dirIntro(t: number, fromBoot: boolean): { rows: string[]; cx: number; cy: number; load: number; done: boolean } {
  const rows = fromBoot ? C64_BOOT_ROWS.slice(0, 6) : ['READY.'];
  const cmd = 'LOAD"$",8';
  const typed = Math.max(0, Math.min(cmd.length, Math.floor((t - 0.05) / 0.03)));
  const tS = DIR_TIMES.search, tL = DIR_TIMES.load, tR = DIR_TIMES.ready;
  rows.push(cmd.slice(0, typed));
  let cx = typed, load = 0;
  if (t >= tS) {
    rows.push('', 'SEARCHING FOR $');
    if (t >= tL) rows.push('LOADING');
    if (t >= tL && t < tR) load = 1;
    if (t >= tR) {
      rows.push('READY.', '');
      const n = Math.max(0, Math.min(4, Math.floor((t - tR - 0.08) / 0.05)));
      rows[rows.length - 1] = 'LIST'.slice(0, n);
      cx = n;
    } else { rows.push(''); cx = 0; }
  }
  return { rows, cx, cy: rows.length - 1, load, done: t >= tR + 0.35 };
}
/** The directory of the effects, as LIST would print it; the chosen one is in reverse video. */
export function dirScreen(sel: number): { rows: string[]; cx: number; cy: number; load: number; done: boolean } {
  const n = c64Presets.length, vis = 22;
  const start = Math.max(0, Math.min(n - vis, sel - 10));
  const rows = ['\u00010 "CHIPBLASTER 64   " CB 2A'];
  for (let i = start; i < Math.min(n, start + vis); i++) {
    const blk = String(2 + ((i * 37 + 11) % 48)).padEnd(5);
    const nm = c64Presets[i].toUpperCase().replace(/[^A-Z0-9 ]/g, '').padEnd(16);
    rows.push((i === sel ? '\u0001' : '') + blk + '"' + nm + '" PRG');
  }
  if (start + vis >= n) rows.push('664 BLOCKS FREE.');
  return { rows, cx: 0, cy: 24, load: 0, done: false };
}
/** Text to glyph numbers: uppercase, accents stripped, anything the C64 set lacks becomes a space. */
export function encodeScroll(text: string): { data: Uint8Array; len: number } {
  const clean = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').replace(/æ/gi, 'ae').replace(/ø/gi, 'o').toUpperCase().slice(0, C64_SCROLL_MAX);
  const data = new Uint8Array(C64_SCROLL_MAX);
  const len = Math.max(1, clean.length);
  for (let i = 0; i < clean.length; i++) data[i] = Math.max(0, GLYPH_CHARS.indexOf(clean[i]));
  return { data, len };
}
/** Three numbers in 0..1 from any string (the tune's name or path): they vary phases, palettes and speeds per tune. */
export function seedFrom(text: string): [number, number, number] {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  const f = (x: number) => ((Math.imul(x ^ (x >>> 15), 2246822519) >>> 0) % 10007) / 10007;
  return [f(h), f(h + 1013), f(h + 2027)];
}


export const C64_FRAGMENT = `precision highp float;
uniform vec2 res;
uniform float time, vtime, bass, mids, treble, mode;
uniform float spec[40];
uniform float peaks[40];
uniform float vl[6];
uniform float vw[6];
uniform float vp[6];
uniform sampler2D hist;
uniform float histHead;
uniform sampler2D scrTex;
uniform vec3 scrCur;
uniform float scrLoad;
uniform sampler2D fontTex;
uniform sampler2D msgTex;
uniform float msgLen;
uniform vec3 seed;
float gSet=0.;
#define PI 3.14159265
vec3 pc(float i){
  i=floor(i+.5);
  if(i<.5)return vec3(0.);
  if(i<1.5)return vec3(1.);
  if(i<2.5)return vec3(.408,.216,.169);
  if(i<3.5)return vec3(.439,.643,.698);
  if(i<4.5)return vec3(.435,.239,.525);
  if(i<5.5)return vec3(.345,.553,.263);
  if(i<6.5)return vec3(.208,.157,.475);
  if(i<7.5)return vec3(.722,.780,.435);
  if(i<8.5)return vec3(.435,.310,.145);
  if(i<9.5)return vec3(.263,.224,0.);
  if(i<10.5)return vec3(.604,.404,.349);
  if(i<11.5)return vec3(.267);
  if(i<12.5)return vec3(.424);
  if(i<13.5)return vec3(.604,.824,.518);
  if(i<14.5)return vec3(.424,.369,.710);
  return vec3(.584);
}
float hash(float n){return fract(sin(n*127.1)*43758.5453);}
float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float rampIdx(float set,float v){
  float s=clamp(floor(v*6.),0.,5.);
  float k=floor(mod(set+gSet,4.)+.5);
  if(k<.5){if(s<.5)return 0.;if(s<1.5)return 6.;if(s<2.5)return 14.;if(s<3.5)return 3.;if(s<4.5)return 15.;return 1.;}
  if(k<1.5){if(s<.5)return 0.;if(s<1.5)return 9.;if(s<2.5)return 2.;if(s<3.5)return 8.;if(s<4.5)return 7.;return 1.;}
  if(k<2.5){if(s<.5)return 0.;if(s<1.5)return 11.;if(s<2.5)return 5.;if(s<3.5)return 13.;if(s<4.5)return 7.;return 1.;}
  if(s<.5)return 0.;if(s<1.5)return 6.;if(s<2.5)return 4.;if(s<3.5)return 10.;if(s<4.5)return 7.;return 1.;
}
float spriteCol(float k){
  k=mod(k+floor(seed.y*8.),8.);
  if(k<.5)return 10.;if(k<1.5)return 7.;if(k<2.5)return 13.;if(k<3.5)return 3.;
  if(k<4.5)return 4.;if(k<5.5)return 14.;if(k<6.5)return 15.;return 8.;
}
float spriteDark(float k){
  k=mod(k+floor(seed.y*8.),8.);
  if(k<.5)return 2.;if(k<1.5)return 8.;if(k<2.5)return 5.;if(k<3.5)return 6.;
  if(k<4.5)return 6.;if(k<5.5)return 6.;if(k<6.5)return 11.;return 9.;
}
float flashCol(float n){
  n=mod(n,5.);
  if(n<.5)return 1.;if(n<1.5)return 7.;if(n<2.5)return 3.;if(n<3.5)return 13.;return 10.;
}
float bay2(float a,float b){return mod(a*2.+b*3.,4.);}
// SID voices: vl is each voice's level (0..1, SID 1 voices 0-2, SID 2 voices 3-5), vw its waveform: 0 none, 1 triangle, 2 saw, 3 pulse, 4 noise.
float vlv(float j){
  j=mod(floor(j+.5),6.);
  if(j<.5)return vl[0];if(j<1.5)return vl[1];if(j<2.5)return vl[2];if(j<3.5)return vl[3];if(j<4.5)return vl[4];return vl[5];
}
float vwv(float j){
  j=mod(floor(j+.5),6.);
  if(j<.5)return vw[0];if(j<1.5)return vw[1];if(j<2.5)return vw[2];if(j<3.5)return vw[3];if(j<4.5)return vw[4];return vw[5];
}
float vpv(float j){
  j=mod(floor(j+.5),6.);
  float p;
  if(j<.5)p=vp[0];else if(j<1.5)p=vp[1];else if(j<2.5)p=vp[2];else if(j<3.5)p=vp[3];else if(j<4.5)p=vp[4];else p=vp[5];
  return p;
}
// The shape of a sprite follows the voice's waveform: round without data, diamond for triangle, wedge for saw, square for pulse, dithered disc for noise.
float shapeIn(vec2 q,float w,vec2 pix){
  if(w<.5)return step(length(q),1.);
  if(w<1.5)return step(abs(q.x)+abs(q.y),1.);
  if(w<2.5)return step(-1.,q.x)*step(q.x,1.)*step(abs(q.y),(q.x+1.)*.5);
  if(w<3.5)return step(max(abs(q.x),abs(q.y)),.9);
  return step(length(q),1.)*max(step(mod(floor(pix.x)+floor(pix.y),2.),.5),step(length(q),.5));
}
float bayer(vec2 p){vec2 q=mod(floor(p),4.);return (bay2(mod(q.x,2.),mod(q.y,2.))*4.+bay2(floor(q.x/2.),floor(q.y/2.))+.5)/16.;}
vec3 rotY(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(c*v.x+s*v.z,v.y,-s*v.x+c*v.z);}
vec3 rotX(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(v.x,c*v.y-s*v.z,s*v.y+c*v.z);}
float dseg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
// Scope: one trace per voice, in the voice's own waveform.
float scopeW(float x,float wv,float fv,float t){
  float p=x*(.012+.085*vpv(fv))+t*(.9+.37*fv);
  if(wv<.5)return sin(p*6.2831853);
  if(wv<1.5)return abs(fract(p)*4.-2.)-1.;
  if(wv<2.5)return fract(p)*2.-1.;
  if(wv<3.5)return fract(p)<.5+.25*sin(t*.8+fv)?1.:-1.;
  return hash(floor(x/2.)+floor(t*40.)*7.13+fv*31.)*2.-1.;
}
// Tension and release: a cycle of L seconds in which the energy builds slowly (0 to 1) and drops back at once.
float tens(float t,float L){
  float f=fract(t/L);
  return f<.82?(f/.82)*(f/.82):1.-smoothstep(.82,.95,f);
}
// A clock that runs faster when the tension is high: it is the integral of 1 + a * tens, so the phase never jumps. Multiplying t by
// a changing speed inside sin() would make the phase run away; this does not.
float tw(float t,float L,float a){
  float u=t/L,f=fract(u),w=clamp((f-.82)/.13,0.,1.);
  float F=f<.82?f*f*f/(3.*.82*.82):.27333+.13*(w-(w*w*w-.5*w*w*w*w));
  return t+a*L*(floor(u)*.33833+F);
}
// Stick dancer: how big and how the figure moves follows one voice. Pulse snaps between poses, saw hops, noise shakes.
float dancer(vec2 pp,float lv,float wv,float t,float fj,float pn){
  float A=(.35+.9*lv)*(.7+.6*tens(t,15.+fj*4.));
  float rate=fj<.5?4.2:(fj<1.5?6.6:3.0);
  float s6=tw(t,15.+fj*4.,.7)*rate+fj*1.7;
  if(wv>2.5&&wv<3.5)s6=floor(s6*1.4)/1.4;
  if(wv>3.5)s6+=hash(floor(t*14.)+fj*17.)*2.2;
  float sn=sin(s6),sh=sin(s6*.5);
  // Three different figures: 0 is a lanky disco dancer who points, 1 a stocky pumper who squats and jumps, 2 a tall swimmer who circles his arms and crosses his feet.
  float tor=fj<.5?36.:(fj<1.5?28.:46.);
  float shw=fj<.5?8.:(fj<1.5?14.:7.);
  float leg=fj<.5?25.:(fj<1.5?17.:22.);
  float jump=fj<1.5&&fj>.5?abs(sn)*(8.+lv*14.):((wv>1.5&&wv<2.5)?abs(sh)*lv*11.:0.);
  vec2 hip=vec2(sh*(fj<.5?9.:(fj<1.5?2.:5.))*A,-8.+sn*3.*A+jump-(fj>.5&&fj<1.5?6.:0.));
  vec2 neck=hip+vec2(sin(s6*.5+1.)*4.*A,tor);
  vec2 head=neck+vec2(sh*3.*A,11.);
  vec2 shL=neck+vec2(-shw,-3.),shR=neck+vec2(shw,-3.);
  float up=(pn-.45)*18.*lv;
  vec2 haL,haR;
  if(fj<.5){
    float r=step(0.,sh);
    haR=shR+vec2(11.+5.*sn,mix(-16.,22.+8.*A*sn,r)+up);
    haL=shL+vec2(-11.-5.*sn,mix(22.+8.*A*sn,-16.,r)+up);
  }else if(fj<1.5){
    float pu=4.+abs(sn)*26.*A+up;
    haL=shL+vec2(-9.,pu);haR=shR+vec2(9.,pu);
  }else{
    haL=shL+vec2(-6.+cos(s6)*15.*A,20.+sin(s6)*15.*A+up);
    haR=shR+vec2(6.+cos(s6+3.14)*15.*A,20.+sin(s6+3.14)*15.*A+up);
  }
  float kw=fj<1.5&&fj>.5?13.:9.;
  vec2 kL=hip+vec2(-kw,-leg+sn*3.*A),kR=hip+vec2(kw,-leg-sn*3.*A);
  vec2 fL,fR;
  if(fj<.5){
    fL=kL+vec2(-5.+sn*9.*A,-22.+max(0.,sn)*7.*A);fR=kR+vec2(5.+sin(s6+3.14)*9.*A,-22.+max(0.,sin(s6+3.14))*7.*A);
  }else if(fj<1.5){
    float sp=abs(sn);
    fL=kL+vec2(-3.-sp*8.*A,-15.);fR=kR+vec2(3.+sp*8.*A,-15.);
  }else{
    fL=kL+vec2(sh*16.*A,-22.+max(0.,sn)*5.);fR=kR+vec2(-sh*16.*A,-22.+max(0.,-sn)*5.);
  }
  float d=min(dseg(pp,hip,neck),dseg(pp,shL,shR));
  d=min(d,min(dseg(pp,shL,haL),dseg(pp,shR,haR)));
  d=min(d,min(dseg(pp,hip,kL),dseg(pp,hip,kR)));
  d=min(d,min(dseg(pp,kL,fL),dseg(pp,kR,fR)));
  vec2 hd=pp-head;
  if(fj<.5)d=min(d,abs(length(hd)-6.));
  else if(fj<1.5)d=min(d,abs(max(abs(hd.x),abs(hd.y))-6.));
  else d=min(d,abs(abs(hd.x)+abs(hd.y)-8.));
  return d;
}
float boxHit(vec3 o,vec3 d,vec3 h,out vec3 n){
  vec3 inv=1./d;vec3 t1=(-h-o)*inv,t2=(h-o)*inv;
  vec3 tn=min(t1,t2),tf=max(t1,t2);
  float tmin=max(max(tn.x,tn.y),tn.z),tmax=min(min(tf.x,tf.y),tf.z);
  n=vec3(0.);
  if(tmax<0.||tmin>tmax)return -1.;
  if(tmin>0.){
    if(tn.x>=tn.y&&tn.x>=tn.z)n=vec3(-sign(d.x),0.,0.);
    else if(tn.y>=tn.z)n=vec3(0.,-sign(d.y),0.);
    else n=vec3(0.,0.,-sign(d.z));
    return tmin;
  }
  return tmax;
}
float plasmaIdx(vec2 c,float t,float b,float m){
  vec2 cell=floor(c/8.),loc=mod(c,8.);
  float v=sin(cell.x*.33+t*1.2)+sin(cell.y*.45-t*.9)+sin((cell.x+cell.y)*.21+t*.7)+sin(length(cell-vec2(20.,12.))*.5-t*1.5-b*5.);
  v=v*.125+.5+b*.18+m*.1;
  float L=floor(clamp(v,0.,.999)*5.);
  float odd_x=step(1.,mod(loc.x,2.)),odd_y=step(1.,mod(loc.y,2.));
  float dots=(1.-odd_x)*(1.-odd_y);
  float on=0.;
  if(L>3.5)on=1.;else if(L>2.5)on=1.-dots;else if(L>1.5)on=step(1.,mod(loc.x+loc.y,2.));else if(L>.5)on=dots;
  float set=mod(floor(cell.x/10.)+floor(t*.15),4.);
  return on>.5?rampIdx(set,v+.18):0.;
}
// Offsets to the Fibonacci neighbours of a seed in a phyllotaxis: the nearest seeds always sit at these index distances.
float fibOff(int k){
  if(k==0)return 0.;if(k==1)return 1.;if(k==2)return -1.;if(k==3)return 2.;if(k==4)return -2.;if(k==5)return 3.;if(k==6)return -3.;
  if(k==7)return 5.;if(k==8)return -5.;if(k==9)return 8.;if(k==10)return -8.;if(k==11)return 13.;if(k==12)return -13.;
  if(k==13)return 21.;if(k==14)return -21.;if(k==15)return 34.;return -34.;
}
float specAtCell(float i){float l=0.;for(int k=0;k<40;k++){if(float(k)==i)l=spec[k];}return l;}
// An 8x8 walker with a two-frame walk cycle: head, eyes (drawn separately), body and feet.
float walkerBit(float row,float col,float frame){
  float by=60.;
  if(row<.5)by=60.;else if(row<1.5)by=126.;else if(row<2.5)by=126.;else if(row<3.5)by=126.;else if(row<4.5)by=60.;else if(row<5.5)by=126.;
  else if(row<6.5)by=frame<.5?36.:24.;else by=frame<.5?102.:24.;
  return mod(floor(by/exp2(7.-col)),2.);
}
// The bars shade like a VU meter, and by the row they reach, not by a share of the bar: green only at the bottom fifth, then light
// green, yellow, orange and red at the top, so a bar that is not at full height never looks all green.
float specColour(float row){
  return row<5.?5.:(row<10.?13.:(row<15.?7.:(row<20.?8.:10.)));
}
float specIdx(vec2 c){
  float colI=floor(c.x/8.),lev=0.,pk=0.;
  for(int i=0;i<40;i++){if(float(i)==colI){lev=spec[i];pk=peaks[i];}}
  float row=24.-floor(c.y/8.);
  float bar=step(row+.5,lev*25.);
  float isPeak=pk>.03?step(abs(row-floor(pk*25.)),.5):0.;
  float gap=max(step(7.,mod(c.y,8.)),step(7.,mod(c.x,8.)));
  float col=specColour(row);
  float o=gap>.5?0.:(isPeak>.5?1.:(bar>.5?col:0.));
  if(o<.5&&mod(c.x,8.)==4.&&mod(c.y,8.)==4.)o=11.;
  return o;
}
float glyphBit(float g,float gx,float gy){
  return texture2D(fontTex,vec2((g*8.+gx+.5)/${C64_ATLAS_W}.,(gy+.5)/8.)).r>.5?1.:0.;
}
float msgGlyph(float n){
  n=mod(n,msgLen);
  return floor(texture2D(msgTex,vec2((n+.5)/${C64_SCROLL_MAX}.,.5)).r*255.+.5);
}
// Slow smooth noise (0 to 1): parameters of an effect drift with it instead of staying fixed.
float vn(float x){float i=floor(x),f=fract(x);return mix(hash(i),hash(i+1.),f*f*(3.-2.*f));}
// DYCP: the way the letters ride up and down changes character every ten seconds or so.
float dycpWave(float n,float t,float k){
  if(k<.5)return sin(n*.42+t*1.5)*22.;
  if(k<1.5)return sin(n*.8+t*2.1)*16.+sin(n*.23+t*.7)*14.;
  if(k<2.5)return 18.-abs(sin(n*.3+t*1.1))*36.;
  return sin(t*1.3)*30.*sin(n*.18)+sin(n*.55-t*1.8)*6.;
}
// Dot plotter: eight bodies of 96 dots that it morphs between.
vec3 dotShape(float k,float i,float u,float t){
  float v2=u*6.2831853;
  if(k<.5){float phi=acos(1.-2.*u),th=i*2.3999632;return vec3(sin(phi)*cos(th),cos(phi),sin(phi)*sin(th))*.85;}
  if(k<1.5){float v1=v2*10.;return vec3((.62+.26*cos(v1))*cos(v2),.26*sin(v1),(.62+.26*cos(v1))*sin(v2));}
  if(k<2.5){float sn=sin(v2);return vec3(16.*sn*sn*sn,13.*cos(v2)-5.*cos(2.*v2)-2.*cos(3.*v2)-cos(4.*v2)+1.,sin(u*30.)*4.5)/17.;}
  if(k<3.5){float v=v2*3.+mod(i,2.)*3.14159;return vec3(cos(v)*.55,(u*2.-1.)*.95,sin(v)*.55);}
  if(k<4.5)return vec3(sin(v2)+2.*sin(2.*v2),cos(v2)-2.*cos(2.*v2),-sin(3.*v2))/3.3;
  if(k<5.5)return vec3(sin(3.*v2+1.57),sin(2.*v2),sin(5.*v2+.6))*.85;
  if(k<6.5){float r=sqrt(u)*.95,an=v2*7.;return vec3(r*cos(an),sin(u*40.+t*2.)*.12,r*sin(an));}
  float gx=mod(i,12.),gz=floor(i/12.);
  return vec3((gx/11.-.5)*1.8,sin(gx*.8+gz*.6+t*2.4)*.28,(gz/7.-.5)*1.8);
}
// Shadow cube: the block is a cube, a slab, a pillar or a bar.
vec3 blockSize(float k){
  if(k<.5)return vec3(.55);
  if(k<1.5)return vec3(.85,.22,.55);
  if(k<2.5)return vec3(.28,.8,.28);
  return vec3(.85,.28,.28);
}
vec3 toBox(vec3 v,float ang,float tilt){return rotX(rotY(v,-ang),-tilt);}
// Outrun: the ground rises and falls with distance (outHeight) and the road winds sideways (outBend).
float outHeight(float z,float t,float sp){
  return (sin(z*.55-sp*1.7)*.42+sin(z*.23-sp*.8)*.6)*smoothstep(.5,3.,z)*.92*(.55+.55*tens(t,29.));
}
float outBend(float z,float t){
  return (sin(z*.09-t*.32)*.9+sin(z*.23+t*.19)*.55)*z*z*1.5/(1.+z*.08);
}
// Big sprites: one 96x42 picture of a SID chip, cut into eight 24x21 sprite tiles (4 across, 2 down). Returns a palette index, or -1 where the picture is clear.
float chipBit(float u,float v,float t){
  float pin=floor((u-9.)/14.);
  if((v<5.||v>=37.)&&u>=9.&&pin<6.&&mod(u-9.,14.)<6.){
    if(v<5.)return vlv(pin)>.35?spriteCol(pin*2.+1.):15.;
    return mod(floor(t*8.),12.)==pin?1.:15.;
  }
  if(v>=5.&&v<37.&&u>=2.&&u<94.){
    if(length(vec2(u-2.,v-21.))<5.5)return 0.;
    if(u<4.||u>=92.||v<7.||v>=35.)return 12.;
    if(u>=12.&&u<84.&&v>=11.&&v<35.){
      float gu=floor((u-12.)/3.),gc=floor(gu/8.),gx=mod(gu,8.),gy=floor((v-11.)/3.);
      float g=gc<.5?19.:(gc<1.5?9.:4.);
      if(glyphBit(g,gx,gy)>.5)return flashCol(floor(t*3.)+gc);
      if(gx>=1.&&gy>=1.&&glyphBit(g,gx-1.,gy-1.)>.5)return 0.;
    }
    return 11.;
  }
  return -1.;
}
// Where tile i of the picture sits in formation k: 0 together as one picture, 1 pulled apart in a wave, 2 orbiting, 3 each on its own path.
vec2 bigForm(float k,float i,float t){
  float gi=mod(i,4.),gj=floor(i/4.);
  vec2 home=vec2(88.+gi*48.,78.+gj*42.);
  if(k<.5)return home+vec2(sin(t*.7)*50.,sin(t*1.1)*34.);
  if(k<1.5){float gap=36.*(.5+.5*sin(t*1.5));return home+vec2(sin(t*.7)*40.+sin(t*2.8+gi*.9)*10.,(gj*2.-1.)*gap+sin(t*2.6+gi*.8)*16.);}
  if(k<2.5){float a=t*.8+i*.7854,R=70.+34.*sin(t*.5);return vec2(160.+R*1.5*cos(a),99.+R*.8*sin(a));}
  return vec2(160.+sin(t*(.5+.07*i)+i)*150.,99.+sin(t*(.37+.05*i)+i*1.3)*90.);
}
// Returns a palette index for the pixel at p (top-left origin), border included.
float scene(vec2 p){
  float t=time*.8+seed.x*37.,b=bass,m=mids,h=treble;
  float x=floor(p.x),y=floor(p.y);
  vec2 org=floor((res-vec2(320.,200.))*.5);
  vec2 c=vec2(x,y)-org;
  bool inside=c.x>=0.&&c.x<320.&&c.y>=0.&&c.y<200.;
  float bidx=14.,idx=0.;
  float flash=step(.72,b);
  bool canFlash=true,openAll=false;
  float xm=floor(c.x/2.)*2.+1.;
  vec2 pm=vec2(xm-160.,c.y-100.)/100.;
  int md=int(floor(mode+.5));
  if(md==0){
    float o=0.,depth=-9.;
    for(int i=0;i<8;i++){
      float fi=float(i);
      float ph=t*(.8+fi*.11)+fi*.8;
      float cy=res.y*.5+sin(ph)*(res.y*.22+b*res.y*.2)+sin(t*.5+fi*1.7)*res.y*.065;
      float hh=9.+b*7.+m*3.;
      float d=abs(y-cy)/hh;
      if(d<1.){float z=cos(ph);if(z>depth){depth=z;o=rampIdx(fi,(1.-d)*1.12);}}
    }
    idx=o;bidx=o;canFlash=false;
  }else if(md==1){
    bidx=6.;
    idx=c.y>=100.?6.:0.;
    float spr=-1.;
    for(int i=0;i<16;i++){
      float fi=float(i);
      float band=floor(fi/8.);
      float k=mod(fi,8.);
      float vo=mod(fi,6.);
      float lv=.2+.8*vlv(vo),wv=vwv(vo);
      float ph=t*(.7+.09*k)+k*.85+band*2.1;
      float sz=floor(12.+lv*22.);
      float sx=floor(160.-sz+sin(ph)*(118.-sz*.6));
      float sy=floor(band*100.+3.+mix(.5+.5*sin(ph*1.31+k),1.-vpv(vo),.65)*(94.-sz*2.)-lv*6.);
      float px=c.x-sx,py=c.y-sy;
      if(spr<0.&&px>=0.&&px<sz*2.&&py>=0.&&py<sz*2.){
        vec2 q=vec2(floor(px)+.5-sz,floor(py)+.5-sz)/sz;
        float m1=shapeIn(q,wv,c);
        if(m1>.5){
          float m2=shapeIn(q/.7,wv,c);
          float hi=wv<.5?step(length(q-vec2(-.3,-.3)),.2):0.;
          spr=hi>.5?1.:(m2>.5?spriteCol(vo*2.+1.):spriteDark(vo*2.+1.));
        }
      }
    }
    if(spr>=0.)idx=spr;
  }else if(md==2){
    bidx=6.;
    idx=plasmaIdx(c,t,b,m);
  }else if(md==3){
    bidx=11.;
    idx=specIdx(c);
  }else if(md==4){
    bidx=0.;
    float q=tw(t,19.,1.)*.45+sin(t*.3)*.8;
    mat2 R=mat2(cos(q),-sin(q),sin(q),cos(q));
    float zoom=1.3+.7*sin(t*.55)+1.3*tens(t,19.)+b*.9;
    vec2 u=R*pm*zoom+vec2(t*.25,t*.17);
    float tex=.5+.5*sin(u.x*6.28)*sin(u.y*6.28);
    float chk=mod(floor(u.x)+floor(u.y),2.);
    float v=tex*.62+chk*.34+m*.14;
    vec2 cell=floor(c/16.);
    idx=rampIdx(cell.x+cell.y*2.,v*(.6+h*.5)+.08);
  }else if(md==5){
    // Tunnel: every 16 seconds the tube is something else: its section gets lobes, it leans round the corner, twists like a screw,
    // and its walls are stripes, a chequer or rings. The rush forward builds up and lets go.
    bidx=0.;
    float L=16.,sg=floor(t/L),sf=fract(t/L);
    float env=sin(3.14159*sf);
    float lobes=2.+floor(hash(sg+1.)*5.);
    float pat=mod(floor(hash(sg+4.)*3.),3.);
    float ab=2.+floor(hash(sg+3.)*3.)*2.;
    float tp=tw(t,L,1.2);
    float lean=.12+.3*tens(t,L);
    vec2 pq=pm-vec2(sin(t*.31)*lean*1.3,cos(t*.23)*lean);
    float a=atan(pq.y,pq.x);
    float r=length(pq)*(1.+.3*env*sin(a*lobes+tp*.7))+.001;
    float z=1./r;
    float tws=(hash(sg+7.)-.5)*3.*env;
    float fa=(a+z*tws*.25)*ab/6.2831853;
    float fz=z*.9-tp*1.1;
    float v=fract(z*.45+tp*.55+fa*.5);
    float stripe=step(.5,fract(fz+fa*.5));
    if(pat>.5&&pat<1.5)stripe=mod(floor(fz)+floor(fa),2.);
    else if(pat>1.5)stripe=step(.5,fract(fz));
    float fog=smoothstep(.04,.45,r);
    idx=rampIdx(floor(fa*4./ab)+sg,(v*.8+stripe*.2)*fog+b*.1);
  }else if(md==6){
    bidx=14.;
    idx=6.;
    if(mod(c.x,40.)==0.&&mod(c.y,25.)==0.)idx=14.;
    for(int j=0;j<3;j++){if(mod(c.x,4.)<1.&&abs(c.y-(36.+float(j)*64.))<.5)idx=14.;}
    for(int v=0;v<6;v++){
      float fv=float(v);
      float lv=vlv(fv),wv=vwv(fv);
      if(v>=3&&lv<.04)continue;
      float amp=5.+lv*24.;
      float cy=36.+mod(fv,3.)*64.;
      float y0=-scopeW(c.x-1.,wv,fv,t)*amp,y1=-scopeW(c.x,wv,fv,t)*amp,y2=-scopeW(c.x+1.,wv,fv,t)*amp;
      float lo=min(y0,min(y1,y2)),hi=max(y0,max(y1,y2));
      float yy=c.y-cy;
      float vc=v<3?spriteCol(fv*2.+1.):spriteDark(fv*2.+1.);
      if(yy>=lo-.5&&yy<=hi+.5)idx=v<3?1.:vc;
      else if(yy>=lo-2.5&&yy<=hi+2.5&&mod(c.x+c.y,2.)<1.)idx=vc;
    }
  }else if(md==8){
    // Open borders: the top, bottom and side borders are hacked away. Sprites fly through the border, the side
    // borders show idle-state garbage from $3fff, and the whole area shares one raster-split background.
    openAll=true;canFlash=false;
    idx=rampIdx(0.,pow(y/res.y,1.3)*.5+.06);
    if(inside){
      float colI=floor(c.x/8.),lev=0.,pk=0.;
      for(int i=0;i<40;i++){if(float(i)==colI){lev=spec[i];pk=peaks[i];}}
      float row=24.-floor(c.y/8.);
      float bar=step(row+.5,lev*25.);
      float isPeak=pk>.03?step(abs(row-floor(pk*25.)),.5):0.;
      float gap=max(step(7.,mod(c.y,8.)),step(7.,mod(c.x,8.)));
      float col=specColour(row);
      if(gap<.5){if(isPeak>.5)idx=1.;else if(bar>.5)idx=col;}
    }else if(c.x<0.||c.x>=320.){
      float rowN=floor(y/2.);
      float on=step(.55-b*.4,hash2(vec2(rowN,floor(t*5.))));
      if(mod(x,2.)<1.&&on>.5)idx=14.;
      if(mod(x,8.)<1.&&hash2(vec2(rowN,floor(t*2.)+7.))>.5)idx=3.;
    }
    float spr=-1.;
    for(int i=0;i<8;i++){
      float k=float(i);
      float ph=t*(.55+.07*k)+k*.8;
      float sx=floor(res.x*.5-24.+sin(ph)*(res.x*.5-26.));
      float sy=floor(res.y*.5-21.+sin(ph*1.27+k)*(res.y*.5-23.));
      float px=x-sx,py=y-sy;
      if(spr<0.&&px>=0.&&px<48.&&py>=0.&&py<42.){
        float u2=floor(px/4.),v=floor(py/2.);
        vec2 q=vec2((u2+.5-6.)*2.,v+.5-10.5)/10.5;
        float e=length(q),e2=length(q-vec2(-.3,-.3));
        if(e<1.){spr=e2<.28?1.:(e<.66?spriteCol(k):(e<.88?spriteDark(k):11.));}
      }
    }
    if(spr>=0.)idx=spr;
  }else if(md==9){
    // DYCP: every character column of the scroller has its own vertical position; letters take their colour from the raster line.
    // The scroll speeds up and slows down so there is time to read, and the wave changes its shape every ten seconds or so.
    bidx=0.;
    idx=mod(floor(c.y/6.),2.)<1.?rampIdx(0.,.1):0.;
    float sxo=25.5*t-41.35*cos(t*.37)-77.3*cos(t*.11+1.3);
    float sx=c.x+floor(sxo);
    float n=floor(sx/24.);
    float ph=t*.1,k0=floor(ph),fm=smoothstep(.88,1.,fract(ph));
    float kA=floor(hash(k0+seed.z*9.)*4.),kB=floor(hash(k0+1.+seed.z*9.)*4.);
    float swell=.75+.25*sin(t*.23)+b*.25;
    float dy=floor(mix(dycpWave(n,t,kA),dycpWave(n,t,kB),fm)*swell);
    float py=floor((c.y-(78.+dy))/3.),gx=floor(mod(sx,24.)/3.);
    if(py>=0.&&py<8.&&glyphBit(msgGlyph(n),gx,py)>.5)idx=rampIdx(floor(c.y/36.+t*.6),.45+.5*fract(c.y/36.));
  }else if(md==10){
    // FLD: the char rows are pushed down by delaying the bad lines; the top line is smeared over the gap.
    bidx=6.;
    float d=floor(b*64.+(.5+.5*sin(t*1.6))*28.);
    float sy=max(0.,c.y-d);
    idx=plasmaIdx(vec2(c.x,sy),t,b,m);
  }else if(md==11){
    // FLI: a new colour attribute on every raster line. The picture fills the whole screen (the FLI bug on the left is covered, the
    // border opened), so it is as big as the other full-screen effects instead of a small box in a black frame.
    openAll=true;canFlash=false;
    vec2 pp=vec2(x,y)-res*.5;
    float cx=floor(pp.x/2.)*2.+1.;
    float r=length(vec2(cx,pp.y)*vec2(1.,1.2));
    float a=atan(pp.y,cx);
    float v=.5+.5*sin(r*.075-t*2.2+sin(a*5.+t)*1.4)+b*.25;
    float set=floor(mod(y,8.)*.5+floor(r/40.)+floor(t*.8));
    idx=rampIdx(set,v*.95);
  }else if(md==12){
    // Linecrunch: raster lines are deleted and repeated, so the picture squeezes and stretches like a rubber sheet.
    bidx=11.;
    float sy=c.y+30.*sin(c.y*.034+t*1.8)+12.*sin(c.y*.09-t*2.7);
    idx=specIdx(vec2(c.x,clamp(sy,0.,199.)));
  }else if(md==13){
    // Chess zoomer (Edge of Disgrace): a chunky 4x4 board zooming in or out, with sprites waving over it, each stretched by its own
    // zoom. Every cycle is different: the board is made of squares, diamonds, long tiles or rings, turns at its own rate, zooms
    // in or out, as deep and as fast as it likes, and the sprites change shape and path.
    bidx=6.;
    float xm4=floor(c.x/4.)*4.+2.,ym4=floor(c.y/4.)*4.+2.;
    vec2 p4=vec2(xm4-160.,ym4-100.)/100.;
    float cyc=(t+9.*sin(t*.09))*.2,n=floor(cyc),fr0=fract(cyc);
    float dirn=hash(n+5.)>.5?1.:-1.;
    float fr=dirn>0.?pow(fr0,1.6):1.-pow(fr0,1.6);
    float variant=floor(hash(n+2.)*4.);
    float depth=1.2+hash(n+3.)*2.4;
    float z=exp2(fr*depth);
    float a=(hash(n+1.)-.5)*3.2*fr+sin(t*.37+n)*.5+(variant>.5&&variant<1.5?.785:0.);
    vec2 q=vec2(cos(a)*p4.x-sin(a)*p4.y,sin(a)*p4.x+cos(a)*p4.y)*2./z+vec2(t*.1,0.);
    if(variant>1.5&&variant<2.5)q=vec2(q.x*.45,q.y*1.4);
    if(variant>2.5)q=vec2(atan(p4.y,p4.x)/PI*4.+a,-log2(length(p4)+.03)*1.6-fr*depth*1.6*dirn);
    float chk=mod(floor(q.x)+floor(q.y),2.);
    float cs=floor(hash(n+11.)*4.);
    idx=chk>.5?rampIdx(cs,.6+.25*b):rampIdx(cs,.22+.1*hash(n+4.));
    float spr=-1.;
    for(int i=0;i<8;i++){
      float k=float(i);
      float sx=36.+k*34.,sy=100.+sin(t*(2.2+k*.17)+k*.75+sin(t*.31+k)*1.4)*(14.+54.*vn(t*.11+k*7.)),sz=1.+(.35+.5*vn(t*.09+k*3.))*sin(t*(1.6+k*.2)+k*.9);
      vec2 d=vec2(c.x-sx,c.y-sy);
      float shp=mod(k+n,3.);
      float e=shp<.5?length(d)/(11.*sz):(shp<1.5?(abs(d.x)+abs(d.y))/(14.*sz):max(abs(d.x),abs(d.y))/(10.*sz));
      if(spr<0.&&e<1.){spr=length(d+vec2(3.*sz))/(11.*sz)<.28?1.:(e<.7?spriteCol(k):spriteDark(k));}
    }
    if(spr>=0.)idx=spr;
  }else if(md==14){
    // AFLI plasma (Edge of Disgrace): a double-sine plasma in hires with a new colour pair every few raster lines.
    bidx=6.;
    float v=(sin(c.x*.045+sin(c.y*.05+t*1.1)*2.)+sin(c.y*.07+sin(c.x*.03-t)*2.)+sin((c.x+c.y)*.03+t*.7))/6.+.5+b*.15;
    v+=(bayer(c)-.5)*.3;
    idx=rampIdx(mod(floor(c.y/4.)+floor(c.x/80.),4.),v);
  }else if(md==15){
    // Dot plotter (Edge of Disgrace): 96 dots morphing between eight bodies (sphere, torus, heart, double helix, trefoil knot,
    // Lissajous curve, spiral disc, rippling sheet). The order is irregular, and the turning and the size drift all the time.
    bidx=0.;idx=0.;
    float cyc=(t+11.*sin(t*.07))*.16,n=floor(cyc);
    float kA=floor(hash(n+seed.z*5.)*8.),kB=floor(hash(n+1.+seed.z*5.)*8.);
    if(abs(kA-kB)<.5)kB=mod(kA+1.+floor(hash(n+9.)*6.),8.);
    float f=smoothstep(.5,1.,fract(cyc));
    float a1=tw(t,17.,1.1)*.55+sin(t*.31)*1.1+sin(t*.13+1.)*.8,a2=.5+sin(t*.4)*.45+sin(t*.17)*.3;
    float zoom=(205.+28.*sin(t*.23)+10.*sin(t*.61))*(.88+.2*tens(t,17.));
    float bestz=-9.;
    for(int i=0;i<96;i++){
      float fi=float(i),u=(fi+.5)/96.;
      vec3 pos=rotX(rotY(mix(dotShape(kA,fi,u,t),dotShape(kB,fi,u,t),f),a1),a2);
      float vo=mod(fi,3.);
      float lv=vlv(vo),wv=vwv(vo);
      float sc=1.+lv*.3;
      if(wv>2.5&&wv<3.5)sc=1.+step(.45,lv)*.3;
      pos*=sc;
      if(wv>3.5)pos+=vec3(hash(fi+floor(t*20.))-.5,hash(fi*1.7+floor(t*20.))-.5,0.)*.16*lv;
      vec2 sp=vec2(160.,100.)+vec2(pos.x,-pos.y)*zoom/(1.9-pos.z*.45);
      float d=length(c-sp);
      if(d<2.4+(pos.z+1.)*1.1+lv*1.8&&pos.z>bestz){bestz=pos.z;idx=pos.z>.35?1.:(pos.z>-.2?spriteCol(vo*2.+1.):spriteDark(vo*2.+1.));}
    }
  }else if(md==16){
    // Parallax floor (Coma Light 13): hill layers slide at different speeds above a floor of raster strips. Every strip scrolls
    // sideways at its own speed, the nearer the faster, so the ground has depth without a vanishing point or a road (that is Outrun).
    bidx=0.;
    float hor=104.;
    float tp=tw(t,19.,.9);
    if(c.y<hor){
      idx=rampIdx(2.,.1+.55*pow(c.y/hor,1.2));
      for(int l=0;l<4;l++){
        float fl=float(l);
        float xs=c.x+tp*(8.+fl*14.);
        float hh=hor-18.-fl*10.-(sin(xs*.026*(1.+fl*.35)+fl*2.)*(9.+fl*3.)+sin(xs*.011+fl)*8.);
        if(c.y>hh)idx=fl<.5?14.:(fl<1.5?6.:(fl<2.5?4.:11.));
      }
    }else{
      float ry=c.y-hor;
      float strip=floor(log(ry*.09+1.)/.1655);
      float sd=strip/13.;
      float sxs=c.x+tp*(10.+260.*sd*sd);
      float tw=5.+34.*sd;
      float tile=mod(floor(sxs/tw)+strip,2.);
      float edge=step(mod(sxs,tw),1.);
      idx=sd<.35?(tile>.5?9.:8.):(sd<.7?(tile>.5?8.:2.):(tile>.5?2.:10.));
      if(edge>.5&&sd>.2)idx=7.;
      if(c.y<hor+2.)idx=0.;
    }
  }else if(md==17){
    // Shadow cube (Coma Light 13): a flat-shaded block casting a real-time shadow on a chessboard floor. The block turns and
    // tumbles at a changing rate, hops, wanders, swells with the bass and morphs between a cube, a slab, a pillar and a bar while
    // the light circles above it.
    bidx=6.;
    vec2 uv=vec2(c.x-160.,100.-c.y)/100.;
    vec3 ro=vec3(0.,1.4,-3.3),rd=normalize(vec3(uv.x*.8,uv.y*.8-.3,1.));
    float ph=t*.16,n=floor(ph),fm=smoothstep(.7,1.,fract(ph));
    vec3 hb=mix(blockSize(mod(n,4.)),blockSize(mod(n+1.,4.)),fm)*(1.+b*.12);
    float ang=t*.55+sin(t*.4)*1.3,tilt=sin(t*.31)*.55;
    float hop=.5*abs(sin(t*1.3))*(.4+.6*vn(t*.2));
    vec3 cc=vec3(sin(t*.17)*.5,length(hb)+hop*.6,cos(t*.13)*.4);
    vec3 L=normalize(vec3(sin(t*.21)*.9,1.,cos(t*.21)*.7-.2));
    vec3 n1;
    float tb=boxHit(toBox(ro-cc,ang,tilt),toBox(rd,ang,tilt),hb,n1);
    float tf=rd.y<-.001?(-ro.y/rd.y):-1.;
    idx=rampIdx(0.,.2+uv.y*.2);
    if(tb>0.&&(tf<0.||tb<tf)){
      vec3 nw=rotY(rotX(n1,tilt),ang);
      float lit=clamp(dot(nw,L),0.,1.);
      idx=rampIdx(1.,.25+.7*lit+(bayer(c)-.5)*.14);
    }else if(tf>0.){
      vec3 P=ro+rd*tf;
      vec3 n2;
      float ts=boxHit(toBox(P+L*.002-cc,ang,tilt),toBox(L,ang,tilt),hb,n2);
      float chk=mod(floor(P.x*1.2)+floor(P.z*1.2),2.);
      float base=chk>.5?.62:.42;
      if(ts>0.)base*=.45;
      base=base*(1.-.06*length(P.xz))+(bayer(c)-.5)*.14;
      idx=rampIdx(0.,base+.1);
    }
  }else if(md==18){
    // Rotating raster bars (Uncensored): bars that turn through 360 degrees, across the border as well. The turn hesitates and
    // reverses, the bars fan out and fold together again, their number, width and swing keep changing, and their colours shift.
    openAll=true;canFlash=false;
    vec2 pp=vec2(x,y)-res*.5;
    float rot=t*.4+sin(t*.29)*1.4+sin(t*.11)*.8;
    float fan=(.5+.5*sin(t*.21))*.5;
    float cnt=4.+floor(4.*vn(t*.1+3.));
    float swing=res.y*(.22+.14*sin(t*.13)),space=.9+.5*sin(t*.07);
    float o=0.,depth=-9.;
    for(int i=0;i<8;i++){
      float fi=float(i);
      if(fi>=cnt)continue;
      float ai=rot+(fi-3.5)*fan;
      vec2 nrm=vec2(cos(ai),sin(ai));
      float ph=t*.8+fi*space;
      float off=sin(ph)*swing,zz=cos(ph);
      float hh=(7.+b*6.+4.*sin(t*.5+fi*1.3))*(.7+.6*vn(t*.2+fi*3.7));
      float d=abs(dot(pp,nrm)-off)/hh;
      if(d<1.&&zz>depth){depth=zz;o=rampIdx(fi+floor(t*.05),(1.-d)*1.12);}
    }
    idx=o;
  }else if(md==19){
    // Zoomscroll (Uncensored): one line of text scrolls steadily across the whole picture, borders included, while the zoom breathes: it
    // closes in slowly on a few big letters, then drops back out so the whole line can be read.
    openAll=true;canFlash=false;
    vec2 pp=vec2(x,y)-res*.5;
    float zoom=3.2+3.8*tens(t,17.)+b*.35;
    float pos=tw(t,17.,-.35)*2.4;
    float wx=pp.x/zoom+pos*8.;
    float wy=pp.y/zoom+4.+sin(t*.6)*1.4;
    float n=floor(wx/8.);
    idx=rampIdx(0.,.08+.1*mod(floor(y/4.),2.));
    float g=msgGlyph(n);
    float gx=floor(mod(wx,8.)),gy=floor(wy);
    if(gy>=0.&&gy<8.){
      if(glyphBit(g,gx,gy)>.5)idx=rampIdx(floor(n/6.),.5+.45*fract(y/24.+t*.4));
      else if(gx>=1.&&gy>=1.&&glyphBit(g,gx-1.,gy-1.)>.5)idx=0.;
    }
  }else if(md==20){
    // Stick dancer (Comaland): a zoomed vector stick figure dancing to the bass.
    bidx=6.;
    idx=mod(floor(c.y/4.),2.)<1.?rampIdx(0.,.07):0.;
    float bestd=99.,who=0.;
    for(int j=0;j<3;j++){
      float fj=float(j);
      float lv=vlv(fj),wv=vwv(fj);
      float zm=(.62+lv*.16)*(fj>.5&&fj<1.5?1.08:.94);
      vec2 pp=vec2(c.x-160.-(fj-1.)*104.,112.-c.y)/zm;
      float d=dancer(pp,lv,wv,t,fj,vpv(fj))*zm;
      if(d<bestd){bestd=d;who=fj;}
    }
    if(bestd<1.4)idx=1.;else if(bestd<3.2&&bayer(c)<.5)idx=spriteCol(who*2.+1.);
  }else if(md==21){
    // Noisefader (Next Level): two effects dissolve into each other through a pixel noise threshold.
    bidx=11.;
    float prog=smoothstep(0.,1.,.5+.65*sin(t*.55));
    idx=hash2(floor(c)+7.)<prog?specIdx(c):plasmaIdx(c,t,b,m);
  }else if(md==22){
    // Chips DNA (Viva Las Vegas): a double helix with cross rungs, shaded by depth. The twist, the width, the sway and the rung spacing
    // drift on their own, a third strand fades in and out, and the colours change with every cycle.
    bidx=0.;idx=0.;
    float tp=tw(t,21.,.9);
    float kx=.028+.034*vn(t*.06+2.);
    float amp=(30.+34.*vn(t*.08+5.)+b*12.)*(.8+.3*tens(t,21.));
    float cy=100.+sin(c.x*.011+t*.4)*26.*vn(t*.05+11.);
    float ph=c.x*kx+tp*2.;
    float s1=sin(ph),s2=-s1,s3=sin(ph+1.57);
    float y1=cy+s1*amp,y2=cy+s2*amp,y3=cy+s3*amp*.8;
    float z1=cos(ph),z3=cos(ph+1.57);
    float sp=8.+8.*vn(t*.04+3.);
    float set=floor(t/21.);
    float w3=smoothstep(.5,.65,vn(t*.07+9.));
    if(w3>.01){
      float th3=(2.4+z3*1.2)*w3;
      if(abs(c.y-y3)<th3)idx=rampIdx(set+2.,.4+z3*.2);
    }
    if(mod(c.x,sp)<2.&&c.y>min(y1,y2)&&c.y<max(y1,y2))idx=rampIdx(set+2.,.35+.15*mod(floor(c.x/sp),3.));
    float d1=abs(c.y-y1),d2=abs(c.y-y2);
    float th1=3.+z1*1.6,th2=3.-z1*1.6;
    if(z1>0.){
      if(d2<th2)idx=rampIdx(set,.6-z1*.25);
      if(d1<th1)idx=rampIdx(set+1.,.6+z1*.3);
    }else{
      if(d1<th1)idx=rampIdx(set+1.,.6+z1*.3);
      if(d2<th2)idx=rampIdx(set,.6-z1*.25);
    }
  }else if(md==23){
    // Circle scroll (Viva Las Vegas): the scroll text runs round a circle.
    bidx=0.;idx=0.;
    vec2 pp=c-vec2(160.,100.);
    float r=length(pp),ang=atan(pp.y,pp.x)+t*.45;
    float R0=51.6;
    if(r>=R0&&r<R0+16.){
      float sc=mod(ang,6.2831853)*R0;
      float n=floor(sc/12.)+floor(t*2.);
      float gx=floor(mod(sc,12.)/1.5),gy=floor((R0+16.-r)/2.);
      if(glyphBit(msgGlyph(n),gx,gy)>.5)idx=rampIdx(floor(ang*1.3+t),.55+.4*sin(ang*3.));
    }
    // The inside changes its pattern every ten seconds: it shrinks away and the next one grows out of the middle.
    float stg=floor(t/10.),sf=fract(t/10.);
    float grow=smoothstep(0.,.12,sf)*smoothstep(1.,.88,sf)*(.65+.35*tens(t,10.));
    float rin=40.*grow,pk=floor(hash(stg+seed.z*7.)*5.);
    float ai=ang-t*.45+t*(.3+.2*sin(stg));
    if(r<rin){
      float on=0.;
      if(pk<.5)on=mod(floor(r/6.)+floor(ai*4.),2.)<1.&&mod(r,6.)<3.?1.:0.;
      else if(pk<1.5)on=mod(floor(ai*6./PI*1.)+floor(r/5.-t*2.),2.)<1.?1.:0.;
      else if(pk<2.5){float sd=3.+mod(stg,4.);float aa=mod(ai,6.2831853/sd)-3.1415926/sd;on=r*cos(aa)<rin*.75&&mod(r-t*12.,10.)<4.?1.:0.;}
      else if(pk<3.5)on=mod(floor(ai*3./PI+r*.12),2.)<1.?1.:0.;
      else on=abs(r-rin*.5-sin(t*3.+b*6.)*rin*.35)<3.5?1.:0.;
      if(on>.5)idx=rampIdx(2.+floor(stg),.3+.35*(r/40.)+b*.2);
    }
  }else if(md==24){
    // Balloons (The Hat): balloon sprites drifting upwards, each with its own speed and size.
    bidx=6.;
    idx=rampIdx(0.,.12+.4*(c.y/200.));
    float best=-1.;
    for(int i=0;i<12;i++){
      float k=float(i);
      float hs=hash(k+1.);
      float vo=mod(k,6.);
      float lv=vlv(vo),wv=vwv(vo);
      float bx=24.+hash(k+40.)*272.+sin(t*(.6+hs)+k)*10.;
      float by=mod(260.-(t*(14.+hs*26.)+hash(k+80.)*260.),260.)-30.-lv*14.;
      float rr=(9.+hash(k+120.)*9.)*(.8+.45*lv)*(1.12-.3*vpv(vo));
      vec2 d=vec2(c.x-bx,(c.y-by)/1.25);
      float e=length(d)/rr;
      if(best<0.){
        if(e<1.){
          float body=spriteCol(vo*2.+1.);
          float dk=spriteDark(vo*2.+1.);
          float shade=e<.7?body:dk;
          if(wv>.5&&wv<1.5&&mod(floor(abs(d.x)/3.)+floor(abs(d.y)/3.),2.)<1.&&e<.7)shade=dk;
          if(wv>1.5&&wv<2.5&&mod(floor((d.x+d.y)/3.),2.)<1.&&e<.7)shade=dk;
          if(wv>3.5&&mod(floor(c.x)+floor(c.y),2.)<1.)shade=dk;
          best=length(d/rr-vec2(-.3,-.3))<.25?1.:shade;
        }
        else if(abs(c.x-bx)<.6&&c.y>by+rr*1.25&&c.y<by+rr*1.25+28.)best=15.;
      }
    }
    if(best>=0.)idx=best;
  }else if(md==40){
    // The C64 text screen: blue paper, light blue ink and border, a blinking block cursor.
    bidx=14.;canFlash=false;idx=6.;
    if(inside){
      vec2 cell=floor(c/8.);
      float g=floor(texture2D(scrTex,vec2((cell.x+.5)/40.,(cell.y+.5)/25.)).r*255.+.5);
      float rv=step(63.5,g);g-=rv*64.;
      float bit=glyphBit(g,mod(c.x,8.),mod(c.y,8.));
      if(rv>.5)bit=1.-bit;
      if(bit>.5)idx=14.;
      if(cell.x==scrCur.x&&cell.y==scrCur.y&&scrCur.z>.5)idx=14.;
    }
    if(scrLoad>.5){float r=hash2(vec2(floor(c.y/5.),floor(vtime*14.)));bidx=r<.35?6.:14.;}
  }else if(md==26){
    // Ghostbytes (after No Sprites by Fairlight): only colour registers and the idle graphics byte, no characters, bitmap or sprites.
    // Each voice is a raster bar. The line splits at a point that follows the voice's pitch; right of the split the bar shows the ghost byte,
    // shifted by a per-line fine scroll. The byte follows the waveform.
    openAll=true;canFlash=false;
    idx=mod(floor(y/2.),2.)<1.?0.:rampIdx(0.,.05);
    for(int j=0;j<6;j++){
      float vo=float(j);
      float lv=vlv(vo),wv=vwv(vo),pv=vpv(vo);
      float yc=res.y*(.14+.72*fract(vo*.38197+.11))+sin(t*(.35+.13*vo)+vo*2.1)*(14.+34.*lv);
      float hh=12.+30.*lv;
      float d=abs(y-yc)/hh;
      if(d<1.){
        float shade=1.-d;
        float sx=res.x*.5+sin(y*(.045+.05*pv)+t*(.9+.25*vo))*res.x*(.18+.3*lv)+(pv-.5)*res.x*.3;
        if(x<sx){idx=rampIdx(vo,.25+.7*shade);}
        else{
          float scr=floor(sin(y*.09+vo*1.3+t*2.)*3.5+3.5)+floor(t*(8.+30.*pv)*(mod(vo,2.)*2.-1.));
          float px=mod(floor(x)+scr,8.);
          float bit;
          if(wv<.5)bit=step(4.,px);
          else if(wv<1.5)bit=mod(px,2.);
          else if(wv<2.5)bit=step(2.,mod(px,4.));
          else if(wv<3.5)bit=step(px,6.5);
          else bit=step(.5,hash2(vec2(floor(x/2.)+floor(t*20.),floor(y))));
          idx=bit>.5?spriteCol(vo*2.+1.):spriteDark(vo*2.+1.);
        }
      }
    }
  }else if(md==27){
    // Marchers (after Rodents in the Attic by Lft): a PETSCII cartoon. Six small walkers, one per voice, march in step on the spot while
    // rolling hills of text blocks scroll past under them; a faint skyline behind follows the spectrum. The march builds up and lets go.
    bidx=14.;
    idx=6.;
    if(inside){
      vec2 cell=floor(c/8.);
      float tp=tw(t,20.,.8);
      float scr=floor(tp*18.);
      if(hash2(cell+3.)>.965&&length(mod(c,8.)-3.5)<1.3)idx=14.;
      float sk=floor(specAtCell(floor(cell.x/3.)*3.+1.)*7.);
      if(cell.y>=22.-sk&&cell.y<22.&&mod(floor(c.x/8.),3.)<2.5)idx=mod(cell.y+floor(cell.x/3.),2.)<1.?0.:11.;
      float wcell=floor((c.x+scr)/8.);
      float g=3.+floor(2.4+2.*sin(wcell*.11+1.)+1.4*sin(wcell*.27));
      float topRow=25.-g;
      if(cell.y>=topRow){
        vec2 pxl=mod(c+vec2(scr,0.),8.);
        float chk=mod(floor(pxl.x/2.)+floor(pxl.y/2.),2.);
        idx=cell.y<topRow+1.?(chk>.5?5.:13.):(chk>.5?9.:11.);
      }
      for(int j=0;j<6;j++){
        float vo=float(j);
        float lv=vlv(vo);
        float x0=14.+vo*52.;
        float wc=floor((x0+8.+scr)/8.);
        float gt=(25.-(3.+floor(2.4+2.*sin(wc*.11+1.)+1.4*sin(wc*.27))))*8.;
        float hop=lv>.5?floor(9.*abs(sin(tp*9.42+vo))):0.;
        float py=floor(gt-24.-hop);
        vec2 p=vec2(c.x-x0,c.y-py)/3.; // triple size, so the walkers read on a phone
        if(p.x>=0.&&p.x<8.&&p.y>=0.&&p.y<8.){
          float col=floor(p.x);
          float row=floor(p.y);
          if(walkerBit(row,col,mod(floor(tp*3.+vo*.5),2.))>.5){
            idx=row<.5?spriteDark(vo*2.+1.):spriteCol(vo*2.+1.);
            if(row>1.5&&row<2.5&&(col==2.||col==5.))idx=1.;
          }
        }
      }
    }
  }else if(md==28){
    // Phyllotaxis (after the phyllotaxis LED display on jagi.studio): seed n sits at angle n * 137.5078 degrees and radius c * sqrt(n), which makes the
    // sunflower's spirals. Each seed belongs to one voice (n mod 6), so the spiral arms are the voices; a voice's level swells its seeds, its waveform
    // picks their shape, the spectrum widens the dots ring by ring (bass in the middle, treble at the rim) and the flower grows and shrinks.
    bidx=6.;idx=0.;
    vec2 p=vec2(c.x-160.,c.y-100.);
    float c0=6.,ga=2.39996323;
    float rot=t*.12+b*.12;
    float nVis=440.*(.4+.6*(.5+.5*sin(t*.25)));
    float r=length(p);
    float n0=floor((r/c0)*(r/c0)+.5);
    float L0=vlv(0.),L1=vlv(1.),L2=vlv(2.),L3=vlv(3.),L4=vlv(4.),L5=vlv(5.);
    float W0=vwv(0.),W1=vwv(1.),W2=vwv(2.),W3=vwv(3.),W4=vwv(4.),W5=vwv(5.);
    float sl=specAtCell(clamp(floor(r/(c0*sqrt(440.))*39.),0.,39.));
    float bestd=99.,bestn=-1.;
    for(int k=0;k<17;k++){
      float n=n0+fibOff(k);
      if(n<0.||n>=nVis)continue;
      float rr=c0*sqrt(n),ph=n*ga+rot;
      vec2 sp=rr*vec2(cos(ph),sin(ph));
      float vo=mod(n,6.);
      float lv=vo<.5?L0:(vo<1.5?L1:(vo<2.5?L2:(vo<3.5?L3:(vo<4.5?L4:L5))));
      float wv=vo<.5?W0:(vo<1.5?W1:(vo<2.5?W2:(vo<3.5?W3:(vo<4.5?W4:W5))));
      float dr=2.6+1.4*lv+sl*1.5;
      if(shapeIn((p-sp)/dr,lv>.03?wv:0.,p)>.5){
        float d=length(p-sp);
        if(d<bestd){bestd=d;bestn=n;}
      }
    }
    if(bestn>=0.){
      float vo=mod(bestn,6.);
      float lv=vo<.5?L0:(vo<1.5?L1:(vo<2.5?L2:(vo<3.5?L3:(vo<4.5?L4:L5))));
      float wave=.5+.5*sin(c0*sqrt(bestn)*.11-t*3.+vo*1.2);
      idx=(wave+lv*.8>.6)?spriteCol(vo*2.+1.):spriteDark(vo*2.+1.);
    }
  }else if(md==29){
    // Big sprites: all eight hardware sprites, each stretched to double size, carry one big picture of a SID chip. They sit together,
    // pull apart in a wave, orbit and wander off on their own, and every other section they fly back and snap into the picture
    // with a jolt. The pins on top light with the voices; a signal runs along the pins at the bottom; the letters change colour.
    openAll=true;canFlash=false;
    float ST=9.,sg=floor(t/ST),sf=fract(t/ST);
    float kA=mod(sg,2.)<.5?0.:1.+floor(hash(sg+seed.z*5.)*3.);
    float kB=mod(sg+1.,2.)<.5?0.:1.+floor(hash(sg+1.+seed.z*5.)*3.);
    float xq=clamp((sf-.72)/.28,0.,1.);
    float e=kB<.5?xq*xq*xq:xq*xq*(3.-2.*xq);
    float land=kA<.5?1.-smoothstep(0.,.1,sf):0.;
    idx=rampIdx(0.,.06+.12*(.5+.5*sin(y*.07+t*.8)));
    if(land>0.&&sf<.02)idx=rampIdx(1.,.6);
    float spr=-1.;
    for(int i=0;i<8;i++){
      float fi=float(i);
      vec2 pa=bigForm(kA,fi,t),pb=bigForm(kB,fi,t);
      vec2 shake=(vec2(hash(floor(t*50.)+fi),hash(floor(t*50.)+fi*3.+9.))-.5)*7.*land;
      vec2 ps=floor(mix(pa,pb,e)+shake);
      float px=x-ps.x,py=y-ps.y;
      if(spr<0.&&px>=0.&&px<48.&&py>=0.&&py<42.){
        float cv=chipBit(mod(fi,4.)*24.+floor(px/2.),floor(fi/4.)*21.+floor(py/2.),t);
        if(cv>-.5)spr=cv;
      }
    }
    if(spr>=0.)idx=spr;
  }else if(md==25){
    // Piano roll: every voice leaves a trail of its pitch (up is higher) that scrolls to the left; the trail is thicker when louder.
    bidx=0.;
    idx=mod(190.-c.y,30.)<1.&&mod(c.x,4.)<2.?11.:0.;
    float cx=floor(c.x/2.);
    float col=mod(histHead-(159.-cx)+320.,160.);
    float colP=mod(col+159.,160.);
    float age=159.-cx;
    for(int v=0;v<6;v++){
      float fv=float(v);
      vec4 h0=texture2D(hist,vec2((col+.5)/160.,(fv+.5)/6.));
      vec4 h1=texture2D(hist,vec2((colP+.5)/160.,(fv+.5)/6.));
      float l0=h0.g;
      if(l0<.05)continue;
      float wv=floor(h0.b*255./60.+.5);
      float y0=190.-h0.r*180.,y1=h1.g>.05?190.-h1.r*180.:y0;
      float lo=min(y0,y1),hi=max(y0,y1);
      float th=1.+l0*4.5;
      if(c.y>=lo-th&&c.y<=hi+th){
        float bright=age>110.?0.:1.;
        float vc=fv<3.?spriteCol(fv*2.+1.):spriteDark(fv*2.+1.);
        float body=bright>.5?vc:spriteDark(fv*2.+1.);
        if(wv>3.5&&mod(floor(c.x)+floor(c.y),2.)<1.)body=0.;
        if(wv>2.5&&wv<3.5&&abs(c.y-y0)>th*.6)body=spriteDark(fv*2.+1.);
        idx=(age<3.&&abs(c.y-y0)<th*.5)?1.:body;
      }
    }
  }else{
    // Outrun: the sun over the horizon and a road that winds left and right and rolls over hills, with striped kerbs and grass.
    bidx=0.;
    float hor=104.;
    if(c.y<hor){
      float v=pow(c.y/hor,1.25);
      idx=rampIdx(3.,v);
      vec2 sp=vec2(c.x-160.,c.y-(hor-34.-b*4.));
      float sr=40.+b*8.;
      if(length(sp)<sr){
        float vv=(sp.y+sr)/(2.*sr);
        float cut=sp.y>2.?step(mod(sp.y-floor(t*4.),8.),(sp.y/sr)*7.):0.;
        if(cut<.5)idx=vv<.4?7.:(vv<.7?10.:2.);
      }
    }else{
      // The road is drawn as 34 slices from near to far, each projected by the height of the ground there. A slice hidden behind the
      // crest of a hill in front of it is not drawn, so the road dips out of sight and reappears.
      float sp=tw(t,23.,.9);
      float D=sp*3.2;
      idx=1.;
      float clip=200.,z0=.5;
      float yb=hor+(1.-outHeight(z0,t,sp))*48./z0;
      for(int i=0;i<34;i++){
        float zi=.5*pow(1.1,float(i)),zn=zi*1.1;
        float yn=hor+(1.-outHeight(zn,t,sp))*48./zn;
        if(c.y>=yn&&c.y<min(yb,clip)){
          float cx=160.+outBend(zi,t)*12./zi;
          float ar=abs(c.x-cx);
          float par=mod(floor((zi+D)*.9),2.);
          float hw=27.6/zi;
          if(ar<hw){
            idx=par>.5?12.:11.;
            if(ar<max(1.,1.2/zi)&&mod(floor((zi+D)*1.6),2.)<1.)idx=1.;
          }else if(ar<hw*1.22){
            idx=par>.5?2.:1.;
          }else{
            idx=par>.5?5.:13.;
          }
          if(smoothstep(7.,15.,zi)>bayer(c))idx=1.;
          break;
        }
        clip=min(clip,yn);
        yb=yn;
      }
    }
  }
  if(canFlash&&flash>.5)bidx=flashCol(floor(time*14.));
  // The border carries a small meter per voice: bars grow from the middle of the bottom and top borders in the voice's colour.
  if(!inside&&!openAll&&md!=8&&md!=40){
    float bd=c.y>=200.?c.y-200.:(c.y<0.?c.y+20.:-1.);
    if(bd>=0.&&c.x>=0.&&c.x<320.){
      float row=floor(bd/6.);
      if(row<3.&&mod(bd,6.)>=1.&&mod(bd,6.)<5.){
        float lvb=vlv(row);
        if(abs(c.x-160.)<2.+lvb*154.)bidx=spriteCol(row*2.+1.);
      }
    }
  }
  return (inside||openAll)?idx:bidx;
}
void main(){
  gSet=floor(seed.y*4.);
  float x=floor(gl_FragCoord.x),y=res.y-1.-floor(gl_FragCoord.y);
  float b=bass,tt=vtime;
  float dx=0.,cs=0.;
  // The tube is clean most of the time: only a faint bass wobble, a barely visible hum bar and a little noise.
  dx+=floor(sin(y*.12+tt*9.)*b*.45+.5);
  // Rare small tick: a few scanlines flick sideways, about every 45 s.
  float e2=floor(tt/45.),l2=tt-e2*45.-hash(e2+9.)*40.;
  if(l2>=0.&&l2<.1){float y2=floor(hash(e2+4.)*(res.y-8.));if(y>=y2&&y<y2+3.)dx+=5.;}
  // Very rare real glitch, about every two and a half minutes: tearing bands, wide colour split, a flash and a burst of snow.
  float ev=floor(tt/150.),lt=tt-ev*150.-(4.+hash(ev+3.)*140.);
  float k=0.;
  if(lt>=0.&&lt<.55){
    k=1.-lt/.55;
    float step_=floor(lt*26.);
    for(int i=0;i<3;i++){
      float fi=float(i);
      float y0=floor(hash(ev*3.+fi*7.+step_)*(res.y-24.)),hh=6.+floor(hash(ev+fi+step_)*18.);
      if(y>=y0&&y<y0+hh)dx+=floor((hash2(vec2(y,step_+fi))-.5)*64.*k);
    }
    cs=floor(3.*k);
  }
  vec2 p=vec2(x+dx,y);
  vec3 col=vec3(pc(scene(p+vec2(cs,0.))).r,pc(scene(p)).g,pc(scene(p-vec2(cs,0.))).b);
  float yb=mod(tt*18.,res.y+80.)-40.;
  col*=1.+.03*(1.-smoothstep(0.,36.,abs(y-yb)))-.02;
  col+=(hash2(vec2(x,y)+floor(tt*60.))-.5)*(.015+.42*k*k);
  col+=.14*k;
  gl_FragColor=vec4(clamp(col,0.,1.),1.);
}`;
