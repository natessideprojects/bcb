"use client";
// Plays back a resolved round on the rink: card reveals, the GO beat, every car
// driving its hidden route, bashes, hazards, tickets, Midway cards and the Rink
// Sign. Each beat has an animation, a sound effect and (when it matters) a line
// from the announcer.
import {useCallback, useEffect, useLayoutEffect, useRef, useState} from "react";
import {replayBudget} from "@/lib/game/engine";
import type {PublicGame, ReplayEvent, RoundReplay, Visual, Pose} from "@/lib/game/engine";
import type {Condition, EventId} from "@/lib/game/catalog";
import {fairSound, type SfxName, type VoClip} from "@/lib/fair-audio";
import {lines, rotate} from "@/lib/announcer";
import {GO_BEAT, eventDuration} from "@/lib/game/presentation";
import {carRoute, miniRoute, rustyRoute, rustySlot, slotPoint, startPoint, travelPoint, type Pt} from "@/lib/game/rink";

export type Motion = {x: number; y: number; face: 1 | -1; tilt: number; opacity?: number; scale?: number};
export type FxKind = "bash" | "rusty-bash" | "grease" | "tilt" | "dead" | "tickets" | "lap" | "stall" | "pileup" | "poof" | "sparkle" | "card";
export type Fx = {id: number; kind: FxKind; x: number; y: number; text?: string; tone?: "good" | "bad"};
export type Reveal = {actor: string; value: number; extra?: number; boost?: EventId};
export type Banner =
  | {kind: "go"}
  | {kind: "doubles"; actors: string[]; value: number}
  | {kind: "card"; actor: string; event: EventId}
  | {kind: "condition"; condition: Condition}
  | {kind: "hazard"; actor: string; hazard: "grease" | "tilt" | "dead"; roll?: number; result: string}
  | {kind: "lap"; actor: string; delta: number}
  | {kind: "stall"; actor: string; pileup: boolean};
export type Theater = {
  active: boolean; round: number; visual: Visual | null; motion: Record<string, Motion>; fx: Fx[];
  banner: Banner | null; reveals: Reveal[]; revealed: number; spotlight: string | null; shake: string | null;
};
/** A narration hook point: the tutorial uses these to time its speech bubbles. */
export type Beat = {type: "event"; event: ReplayEvent; index: number} | {type: "go"} | {type: "end"};
export type ReplayHooks = {onBeat?: (beat: Beat) => Promise<void> | void; noCutoff?: boolean};
const idle: Theater = {active: false, round: 0, visual: null, motion: {}, fx: [], banner: null, reveals: [], revealed: 0, spotlight: null, shake: null};
const copy = (v: Visual): Visual => ({...v, players: Object.fromEntries(Object.entries(v.players).map(([id, p]) => [id, {...p}]))});
const ease = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2;
let fxSeq = 0;

export function useRoundReplay(game: PublicGame | undefined, userId: string, hooks?: ReplayHooks) {
  const [show, setShow] = useState<Theater>(idle);
  const token = useRef(0), previous = useRef<string | null>(null), latest = useRef(game), tickets = useRef<Record<string, number>>({});
  latest.current = game;
  const hooksRef = useRef(hooks);
  hooksRef.current = hooks;

  const cutoff = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skip = useCallback(() => { if (cutoff.current) clearTimeout(cutoff.current); token.current++; fairSound.cancel(); setShow(idle); }, []);

  const run = useCallback(async (replay: RoundReplay, before: Record<string, number>) => {
    if (cutoff.current) clearTimeout(cutoff.current);
    const mine = ++token.current;
    if (!hooksRef.current?.noCutoff) cutoff.current = setTimeout(() => { if (token.current === mine) skip(); }, replayBudget(replay));
    fairSound.cancel();
    const alive = () => token.current === mine;
    // Ending the show retires this run's token, so effect timers that fire later
    // (ticket floaters, sparkles) can never switch replay mode back on and lock the hand.
    const finish = () => { if (!alive()) return; if (cutoff.current) clearTimeout(cutoff.current); token.current++; setShow(idle); };
    const g = latest.current;
    if (!g) { finish(); return; }
    const length = g.trackLength || 28;
    const seat = (id: string) => g.players.find(p => p.id === id)?.seat ?? 0;
    const colour = (id: string) => g.players.find(p => p.id === id)?.color ?? "#ec4c3e";
    const pace = () => (fairSound.get().animation === "fast" ? 0.5 : 1);
    const wait = async (ms: number) => { await new Promise(r => setTimeout(r, ms * pace())); return alive(); };
    const sfx = (name: SfxName, opts?: {volume?: number; rate?: number; delay?: number}) => fairSound.effect(name, opts);
    const say = (clip: VoClip, priority = 1) => fairSound.say(clip, priority);

    const view = copy(replay.initial);
    const state: Theater = {...idle, active: true, round: replay.round, visual: view};
    const paint = () => { if (alive()) setShow({...state, visual: copy(view), motion: {...state.motion}, fx: [...state.fx]}); };
    const fx = (kind: FxKind, at: Pt, text?: string, tone?: Fx["tone"]) => {
      const id = ++fxSeq;
      state.fx = [...state.fx, {id, kind, x: at.x, y: at.y, text, tone}];
      setTimeout(() => { state.fx = state.fx.filter(f => f.id !== id); paint(); }, 1700 * pace());
    };
    const where = (actor: string): Pt => {
      const m = state.motion[actor];
      if (m) return m;
      if (actor === "rusty") return rustySlot(view.rusty, length);
      const p = view.players[actor];
      return p ? slotPoint(seat(actor), p.pos, p.lane, length) : {x: 500, y: 386};
    };

    const reveals = replay.events.filter((e): e is Extract<ReplayEvent, {type: "reveal"}> => e.type === "reveal");
    state.reveals = reveals.map(({actor, value, extra, boost}) => ({actor, value, extra, boost}));
    paint();
    const stopCrowd = fairSound.loop("crowd", 0.17);
    const mineHit = (id: string | null) => id === userId;

    let started = false, rustyMoves = 0, lastBashVictim: string | null = null, lastKnock = false;
    const go = async () => {
      if (started) return true;
      started = true;
      state.revealed = state.reveals.length; state.banner = {kind: "go"}; paint();
      sfx("go"); say(lines.go(), 3);
      if (!(await wait(GO_BEAT))) return false;
      state.banner = null; paint();
      await hooksRef.current?.onBeat?.({type: "go"});
      return alive();
    };

    const playEvent = async (e: ReplayEvent): Promise<boolean> => {
      switch (e.type) {
        case "reveal": {
          if (state.revealed === 0) say(lines.reveal(), 2);
          state.revealed++; state.spotlight = e.actor; paint();
          sfx("flip");
          if (e.boost) sfx("sparkle", {delay: 220});
          break;
        }
        case "doubles": {
          state.banner = {kind: "doubles", actors: e.actors, value: e.value}; paint();
          fairSound.doubles(); say(lines.doubles(), 2);
          if (!(await wait(eventDuration(e)))) return false;
          state.banner = null; paint();
          return true;
        }
        case "travel": {
          lastKnock = lastBashVictim === e.actor;
          if (!(await drive(e))) return false;
          if (lastKnock && e.path.length - 1 >= 5) say("bash_far", 1);
          lastBashVictim = null;
          return true;
        }
        case "bash": {
          const at = e.victim === "rusty" ? rustySlot(view.rusty, length) : where(e.victim);
          const chain = !!e.actor && lastKnock;
          fx(e.actor ? "bash" : "rusty-bash", at);
          state.shake = e.victim; paint();
          if (!e.actor) { sfx("rusty-bash"); say("rusty_bash", 2); }
          else { sfx("bash"); sfx("bonk", {delay: 60, volume: 0.6}); say(chain ? "bash_chain" : lines.bash(), 2); }
          if (mineHit(e.victim)) sfx("aww", {delay: 250, volume: 0.8}); else sfx("roar", {delay: 120, volume: 0.55});
          lastBashVictim = e.victim;
          if (!(await wait(eventDuration(e)))) return false;
          state.shake = null; paint();
          return true;
        }
        case "hazard": {
          const at = slotPoint(seat(e.actor), e.pos, e.lane, length);
          fx(e.kind, at);
          state.banner = {kind: "hazard", actor: e.actor, hazard: e.kind, roll: e.roll, result: e.result};
          if (e.kind === "grease") { sfx("grease"); say(lines.grease(), 2); sfx("roar", {delay: 300, volume: 0.35}); }
          if (e.kind === "tilt") { sfx("tilt"); say(e.result === "forward" ? "hazard_tilt_forward" : e.result === "back" ? "hazard_tilt_back" : "hazard_tilt_stay", 2); }
          if (e.kind === "dead") { sfx("dead"); say(e.result === "paid" ? "hazard_dead_paid" : "hazard_dead_sitout", 2); if (e.result === "skip") sfx("aww", {delay: 400, volume: 0.6}); }
          paint();
          if (!(await wait(eventDuration(e)))) return false;
          state.banner = null; paint();
          return true;
        }
        case "tickets": {
          const at = where(e.actor);
          fx("tickets", {x: at.x, y: at.y - 40}, `${e.delta > 0 ? "+" : "−"}${Math.abs(e.delta)}`, e.delta > 0 ? "good" : "bad");
          sfx(e.delta > 0 ? "ticket" : "ticket-lose");
          if (e.reason === "bounty") { say("rusty_bashed", 2); sfx("cheer", {volume: 0.6}); }
          else if (e.delta < 0 && mineHit(e.actor)) sfx("aww", {volume: 0.6});
          else if (e.reason === "bash") say("bash_ticket", 1);
          paint();
          break;
        }
        case "card": {
          state.banner = {kind: "card", actor: e.actor, event: e.kind};
          if (e.kind === "M20") view.direction = view.direction === 1 ? -1 : 1;
          fx("card", where(e.actor));
          sfx("flip"); sfx(e.kind.toLowerCase() as SfxName, {delay: 160});
          if (e.kind === "M14" || e.kind === "M15" || e.kind === "M07") sfx("aww", {delay: 700, volume: 0.55});
          if (e.kind === "M13" || e.kind === "M02" || e.kind === "M16") sfx("cheer", {delay: 600, volume: 0.45});
          say(lines.midway(e.kind), 2);
          paint();
          if (!(await wait(eventDuration(e)))) return false;
          state.banner = null; paint();
          return true;
        }
        case "stall": {
          fx(e.pileup ? "pileup" : "stall", slotPoint(seat(e.actor), e.pos, view.players[e.actor]?.lane ?? "main", length));
          state.banner = {kind: "stall", actor: e.actor, pileup: e.pileup};
          sfx(e.pileup ? "pileup" : "stall"); say(e.pileup ? "stall_pileup" : "stall_out", 2);
          paint();
          if (!(await wait(eventDuration(e)))) return false;
          state.banner = null; paint();
          return true;
        }
        case "lap": {
          const at = where(e.actor);
          fx("lap", {x: at.x, y: at.y - 44}, `${e.delta > 0 ? "+" : "−"}${Math.abs(e.delta)}`, e.delta > 0 ? "good" : "bad");
          state.banner = {kind: "lap", actor: e.actor, delta: e.delta};
          sfx("lap"); sfx(e.delta > 0 ? "ticket" : "ticket-lose", {delay: 300});
          sfx(e.delta > 0 ? "cheer" : "aww", {delay: 200, volume: 0.5});
          say(lines.lap(e.delta), 2);
          paint();
          if (!(await wait(eventDuration(e)))) return false;
          state.banner = null; paint();
          return true;
        }
        case "condition": {
          view.condition = e.condition;
          state.banner = {kind: "condition", condition: e.condition};
          sfx("sign"); sfx("chime", {delay: 400});
          say("rink_new", 3); say(lines.rink(e.condition), 2);
          if (e.condition === "rampage") sfx("alarm", {delay: 900});
          paint();
          if (!(await wait(eventDuration(e)))) return false;
          state.banner = null; paint();
          return true;
        }
        case "draw": {
          if (e.actor === userId) sfx("draw", {volume: 0.6});
          break;
        }
      }
      return wait(eventDuration(e));
    };
    for (const [index, e] of replay.events.entries()) {
      if (!alive()) return;
      if (fairSound.get().animation === "off") { skip(); return; }
      if (e.type !== "reveal" && e.type !== "doubles" && e.type !== "draw" && e.type !== "condition" && !(await go())) return;
      const hold = hooksRef.current?.onBeat?.({type: "event", event: e, index});
      if (!(await playEvent(e))) return;
      if (hold) { await hold; if (!alive()) return; }
    }
    if (!alive()) return;
    if (!(await go())) return;

    // Wrap up: the leaderboard, the finish, or back to picking.
    const final = latest.current;
    state.motion = {}; state.spotlight = null; paint();
    stopCrowd();
    if (final?.phase === "finished") {
      sfx("finish"); sfx("cheer-big", {delay: 300, volume: 0.8}); say("end_checkered", 3);
      if (!(await wait((fairSound.length("end_checkered") + 150) / pace()))) return;
      const winners = final.winners;
      say(winners.length > 1 ? "end_tie" : lines.win(colour(winners[0])), 3);
      if (!(await wait((fairSound.length(winners.length > 1 ? "end_tie" : lines.win(colour(winners[0]))) + 150) / pace()))) return;
      say(winners.includes(userId) ? "end_you_win" : "end_you_lose", 3);
      if (!winners.includes(userId)) sfx("aww", {delay: 900, volume: 0.6});
    } else if (final?.phase === "pick") {
      const leader = (t: Record<string, number>) => {
        const top = Math.max(...Object.values(t)), ids = Object.keys(t).filter(id => t[id] === top);
        return ids.length === 1 ? ids[0] : null;
      };
      const now = Object.fromEntries(final.players.map(p => [p.id, p.tickets]));
      const was = leader(before), is = leader(now);
      if (is && was !== is && Object.keys(before).length) { say(lines.lead(colour(is)), 2); sfx("cheer", {volume: 0.5}); }
      else if (final.players.some(p => p.active && p.handCount <= 1)) say("end_final_round", 2);
      else say(lines.pick(), 1);
    }
    await hooksRef.current?.onBeat?.({type: "end"});
    finish();

    // One car (or Rusty) drives its hidden route from bay to bay.
    async function drive(e: Extract<ReplayEvent, {type: "travel"}>) {
      const actor = e.actor, isRusty = actor === "rusty", s = isRusty ? 0 : seat(actor);
      const path = e.path, first = path[0], last = path[path.length - 1];
      const bay = (p: Pose) => (isRusty ? rustySlot(p.pos, length) : slotPoint(s, p.pos, p.lane, length));
      const from = bay(first), to = bay(last);
      const apply = (p: Pose) => { if (isRusty) view.rusty = p.pos; else view.players[actor] = {...p}; };
      const duration = eventDuration(e) * pace();
      state.spotlight = isRusty ? null : actor;

      if (e.teleport) {
        sfx(last.lane !== first.lane ? (last.lane === "mini" ? "m01" : "m01-grow") : "sparkle");
        fx("poof", from);
        state.motion[actor] = {...from, face: -1, tilt: 0, opacity: 0, scale: 0.4}; paint();
        if (!(await wait(duration / 2 / pace()))) return false;
        fx("poof", to);
        apply(last);
        state.motion[actor] = {...to, face: -1, tilt: 0, opacity: 1, scale: 1.15}; paint();
        if (!(await wait(duration / 2 / pace()))) return false;
        delete state.motion[actor]; paint();
        return true;
      }

      // Unwrap section numbers so a move across the Start Line keeps going forward.
      const stops: number[] = [];
      for (let i = 0; i < path.length; i++) {
        const pos = path[i].pos;
        if (i === 0) { stops.push(pos === 0 ? (path[1]?.pos === 1 ? 0.5 : (path[1]?.pos ?? 1) + 0.5) : pos); continue; }
        const prev = stops[i - 1];
        if (pos === 0) { stops.push(Math.round(prev) % length === 1 ? prev - 0.5 : prev + 0.5); continue; }
        let d = pos - (((Math.round(prev) - 1) % length + length) % length + 1);
        if (d > length / 2) d -= length;
        if (d < -length / 2) d += length;
        stops.push(Math.round(prev) + d);
      }
      const route = isRusty ? (p: number) => rustyRoute(p, length) : last.lane === "mini" ? (p: number) => miniRoute(s, p, length) : (p: number) => carRoute(s, p, length);
      const start = first.pos === 0 && !isRusty ? startPoint(s) : from;
      const steps = path.length - 1;

      const stop = isRusty ? (sfx("rusty-move"), () => {}) : fairSound.loop("drive", 0.32);
      if (isRusty) say(rustyMoves++ ? "rusty_again" : replay.round <= 1 ? "rusty_intro" : lines.rustyMove(steps), 2);
      if (!isRusty && steps >= 4) sfx("squeak", {delay: duration * 0.45, volume: 0.6});

      let face: 1 | -1 = -1, prev = start, crossed = 0;
      await new Promise<void>(resolve => {
        let t0: number | undefined;
        const frame = (now: number) => {
          if (!alive()) { stop(); resolve(); return; }
          t0 ??= now;
          const t = Math.min(1, (now - t0) / duration), k = ease(t);
          const here = travelPoint(route, start, to, stops, k, isRusty ? "main" : last.lane);
          const dx = here.x - prev.x, dy = here.y - prev.y;
          if (Math.abs(dx) > 0.4) face = dx > 0 ? 1 : -1;
          const tilt = Math.max(-16, Math.min(16, Math.atan2(dy, Math.abs(dx) + 0.001) * 57.3 * 0.45));
          prev = here;
          state.motion[actor] = {x: here.x, y: here.y, face: isRusty ? (face === 1 ? -1 : 1) : face, tilt};
          // Ding when a car crosses the Start Line part-way through the move.
          const index = Math.min(steps, Math.floor(k * steps + 0.5));
          for (; crossed < index; crossed++) {
            const a = path[crossed], b = path[crossed + 1];
            if (!isRusty && a && b && a.lap !== b.lap) { sfx("lap", {volume: 0.7}); fx("sparkle", startPoint(s)); }
          }
          paint();
          if (t < 1) requestAnimationFrame(frame);
          else { stop(); resolve(); }
        };
        requestAnimationFrame(frame);
      });
      if (!alive()) return false;
      apply(last);
      delete state.motion[actor]; paint();
      return true;
    }
  }, [skip, userId]);

  useLayoutEffect(() => {
    if (!game) return;
    const before = tickets.current;
    tickets.current = Object.fromEntries(game.players.map(p => [p.id, p.tickets]));
    if (previous.current === null) { previous.current = `${game.replay?.round ?? 0}:${game.replay?.sequence ?? 0}`; return; }
    const was = previous.current;
    previous.current = `${game.replay?.round ?? 0}:${game.replay?.sequence ?? 0}`;
    if (game.replay && `${game.replay.round}:${game.replay.sequence ?? 0}` !== was && fairSound.get().animation !== "off") void run(game.replay, before);
  }, [game?.round, game?.replay?.round, game?.replay?.sequence, run]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const hidden = () => { if (document.hidden) skip(); };
    document.addEventListener("visibilitychange", hidden);
    return () => { if (cutoff.current) clearTimeout(cutoff.current); token.current++; fairSound.cancel(); document.removeEventListener("visibilitychange", hidden); };
  }, [skip]);
  useEffect(() => fairSound.subscribe(() => { if (fairSound.get().animation === "off") skip(); }), [skip]);

  return {...show, skip, replay: () => { if (latest.current?.replay) void run(latest.current.replay, {}); }};
}
