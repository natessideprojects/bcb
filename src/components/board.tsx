"use client";
// The rink: 16 numbered sections on the main floor, the mini-track ("daddy path")
// around the centre island, and the Rink Sign. Cars park in bays inside their
// section and drive hidden routes between them (see lib/game/rink.ts).
import {CONDITIONS} from "@/lib/game/catalog";
import {gameMap, type PublicGame, type Visual} from "@/lib/game/engine";
import {CENTER, FLOOR, ISLAND, MINI, angleAt, boxPath, carRoute, edge, floorPoint, headingAt, labelPoint, miniRoute, polar, rustyRoute, rustySlot, slotPoint, startPoint, wedgePath} from "@/lib/game/rink";
import {Car} from "./brand";
import {HazardArt} from "./card-art";
import type {Fx, Motion} from "./use-round-replay";

type Hazard = "grease" | "tilt" | "dead";
const HAZARD_LABEL: Record<Hazard, string> = {grease: "GREASE", tilt: "TILT", dead: "DEAD ZONE"};
const BURST = "0,-58 13,-31 40,-44 36,-16 64,-7 41,9 54,35 25,31 14,57 -3,36 -29,51 -27,23 -56,17 -36,-4 -53,-29 -22,-25 -16,-53";

export function Board({game: g, userId, visual, motion = {}, fx = [], shake, spotlight, hot, round}: {
  game: PublicGame; userId: string; visual?: Visual | null; motion?: Record<string, Motion>; fx?: Fx[];
  shake?: string | null; spotlight?: string | null; hot?: {pos: number; kind: Hazard} | null; round?: number;
}) {
  const map = gameMap(g), length = g.trackLength || 28;
  const condition = CONDITIONS[visual?.condition || g.condition];
  const direction = visual?.direction || g.direction;
  const hazardOf = (n: number): Hazard | null => (map.grease.includes(n) ? "grease" : map.tilt.includes(n) ? "tilt" : map.dead.includes(n) ? "dead" : null);
  const sections = Array.from({length}, (_, i) => i + 1);

  // Every car: either mid-move (motion) or parked in its bay facing the way it drives.
  const cars = g.players.map(p => {
    const pose = visual?.players[p.id] ?? p, m = motion[p.id];
    const rest = slotPoint(p.seat, pose.pos, pose.lane, length);
    const route = pose.lane === "mini" ? (q: number) => miniRoute(p.seat, q, length) : (q: number) => carRoute(p.seat, q, length);
    const face: 1 | -1 = pose.pos === 0 ? -1 : headingAt(route, pose.pos, direction).x > 0 ? 1 : -1;
    return {p, pose, at: m ?? {...rest, face, tilt: 0}, mini: pose.lane === "mini"};
  });
  const rustyPos = visual?.rusty ?? g.rusty;
  const rustyRest = rustySlot(rustyPos, length);
  const rustyFace: 1 | -1 = headingAt(q => rustyRoute(q, length), rustyPos, direction === 1 ? -1 : 1).x > 0 ? 1 : -1;
  const rusty = motion.rusty ?? {...rustyRest, face: rustyFace, tilt: 0};
  const sprites = [...cars.map(c => ({id: c.p.id, y: c.at.y, c})), {id: "rusty", y: rusty.y, c: null}].sort((a, b) => a.y - b.y);

  const islandTop = CENTER.y - ISLAND.hh, signW = 236, signH = 78;
  const startTop = CENTER.y + MINI.hh, startBottom = CENTER.y + FLOOR.hh;

  return (
    <figure className={`rink-board ${g.map}`}>
      <svg className="rink" viewBox="0 0 1000 730" role="img" aria-label={`${map.name}: ${length} sections, round ${round || g.round}, driving ${direction === 1 ? "clockwise" : "counterclockwise"}`}>
        <defs>
          <clipPath id="rink-floor"><path d={boxPath(FLOOR)}/></clipPath>
          <pattern id="rink-checks" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#fff9ed"/><path d="M0 0H6V6H0ZM6 6H12V12H6Z" fill="#172c43"/></pattern>
          <pattern id="mini-boards" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="18" height="18" className="mini-plank"/><path d="M0 0v18" className="mini-seam"/></pattern>
          <radialGradient id="floor-shine" cx="50%" cy="45%" r="60%"><stop offset="0" stopColor="#fff" stopOpacity=".28"/><stop offset="1" stopColor="#fff" stopOpacity="0"/></radialGradient>
          <linearGradient id="sign-red" x2="0" y2="1"><stop stopColor="#e9503e"/><stop offset="1" stopColor="#9c252a"/></linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
        </defs>
        <image href="/fairground-board-v2.png" width="1000" height="730" preserveAspectRatio="none"/>

        {/* Main floor: numbered sections, hazard sections tinted */}
        <g clipPath="url(#rink-floor)">
          {sections.map(n => {
            const h = hazardOf(n);
            return <path key={n} d={wedgePath(n, length)} className={`wedge ${n % 2 ? "odd" : "even"} ${h ? "hz-" + h : ""} ${hot?.pos === n ? "firing" : ""}`}/>;
          })}
          <path d={boxPath(FLOOR)} fill="url(#floor-shine)"/>
          {sections.map(n => { const a = angleAt(n - 0.5, length), p = polar(a, edge(MINI, a)), q = polar(a, edge(FLOOR, a)); return <path key={n} d={`M${p.x} ${p.y}L${q.x} ${q.y}`} className="wedge-line"/>; })}
        </g>
        <path d={boxPath(FLOOR)} className="floor-rim"/>

        {/* Hazard markers and section numbers */}
        {sections.map(n => {
          const h = hazardOf(n), icon = floorPoint(n, 0.5, length), label = labelPoint(n, length, 30);
          return (
            <g key={n} className={`section-mark ${h ? "hazard" : ""}`}>
              {h && <><circle cx={icon.x} cy={icon.y} r="27" className={`hazard-disc hz-${h}`}/><HazardArt kind={h} x={icon.x - 19} y={icon.y - 21} size={38}/><text x={icon.x} y={icon.y + 40} className="hazard-label">{HAZARD_LABEL[h]}</text></>}
              <circle cx={label.x} cy={label.y} r="17" className="section-badge"/>
              <text x={label.x} y={label.y + 6} className="section-number">{n}</text>
            </g>
          );
        })}

        {/* Start Line and Start Grid */}
        <rect x="492" y={startTop + 4} width="16" height={startBottom - startTop - 8} fill="url(#rink-checks)" className="start-line"/>
        {Array.from({length: 6}, (_, s) => { const b = startPoint(s); return <rect key={s} x={b.x - 22} y={b.y - 14} width="44" height="26" rx="7" className="grid-bay"/>; })}
        <text x="500" y={startBottom - 4} className="start-text">START</text>

        {/* Mini-track around the island */}
        <path d={boxPath(MINI)} className="mini-ring"/>
        <path d={boxPath(MINI)} fill="url(#mini-boards)" opacity=".5"/>
        {sections.map(n => { const a = angleAt(n - 0.5, length), p = polar(a, edge(ISLAND, a)), q = polar(a, edge(MINI, a)); return <path key={n} d={`M${p.x} ${p.y}L${q.x} ${q.y}`} className="mini-tick"/>; })}
        <text x="500" y={CENTER.y - MINI.hh + 17} className="mini-label">MINI TRACK</text>

        {/* Centre island with the Rink Sign */}
        <path d={boxPath(ISLAND)} className="island"/>
        <g className="marquee-sign">
          <rect x={500 - signW / 2} y={islandTop + 12} width={signW} height={signH} rx="10" fill="url(#sign-red)" stroke="#f0bf55" strokeWidth="4"/>
          <rect x={500 - signW / 2 + 10} y={islandTop + 21} width={signW - 20} height={signH - 18} rx="7" className="sign-panel"/>
          {Array.from({length: 13}, (_, i) => <circle key={"t" + i} cx={500 - signW / 2 + 8 + i * ((signW - 16) / 12)} cy={islandTop + 12} r="3.2" className="sign-bulb"/>)}
          {Array.from({length: 13}, (_, i) => <circle key={"b" + i} cx={500 - signW / 2 + 8 + i * ((signW - 16) / 12)} cy={islandTop + 12 + signH} r="3.2" className="sign-bulb"/>)}
          <text x="500" y={islandTop + 38} className="sign-kicker">ON THE RINK SIGN</text>
          {condition.name.length > 18 ? <>
            <text x="500" y={islandTop + 58} className="sign-name">{condition.name.slice(0, condition.name.lastIndexOf(" "))}</text>
            <text x="500" y={islandTop + 78} className="sign-name">{condition.name.slice(condition.name.lastIndexOf(" ") + 1)}</text>
          </> : <text x="500" y={islandTop + 67} className="sign-name">{condition.name}</text>}
        </g>
        <g className="round-plaque">
          <rect x="398" y={islandTop + signH + 22} width="204" height="28" rx="14"/>
          <text x="500" y={islandTop + signH + 41}>ROUND {round || g.round} · LAP {visual?.milestone ?? g.milestone} · {direction === 1 ? "↻" : "↺"}</text>
        </g>

        {/* Cars, back to front */}
        {sprites.map(({id, c}) => {
          if (!c) return (
            <g key="rusty" transform={`translate(${rusty.x} ${rusty.y})`} className={`token rusty ${motion.rusty ? "moving" : ""}`} style={{opacity: rusty.opacity ?? 1}}>
              <ellipse cx="0" cy="2" rx="26" ry="8" className="car-shadow"/>
              <g className={shake === "rusty" ? "shake" : ""}><g transform={`rotate(${rusty.tilt}) scale(${rusty.face === 1 ? -1 : 1} 1)`}><Car color="#292e36" x={-31} y={-60} width={62} height={68} aria-label={`Rusty, section ${rustyPos}`}/></g></g>
            </g>
          );
          const {p, pose, at, mini} = c, you = p.id === userId, s = (mini ? 0.7 : 1) * (at.scale ?? 1);
          return (
            <g key={id} transform={`translate(${at.x} ${at.y})`} className={`token ${you ? "you" : ""} ${motion[id] ? "moving" : ""} ${spotlight === id ? "spot" : ""}`} style={{opacity: at.opacity ?? 1}}>
              {spotlight === id && <ellipse cx="0" cy="0" rx={34 * s} ry={13 * s} className="spot-glow" filter="url(#glow)"/>}
              {you && <ellipse cx="0" cy="1" rx={30 * s} ry={11 * s} className="you-ring"/>}
              <ellipse cx="0" cy="2" rx={24 * s} ry={8 * s} className="car-shadow"/>
              <g className={shake === id ? "shake" : ""}>
                <g transform={`rotate(${at.tilt}) scale(${at.face === 1 ? -s : s} ${s})`}><Car skin={p.skin} mascot={p.mascot} color={p.color} x={-29} y={-57} width={58} height={64} aria-label={`${p.name}, ${pose.pos === 0 ? "Start Grid" : `section ${pose.pos}`}${mini ? ", mini-track" : ""}`}/></g>
              </g>
              <g transform={`translate(${20 * s} ${-6 * s})`} className="seat-badge"><circle r="9" fill={p.color}/><text y="4">{p.seat + 1}</text></g>
              {you && <text x="0" y={-58 * s} className="you-tag">YOU</text>}
            </g>
          );
        })}

        {/* Effects */}
        {fx.map(f => (
          <g key={f.id} transform={`translate(${f.x} ${f.y})`} className={`fx fx-${f.kind} ${f.tone || ""}`} aria-hidden="true">
            <g className="fx-body">
              {(f.kind === "bash" || f.kind === "pileup") && <><polygon points={BURST} className="burst"/><text y="9" className="fx-word">{f.kind === "bash" ? "BASH!" : "PILE-UP!"}</text></>}
              {f.kind === "rusty-bash" && <><polygon points={BURST} className="burst dark"/><text y="9" className="fx-word">CRUNCH!</text></>}
              {f.kind === "grease" && <><path d="M-34 4c-14-12 6-22 14-12 2-16 22-14 20-2 16-10 30 6 16 14 16 4 8 20-8 14-6 14-26 10-22-2-12 8-30 0-20-12Z" className="splat"/><path d="M-50 22h34M-44 30h40" className="skid"/><text y="-28" className="fx-word small">SLIDE!</text></>}
              {f.kind === "tilt" && <><path d="M30 0C29-24-26-24-26 2c0 22 44 22 44 0 0-14-24-14-24 0 0 7 10 7 10 0" className="spiral"/><text y="-38" className="fx-word small">SPIN!</text></>}
              {f.kind === "dead" && <><path d="M4-34L-12 0h14l-6 30 26-38H8l10-26Z" className="bolt"/><text y="-40" className="fx-word small">ZAP!</text></>}
              {(f.kind === "stall" || f.kind === "pileup") && <g className="smoke"><circle cx="-12" cy="-20" r="11"/><circle cx="6" cy="-30" r="14"/><circle cx="16" cy="-14" r="9"/></g>}
              {(f.kind === "tickets" || f.kind === "lap") && <><rect x="-30" y="-15" width="60" height="30" rx="5" className="ticket-chip"/>{f.kind === "lap" ? <path d="M-24-9h8v6h-8zm8 6h8v6h-8zm-8 6h8v6h-8z" className="mini-flag"/> : <circle cx="-20" cy="0" r="5" className="ticket-hole"/>}<text x="8" y="7" className="fx-ticket-text">{f.text}</text></>}
              {(f.kind === "poof" || f.kind === "sparkle") && <g className="stars">{[0, 72, 144, 216, 288].map(a => <path key={a} transform={`rotate(${a}) translate(0 -26)`} d="M0-7l2 5 5 1-4 3 1 6-4-3-4 3 1-6-4-3 5-1Z"/>)}</g>}
              {f.kind === "card" && <g className="card-pop"><rect x="-15" y="-80" width="30" height="40" rx="4"/><text y="-55">★</text></g>}
            </g>
          </g>
        ))}
      </svg>
    </figure>
  );
}
