"use client";
// Overlays drawn over the rink while a round plays back.
import {CONDITIONS, EVENTS} from "@/lib/game/catalog";
import type {PublicGame} from "@/lib/game/engine";
import type {Theater} from "./use-round-replay";
import {EventArt, HazardArt} from "./card-art";

const HAZARD_TEXT = {
  grease: {title: "Grease!", result: {slide: "Slip-sliding away"}},
  tilt: {title: "Tilt-A-Whirl!", result: {forward: "Flung forward", back: "Spun backward", stay: "Holding steady"}},
  dead: {title: "Dead Zone!", result: {paid: "Paid to keep rolling", skip: "Sits out next round"}},
} as const;

export function ReplayScene({show, game}: {show: Theater; game: PublicGame}) {
  if (!show.active) return null;
  const player = (id: string) => game.players.find(p => p.id === id);
  const name = (id: string) => player(id)?.name ?? "Rusty";
  const b = show.banner;
  return (
    <div className="replay-layer" aria-live="polite">
      {show.reveals.length > 0 && (
        <ol className="reveal-tray" aria-label="Cards played this round">
          {show.reveals.map((r, i) => {
            const p = player(r.actor), up = i < show.revealed;
            return (
              <li key={r.actor} className={`${up ? "up" : ""} ${show.spotlight === r.actor ? "active" : ""}`} style={{"--paint": p?.color} as React.CSSProperties}>
                <span className="tray-seat">{(p?.seat ?? 0) + 1}</span>
                <strong>{up ? r.value : "?"}</strong>
                {up && r.extra ? <small>+{r.extra}</small> : null}
                {up && r.boost ? <em title={EVENTS[r.boost].name}>★</em> : null}
                <span className="sr-only">{name(r.actor)} {up ? `plays ${r.value}` : "card face down"}</span>
              </li>
            );
          })}
        </ol>
      )}

      {b?.kind === "go" && <div className="go-flag" role="status"><span>GO!</span></div>}

      {b?.kind === "doubles" && (
        <div className="doubles-celebration" role="status">
          <div className="confetti-field" aria-hidden="true">{Array.from({length: 40}, (_, i) => <i key={i} style={{left: `${(i * 137.5) % 100}%`, background: ["#ed493a", "#ffc95a", "#278ec6", "#92c571", "#c176ca"][i % 5], animationDelay: `${(i % 7) * 0.05}s`, transform: `rotate(${i * 31}deg)`}}/>)}</div>
          <div className="doubles-ribbon"><small>MATCHING {b.value}s!</small><strong>DOUBLES!</strong><span>{b.actors.map(name).join(" & ")} draw Midway cards</span></div>
        </div>
      )}

      {b?.kind === "card" && (
        <div className={`midway-reveal ${EVENTS[b.event].type.toLowerCase()}`} role="status">
          <small>{name(b.actor)} · {EVENTS[b.event].type}</small>
          <strong>{EVENTS[b.event].name}</strong>
          <EventArt kind={b.event}/>
          <p>{EVENTS[b.event].text}</p>
        </div>
      )}

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
          <span><strong>{HAZARD_TEXT[b.hazard].title}</strong>{name(b.actor)} · {b.roll ? `rolled ${b.roll} · ` : ""}{(HAZARD_TEXT[b.hazard].result as Record<string, string>)[b.result] ?? ""}</span>
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
