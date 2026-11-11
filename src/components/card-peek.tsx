"use client";
// A Midway card opened up to read: tapped during the round playback (which pauses the
// show) or from the list of recent Midway cards.
import {useEffect, useRef} from "react";
import {X} from "lucide-react";
import {EVENTS, type EventId} from "@/lib/game/catalog";
import type {PublicGame} from "@/lib/game/engine";
import {EventArt} from "./card-art";

export type PeekCard = {actor: string; kind: EventId; how?: "drew" | "used"; round?: number};

export function CardPeek({card, game, onClose}: {card: PeekCard; game: PublicGame; onClose: () => void}) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  const e = EVENTS[card.kind], p = game.players.find(x => x.id === card.actor), type = e.type.toLowerCase();
  return (
    <div className="card-peek-backdrop" onClick={onClose}>
      <div className={`card-peek ${type}`} role="dialog" aria-modal="true" aria-label={e.name} onClick={ev => ev.stopPropagation()}>
        <button className="icon-button card-peek-close" onClick={onClose} aria-label="Close card"><X size={18}/></button>
        <p className="card-peek-who">
          {p && <b className="who" style={{"--paint": p.color} as React.CSSProperties}><i>{p.seat + 1}</i>{p.name}</b>}
          {p && <span>{card.how === "used" ? " used this card" : " drew this card"}{card.round ? ` in round ${card.round}` : ""}</span>}
        </p>
        <span className={`type-tag ${type}`}>{e.type}</span>
        <h3>{e.name}</h3>
        <EventArt kind={card.kind}/>
        <p>{e.text}</p>
        <button className="button small navy" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}
