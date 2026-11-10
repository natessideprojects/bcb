// Rink geometry for the sectioned bumper-car floor.
//
// The rules only care about section numbers. Each car colour has its own hidden
// route that weaves, crosses the others and loops between sections, so a move
// from section 3 to section 8 looks like real bumper-car chaos while landing in
// the right wedge. Coordinates are in the board's 1000 × 730 viewBox.

export type Pt = {x: number; y: number};
export type Lane = "main" | "mini";

export const CENTER: Pt = {x: 500, y: 386};
type Box = {hw: number; hh: number; r: number};
export const FLOOR: Box = {hw: 452, hh: 286, r: 168};     // inside the light ring
export const ISLAND: Box = {hw: 165, hh: 84, r: 70};       // centre island with the Rink Sign
export const MINI: Box = {hw: 218, hh: 128, r: 108};       // outer edge of the mini-track ("daddy path")

const TAU = Math.PI * 2;
const inside = (b: Box, x: number, y: number) => {
  const dx = Math.abs(x - CENTER.x), dy = Math.abs(y - CENTER.y);
  if (dx > b.hw || dy > b.hh) return false;
  if (dx <= b.hw - b.r || dy <= b.hh - b.r) return true;
  return (dx - (b.hw - b.r)) ** 2 + (dy - (b.hh - b.r)) ** 2 <= b.r * b.r;
};
const tables = new Map<Box, Float64Array>();
const SAMPLES = 1440;
function table(b: Box) {
  let t = tables.get(b);
  if (t) return t;
  t = new Float64Array(SAMPLES);
  for (let i = 0; i < SAMPLES; i++) {
    const a = (i / SAMPLES) * TAU, c = Math.cos(a), s = Math.sin(a);
    let lo = 0, hi = Math.hypot(b.hw, b.hh) + 2;
    for (let k = 0; k < 28; k++) { const m = (lo + hi) / 2; if (inside(b, CENTER.x + c * m, CENTER.y + s * m)) lo = m; else hi = m; }
    t[i] = lo;
  }
  tables.set(b, t);
  return t;
}
/** Distance from the rink centre to the edge of a rounded box along angle a (radians). */
export function edge(b: Box, a: number) {
  const t = table(b), f = ((a % TAU) + TAU) % TAU / TAU * SAMPLES, i = Math.floor(f) % SAMPLES, j = (i + 1) % SAMPLES, u = f - Math.floor(f);
  return t[i] * (1 - u) + t[j] * u;
}
export const polar = (a: number, r: number): Pt => ({x: CENTER.x + Math.cos(a) * r, y: CENTER.y + Math.sin(a) * r});

/** Angle of progress p (section units; section n is centred on p = n). Forward is clockwise on screen. */
export const angleAt = (p: number, length: number) => (90 + (p - 0.5) * 360 / length) * Math.PI / 180;
const mainInner = (a: number) => edge(MINI, a) + 10;
const mainOuter = (a: number) => edge(FLOOR, a) - 30;
/** A point on the main floor at progress p and depth d (0 = mini-track edge, 1 = outer wall). */
export function floorPoint(p: number, d: number, length: number): Pt {
  const a = angleAt(p, length), r0 = mainInner(a), r1 = mainOuter(a);
  return polar(a, r0 + (r1 - r0) * Math.max(0, Math.min(1, d)));
}

// Where each seat parks inside a section: three depths, two sides of the wedge.
const DEPTH = [0.18, 0.5, 0.82];
const SIDE = 0.24;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const TRACK_REF = 16; // loop spots below are written for the 16-section rink and scale to other sizes

// Each colour's personality: how it swings between the wall and the mini-track
// across a lap, and where it pulls a loop-de-loop (in 16ths of a lap).
const STYLE = [
  {k: [3, 7], a: [0.3, 0.1], f: [0.3, 1.9], loops: [2.5, 7.5, 12.5]},
  {k: [4, 9], a: [0.28, 0.1], f: [2.2, 0.4], loops: [4.5, 10.5, 15.5]},
  {k: [5, 6], a: [0.26, 0.12], f: [4.0, 2.8], loops: [1.5, 6.5, 13.5]},
  {k: [3, 8], a: [0.32, 0.08], f: [3.4, 5.1], loops: [5.5, 11.5, 16]},
  {k: [4, 5], a: [0.3, 0.1], f: [5.3, 1.2], loops: [3.5, 9.5, 14.5]},
  {k: [5, 11], a: [0.24, 0.08], f: [1.4, 3.7], loops: [0.5, 8.5, 12]},
];
const LOOP_RADIUS = 27, LOOP_WINDOW = 0.42;

function smoothDepth(seat: number, p: number, length: number) {
  const st = STYLE[seat % STYLE.length], u = (TAU * p) / length;
  return clamp(0.5 + st.a[0] * Math.sin(st.k[0] * u + st.f[0]) + st.a[1] * Math.sin(st.k[1] * u + st.f[1]), 0.08, 0.9);
}
/** Adds a loop-de-loop when p is near one of the given loop spots (in lap units). */
function withLoops(at: (p: number) => Pt, p: number, spots: number[], length: number, radius: number, window: number): Pt {
  const base = at(p);
  for (const spot of spots) {
    const s = (spot * length) / TRACK_REF;
    const c = s + length * Math.round((p - s) / length);
    const dist = p - c;
    if (Math.abs(dist) >= window) continue;
    const u = (dist + window) / (2 * window), ahead = at(p + 0.01), back = at(p - 0.01);
    let tx = ahead.x - back.x, ty = ahead.y - back.y; const len = Math.hypot(tx, ty) || 1; tx /= len; ty /= len;
    // Loop toward the open side of the floor so it never clips the wall or the mini-track.
    const anchor = at(c), toCentre = (CENTER.x - anchor.x) * -ty + (CENTER.y - anchor.y) * tx;
    const sign = toCentre > 0 ? 1 : -1, nx = -ty * sign, ny = tx * sign;
    const towardCentre = smoothDepthFromPoint(anchor) > 0.5;
    const flip = towardCentre ? 1 : -1;
    const sx = Math.sin(TAU * u), cy = 1 - Math.cos(TAU * u);
    return {x: base.x + radius * (sx * tx + cy * nx * flip), y: base.y + radius * (sx * ty + cy * ny * flip)};
  }
  return base;
}
/** How far across the floor a point sits (0 = mini-track edge, 1 = outer wall). */
function smoothDepthFromPoint(q: Pt) {
  const a = Math.atan2(q.y - CENTER.y, q.x - CENTER.x), r = Math.hypot(q.x - CENTER.x, q.y - CENTER.y);
  const r0 = mainInner(a), r1 = mainOuter(a);
  return (r - r0) / (r1 - r0);
}

/** Hidden route for a player's car at progress p (continuous; any lap). */
export function carRoute(seat: number, p: number, length: number): Pt {
  return withLoops(q => floorPoint(q, smoothDepth(seat, q, length), length), p, STYLE[seat % STYLE.length].loops, length, LOOP_RADIUS, LOOP_WINDOW);
}
const miniPoint = (q: number, seat: number, length: number) => {
  const a = angleAt(q, length);
  return polar(a, edge(ISLAND, a) + 25 + 7 * Math.sin((TAU * q * 3) / length + seat));
};
/** The mini-track ("daddy path"): a curly loop hugging the centre island. */
export function miniRoute(seat: number, p: number, length: number): Pt {
  const spots = Array.from({length: 8}, (_, i) => i * 2 + 1 + (seat % 2));
  return withLoops(q => miniPoint(q, seat, length), p, spots, length, 11, 0.3);
}
/** Rusty's own wobbly route; he drives it backwards. */
export function rustyRoute(p: number, length: number): Pt {
  return floorPoint(p, 0.55 + 0.3 * Math.sin(2.2 * p + 0.7), length);
}
/** Start Grid bays sit along the Start Line, just before section 1. */
export function startPoint(seat: number): Pt {
  const a = Math.PI / 2, r0 = mainInner(a), r1 = mainOuter(a);
  const p = polar(a, r0 + (r1 - r0) * (0.1 + (seat % 3) * 0.4));
  return {x: p.x + (seat < 3 ? 26 : -26), y: p.y};
}
/** Parking spot for a seat in section n: six bays per section so cars never stack. */
export function slotPoint(seat: number, n: number, lane: Lane, length: number): Pt {
  if (n === 0) return startPoint(seat);
  const side = seat < 3 ? -SIDE : SIDE;
  if (lane === "mini") {
    const a = angleAt(n + side * 1.2 + ((seat % 3) - 1) * 0.12, length);
    return polar(a, edge(ISLAND, a) + (seat % 3 === 1 ? 36 : 18));
  }
  return floorPoint(n + side, DEPTH[seat % 3], length);
}
export function rustySlot(n: number, length: number): Pt { return floorPoint(n, 0.5, length); }
/** Where a parked car sits. */
export function carPoint(seat: number, pos: number, lane: Lane, length: number): Pt { return slotPoint(seat, pos, lane, length); }
export function rustyPoint(pos: number, length: number): Pt { return rustySlot(pos, length); }

const smooth = (a: number, b: number, t: number) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
/** Keeps a point between the walls of its lane (main floor or mini-track). */
export function clampToLane(q: Pt, lane: Lane): Pt {
  const a = Math.atan2(q.y - CENTER.y, q.x - CENTER.x), r = Math.hypot(q.x - CENTER.x, q.y - CENTER.y);
  const lo = lane === "mini" ? edge(ISLAND, a) + 10 : edge(MINI, a) + 8, hi = lane === "mini" ? edge(MINI, a) - 8 : edge(FLOOR, a) - 24;
  return r >= lo && r <= hi ? q : polar(a, clamp(r, lo, hi));
}
/**
 * A car part-way through a move. `stops` are unwrapped section numbers (e.g. 15, 16, 17, 18
 * for 15 → 2 on a 16 rink). The car pulls out of its parking bay, follows its hidden route
 * and eases into the bay of the section it lands in.
 */
export function travelPoint(route: (p: number) => Pt, from: Pt, to: Pt, stops: number[], t: number, lane: Lane = "main"): Pt {
  const n = stops.length - 1, k = clamp(t, 0, 1) * n, i = Math.min(n - 1, Math.floor(k));
  const p = stops[i] + (stops[i + 1] - stops[i]) * (k - i);
  const a = route(stops[0]), b = route(stops[n]), here = route(p);
  const w = clamp(1.3 / n, 0.3, 1), leave = 1 - smooth(0, w, t), arrive = smooth(1 - w, 1, t);
  return clampToLane({x: here.x + (from.x - a.x) * leave + (to.x - b.x) * arrive, y: here.y + (from.y - a.y) * leave + (to.y - b.y) * arrive}, lane);
}
/** Screen direction of travel at a section (for which way a parked car faces). */
export function headingAt(route: (p: number) => Pt, p: number, forward: 1 | -1): Pt {
  const a = route(p - 0.05 * forward), b = route(p + 0.05 * forward);
  return {x: b.x - a.x, y: b.y - a.y};
}

/** Section wedge outline (clipped to the floor by the board). */
export function wedgePath(n: number, length: number): string {
  const a0 = angleAt(n - 0.5, length), a1 = angleAt(n + 0.5, length), R = 1400;
  const p0 = polar(a0, R), p1 = polar(a1, R);
  return `M${CENTER.x} ${CENTER.y}L${p0.x.toFixed(1)} ${p0.y.toFixed(1)}L${p1.x.toFixed(1)} ${p1.y.toFixed(1)}Z`;
}
/** Rounded-box outline as an SVG path. */
export function boxPath(b: Box): string {
  const {hw, hh, r} = b, x0 = CENTER.x - hw, x1 = CENTER.x + hw, y0 = CENTER.y - hh, y1 = CENTER.y + hh;
  return `M${x0 + r} ${y0}H${x1 - r}A${r} ${r} 0 0 1 ${x1} ${y0 + r}V${y1 - r}A${r} ${r} 0 0 1 ${x1 - r} ${y1}H${x0 + r}A${r} ${r} 0 0 1 ${x0} ${y1 - r}V${y0 + r}A${r} ${r} 0 0 1 ${x0 + r} ${y0}Z`;
}
/** Label anchor near the outer wall for section n. */
export function labelPoint(n: number, length: number, inset = 26): Pt {
  const a = angleAt(n, length);
  return polar(a, edge(FLOOR, a) - inset);
}
