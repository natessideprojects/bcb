"use client";
// Overlays drawn over the rink while a round plays back.
import {useEffect, useState} from "react";
import {CONDITIONS, EVENTS, type EventId} from "@/lib/game/catalog";
import type {PublicGame} from "@/lib/game/engine";
import type {Caption, CaptionPart, DiceView, Theater} from "./use-round-replay";
import {EventArt, HazardArt} from "./card-art";

// ---------- dice ----------
const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]], 2: [[29, 29], [71, 71]], 3: [[27, 27], [50, 50], [73, 73]], 4: [[29, 29], [71, 29], [29, 71], [71, 71]],
  5: [[27, 27], [73, 27], [50, 50], [27, 73], [73, 73]], 6: [[29, 25], [71, 25], [29, 50], [71, 50], [29, 75], [71, 75]],
};
function DieFace({value, hidden}: {value: number; hidden?: boolean}) {
  return (
    <svg viewBox="0 0 100 100" className="die-face" aria-hidden="true">
      <rect x="5" y="5" width="90" height="90" rx="18"/>
      {hidden ? <text x="50" y="66">?</text> : PIPS[value].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="9"/>)}
    </svg>
  );
}
/** One die. While it tumbles it flips through faces; then it lands on the server's roll. */
function Die({value, phase, seed}: {value: number; phase: DiceView["phase"]; seed: number}) {
  const [face, setFace] = useState(value);
  useEffect(() => {
    if (phase !== "rolling") return;
    let n = seed;
    const t = setInterval(() => { n = (n * 5 + 3) % 6; setFace(n + 1); }, 70);
    return () => clearInterval(t);
  }, [phase, seed]);
  return <span className={`die ${phase}`}><DieFace value={phase === "rolling" ? face : value} hidden={phase === "waiting"}/></span>;
}
const DICE_PROMPT: Record<DiceView["purpose"], string> = {
  knockback: "rolls for knockback", tilt: "spins the Tilt-A-Whirl · 1–2 back · 3–4 hold · 5–6 forward",
  escape: "rolls to escape the stall · needs 4–6", rusty: "rolls to reverse", tie: "tied: roll for the flag",
};
function diceResult(d: DiceView) {
  const v = d.rolls[0].value;
  switch (d.purpose) {
    case "knockback": { const total = v * (d.multiplier ?? 1) + (d.bonus ?? 0); return total === v ? `Knocked back ${v}` : `${v}${d.multiplier ? ` × ${d.multiplier}` : ""}${d.bonus ? ` + ${d.bonus}` : ""} = knocked back ${total}`; }
    case "tilt": return v < 3 ? "Spun backward 3!" : v > 4 ? "Flung forward 3!" : "Holding steady";
    case "escape": return v >= 4 ? "Back in action!" : "Still stalled";
    case "rusty": return `Rusty reverses ${v}`;
    case "tie": { const best = Math.max(...d.rolls.map(r => r.value)); return d.rolls.filter(r => r.value === best).length > 1 ? "Tied again: roll again!" : "Highest roll takes the earlier flag"; }
  }
}
function DiceTray({dice, chip, onRoll}: {dice: DiceView; chip: (part: CaptionPart, i: number) => React.ReactNode; onRoll?: () => void}) {
  const waiting = dice.phase === "waiting", long = dice.waitMs > 60000;
  const single = dice.rolls.length === 1 ? dice.rolls[0].actor : null;
  const best = Math.max(...dice.rolls.map(r => r.value));
  return (
    <div className={`dice-tray ${dice.phase} ${dice.mine ? "mine" : ""}`} role="status" aria-live="polite">
      <p className="dice-prompt">
        {dice.mine && waiting ? <strong>Your roll!</strong> : single ? chip(single === "rusty" ? "Rusty" : {who: single}, 0) : null}
        <span>{dice.purpose === "tie" ? `Tied at ${dice.card}s: roll for the flag` : DICE_PROMPT[dice.purpose]}</span>
      </p>
      <div className="dice-row">
        {dice.rolls.map((r, i) => {
          // In a tie that includes you, every die waits for your click and then they all roll together.
          const die = <Die value={r.value} phase={dice.phase} seed={dice.id * 7 + i}/>;
          return (
            <figure key={r.actor + i} className={dice.phase === "done" && dice.rolls.length > 1 && r.value === best ? "best" : ""}>
              {dice.mine && waiting && onRoll ? <button className="die-button" onClick={onRoll} autoFocus aria-label="Roll the die">{die}</button> : die}
              {dice.rolls.length > 1 && <figcaption>{chip(r.actor === "rusty" ? "Rusty" : {who: r.actor}, i)}</figcaption>}
            </figure>
          );
        })}
      </div>
      {waiting && dice.mine
        ? <p className="dice-hint">{long ? "Click the die to roll" : <>Click the die to roll · rolls itself in {Math.round(dice.waitMs / 1000)}s<i className="dice-timer" style={{animationDuration: `${dice.waitMs}ms`}}/></>}</p>
        : dice.phase === "done" ? <p className="dice-result"><b>{dice.rolls.length === 1 ? dice.rolls[0].value : ""}</b> {diceResult(dice)}{dice.auto ? <small> (rolled itself)</small> : null}</p>
        : <p className="dice-hint">Rolling…</p>}
    </div>
  );
}

const HAZARD_TEXT = {
  grease: {title: "Grease!", result: {slide: "Slip-sliding away"}},
  tilt: {title: "Tilt-A-Whirl!", result: {forward: "Flung forward", back: "Spun backward", stay: "Holding steady"}},
  dead: {title: "Dead Zone!", result: {paid: "Paid to keep rolling", skip: "Sits out next round"}},
} as const;

/** The play-by-play line: driver chips (seat number in their paint colour, then name) and text. */
export function PlayCall({caption, game, className = "playcall"}: {caption: Caption | null; game: PublicGame; className?: string}) {
  if (!caption) return null;
  const chip = (part: CaptionPart, i: number) => {
    if (typeof part === "string") return <span key={i}>{part}</span>;
    const p = game.players.find(x => x.id === part.who);
    if (!p) return <b key={i} className="who rusty">Rusty</b>;
    return <b key={i} className="who" style={{"--paint": p.color} as React.CSSProperties}><i>{p.seat + 1}</i>{p.name}</b>;
  };
  return <p key={caption.id} className={`${className} ${caption.tone ?? ""}`} role="status">{caption.parts.map(chip)}</p>;
}

export function ReplayScene({show, game, hideCaption, onRoll, onPeek}: {show: Theater; game: PublicGame; hideCaption?: boolean; onRoll?: () => void; onPeek?: (card: {actor: string; kind: EventId}) => void}) {
  if (!show.active) return null;
  const player = (id: string) => game.players.find(p => p.id === id);
  const name = (id: string) => player(id)?.name ?? "Rusty";
  const b = show.banner;
  const chip = (part: CaptionPart, i: number) => {
    if (typeof part === "string") return <b key={i} className="who rusty">{part}</b>;
    const p = player(part.who);
    if (!p) return <b key={i} className="who rusty">Rusty</b>;
    return <b key={i} className="who" style={{"--paint": p.color} as React.CSSProperties}><i>{p.seat + 1}</i>{p.name}</b>;
  };
  return (
    <div className="replay-layer" aria-live="polite">
      {show.reveals.length > 0 && (
        <ol className="reveal-tray" aria-label="Cards played this round">
          {show.reveals.map((r, i) => {
            const p = player(r.actor), up = i < show.revealed;
            return (
              <li key={r.actor} className={`${up ? "up" : ""} ${show.spotlight === r.actor ? "active" : ""}`} style={{"--paint": p?.color} as React.CSSProperties}>
                <span className="tray-seat">{(p?.seat ?? 0) + 1}</span>
                <span className="tray-flag" title={`Flag ${i + 1}: moves ${i === 0 ? "first" : `${i + 1}${["st", "nd", "rd"][i] ?? "th"}`}`}>F{i + 1}</span>
                <strong>{up ? r.value : "?"}</strong>
                {up && r.extra ? <small>+{r.extra}</small> : null}
                {up && r.boost ? <em title={EVENTS[r.boost].name}>★</em> : null}
                {up && r.auto ? <em className="tray-auto" title="Time ran out: lowest card played">⏱</em> : null}
                <span className="sr-only">Flag {i + 1}: {name(r.actor)} {up ? `plays ${r.value}` : "card face down"}</span>
              </li>
            );
          })}
        </ol>
      )}

      {b?.kind === "go" && <div className="go-flag" role="status"><span>GO!</span></div>}

      {!hideCaption && <PlayCall caption={show.caption} game={game}/>}

      {b?.kind === "doubles" && (
        <div className="doubles-celebration" role="status">
          <div className="confetti-field" aria-hidden="true">{Array.from({length: 40}, (_, i) => <i key={i} style={{left: `${(i * 137.5) % 100}%`, background: ["#ed493a", "#ffc95a", "#278ec6", "#92c571", "#c176ca"][i % 5], animationDelay: `${(i % 7) * 0.05}s`, transform: `rotate(${i * 31}deg)`}}/>)}</div>
          <div className="doubles-ribbon"><small>MATCHING {b.value}s!</small><strong>DOUBLES!</strong><span>{b.actors.map(name).join(" & ")} draw Midway cards</span></div>
        </div>
      )}

      {b?.kind === "card" && (
        <button className={`midway-reveal ${EVENTS[b.event].type.toLowerCase()}`} role="status" onClick={() => onPeek?.({actor: b.actor, kind: b.event})} aria-label={`${EVENTS[b.event].name}: tap to read and pause`}>
          <small>Driver {(player(b.actor)?.seat ?? 0) + 1} · {name(b.actor)} · {EVENTS[b.event].type}</small>
          <strong>{EVENTS[b.event].name}</strong>
          <EventArt kind={b.event}/>
          <p>{EVENTS[b.event].text}</p>
          {onPeek && <em className="tap-hint">Tap to read · pauses the show</em>}
        </button>
      )}

      {show.dice && <DiceTray key={show.dice.id} dice={show.dice} chip={chip} onRoll={onRoll}/>}
      {show.held && <p className="held-badge" role="status">Paused while you read</p>}

      {b?.kind === "condition" && (
        <div className="sign-flip" role="status">
          <small>New Rink Condition</small>
          <strong>{CONDITIONS[b.condition].name}</strong>
          <p>{CONDITIONS[b.condition].text}</p>
        </div>
      )}

      {b?.kind === "hazard" && (
        <div className={`callout hz-${b.hazard}`} role="status">
          <HazardArt kind={b.hazard} size={34}/>
          <span><strong>{HAZARD_TEXT[b.hazard].title}</strong>{name(b.actor)} · {b.hazard === "tilt" ? "roll the die!" : (HAZARD_TEXT[b.hazard].result as Record<string, string>)[b.result] ?? ""}</span>
        </div>
      )}
      {b?.kind === "lap" && (
        <div className={`callout lap ${b.delta < 0 ? "bad" : ""}`} role="status">
          <span className="flag-icon" aria-hidden="true"/>
          <span><strong>{b.delta > 0 ? "Lap complete!" : "Backward lap!"}</strong>{name(b.actor)} · {b.delta > 0 ? "+" : "−"}{Math.abs(b.delta)} ticket{Math.abs(b.delta) === 1 ? "" : "s"}</span>
        </div>
      )}
      {b?.kind === "stall" && (
        <div className="callout stall" role="status">
          <span className="smoke-icon" aria-hidden="true"/>
          <span><strong>{b.pileup ? "Pile-up!" : "Stalled out!"}</strong>{name(b.actor)} · automatic escape check next round: 4–6</span>
        </div>
      )}
    </div>
  );
}
