"use client";
// Plays back a resolved round on the rink: card reveals, the GO beat, every car
// driving its hidden route, bashes, hazards, tickets, Midway cards and the Rink
// Sign. Each beat has an animation, a sound effect and (when it matters) a line
// from the announcer.
import {useCallback, useEffect, useLayoutEffect, useRef, useState} from "react";
import {replayBudget} from "@/lib/game/engine";
import type {PublicGame, ReplayEvent, RollPurpose, RoundReplay, Visual, Pose} from "@/lib/game/engine";
import {CONDITIONS, EVENTS, type Condition, type EventId} from "@/lib/game/catalog";
import {fairSound, type Part, type SfxName, type VoClip} from "@/lib/fair-audio";
import {lines, rotate} from "@/lib/announcer";
import {DICE_HOLD, DICE_TUMBLE, GO_BEAT, ROLL_WAIT, eventDuration} from "@/lib/game/presentation";
import {carRoute, miniRoute, rustyRoute, rustySlot, slotPoint, startPoint, travelPoint, type Pt} from "@/lib/game/rink";

export type Motion = {x: number; y: number; face: 1 | -1; tilt: number; opacity?: number; scale?: number};
export type FxKind = "bash" | "rusty-bash" | "grease" | "tilt" | "dead" | "tickets" | "lap" | "stall" | "pileup" | "poof" | "sparkle" | "card";
export type Fx = {id: number; kind: FxKind; x: number; y: number; text?: string; tone?: "good" | "bad"};
export type Reveal = {actor: string; value: number; extra?: number; boost?: EventId; auto?: boolean};
export type Banner =
  | {kind: "go"}
  | {kind: "doubles"; actors: string[]; value: number}
  | {kind: "card"; actor: string; event: EventId}
  | {kind: "condition"; condition: Condition}
  | {kind: "hazard"; actor: string; hazard: "grease" | "tilt" | "dead"; roll?: number; result: string}
  | {kind: "lap"; actor: string; delta: number}
  | {kind: "stall"; actor: string; pileup: boolean};
/** Play-by-play text under the rink. `{who}` parts render as the driver's seat chip and name. */
export type CaptionPart = string | {who: string};
export type Caption = {id: number; parts: CaptionPart[]; tone?: "bash" | "good" | "bad"};
export type Theater = {
  active: boolean; round: number; visual: Visual | null; motion: Record<string, Motion>; fx: Fx[];
  banner: Banner | null; reveals: Reveal[]; revealed: number; spotlight: string | null; shake: string | null;
  /** Running ticket counts while the round plays, so exchanges show as they happen. */
  tickets: Record<string, number> | null; caption: Caption | null;
  /** The die (or dice, for a tied flag) on the table right now. */
  dice: DiceView | null; held: boolean;
};
/**
 * A die roll on screen. The server rolled it when the round resolved; the viewer's
 * own die waits for their click (or `waitMs`, then rolls itself) before it tumbles.
 */
export type DiceView = {
  id: number; purpose: RollPurpose; rolls: {actor: string; value: number}[]; phase: "waiting" | "rolling" | "done";
  mine: boolean; waitMs: number; auto?: boolean; multiplier?: number; bonus?: number; card?: number;
};
/** A narration hook point: the tutorial uses these to time its speech bubbles. */
export type Beat = {type: "event"; event: ReplayEvent; index: number} | {type: "go"} | {type: "end"};
export type ReplayHooks = {onBeat?: (beat: Beat) => Promise<void> | void; noCutoff?: boolean; rollWait?: () => number};
const idle: Theater = {active: false, round: 0, visual: null, motion: {}, fx: [], banner: null, reveals: [], revealed: 0, spotlight: null, shake: null, tickets: null, caption: null, dice: null, held: false};
const tix = (n: number) => `${n} ticket${n === 1 ? "" : "s"}`;
const secs = (n: number) => `${n} section${n === 1 ? "" : "s"}`;
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
  // When the Quick Race cutoff fires; paused while a card is held open, so reading doesn't eat the show.
  const cutoffAt = useRef(0), cutoffToken = useRef(0);
  const held = useRef(false), heldSince = useRef(0), rollNow = useRef<(() => void) | null>(null);
  const skip = useCallback(() => { if (cutoff.current) clearTimeout(cutoff.current); token.current++; held.current = false; rollNow.current = null; fairSound.cancel(); setShow(idle); }, []);
  const armCutoff = useCallback((ms: number, mine: number) => {
    if (cutoff.current) clearTimeout(cutoff.current);
    cutoffAt.current = Date.now() + ms; cutoffToken.current = mine;
    cutoff.current = setTimeout(() => { if (token.current === mine) skip(); }, ms);
  }, [skip]);
  /** Pause the show (a Midway card held open to read) or resume it. */
  const hold = useCallback((on: boolean) => {
    if (held.current === on) return;
    held.current = on;
    if (on) { heldSince.current = Date.now(); if (cutoff.current) clearTimeout(cutoff.current); }
    else if (cutoffAt.current && cutoffToken.current === token.current && !hooksRef.current?.noCutoff) {
      cutoffAt.current += Date.now() - heldSince.current;
      armCutoff(Math.max(1000, cutoffAt.current - Date.now()), cutoffToken.current);
    }
    setShow(s => (s.active ? {...s, held: on} : s));
  }, [armCutoff]);
  /** Roll your own die now (instead of waiting for it to roll itself). */
  const roll = useCallback(() => { rollNow.current?.(); }, []);

  const run = useCallback(async (replay: RoundReplay, before: Record<string, number>) => {
    if (cutoff.current) clearTimeout(cutoff.current);
    const mine = ++token.current;
    held.current = false;
    if (!hooksRef.current?.noCutoff) armCutoff(replayBudget(replay, latest.current?.players.filter(p => !p.bot).map(p => p.id)), mine);
    fairSound.cancel();
    const alive = () => token.current === mine;
    // Ending the show retires this run's token, so effect timers that fire later
    // (ticket floaters, sparkles) can never switch replay mode back on and lock the hand.
    const finish = () => { if (!alive()) return; if (cutoff.current) clearTimeout(cutoff.current); token.current++; setShow(idle); };
    const g = latest.current;
    if (!g) { finish(); return; }
    const length = g.trackLength || 28;
    const seat = (id: string) => g.players.find(p => p.id === id)?.seat ?? 0;
    const pace = () => (fairSound.get().animation === "fast" ? 0.5 : 1);
    // Waits run in small steps so a held-open card pauses the show.
    const wait = async (ms: number) => {
      let left = ms * pace();
      while (left > 0) {
        const step = Math.min(left, 100);
        await new Promise(r => setTimeout(r, step));
        if (!alive()) return false;
        if (!held.current) left -= step;
      }
      return alive();
    };
    const sfx = (name: SfxName, opts?: {volume?: number; rate?: number; delay?: number}) => fairSound.effect(name, opts);
    const say = (line: Part | Part[], priority = 1) => fairSound.say(line, priority);
    // "Driver two!" ahead of the line, so everyone hears who it's happening to. Drivers
    // are called by number, not colour: a car skin can change a car's colour.
    const named = (id: string | null, ...rest: Part[]): Part[] => (id && id !== "rusty" && g.players.some(p => p.id === id) ? [lines.who(seat(id)), ...rest] : rest);

    const view = copy(replay.initial);
    const state: Theater = {...idle, active: true, round: replay.round, visual: view, tickets: replay.initial.tickets ? {...replay.initial.tickets} : null};
    const paint = () => { if (alive()) setShow({...state, visual: copy(view), motion: {...state.motion}, fx: [...state.fx], tickets: state.tickets && {...state.tickets}, held: held.current}); };
    let captionSeq = 0;
    const call = (parts: CaptionPart[], tone?: Caption["tone"]) => { state.caption = {id: ++captionSeq, parts, tone}; };
    const setTickets = (id: string, total: number | undefined, delta: number) => {
      if (!state.tickets) return;
      state.tickets[id] = total ?? Math.max(0, (state.tickets[id] ?? 0) + delta);
    };
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
    state.reveals = reveals.map(({actor, value, extra, boost, auto}) => ({actor, value, extra, boost, auto}));
    paint();
    const stopCrowd = fairSound.loop("crowd", 0.17);
    const mineHit = (id: string | null) => id === userId;

    let started = false, rustyMoves = 0, lastBashVictim: string | null = null, lastKnock = false, rustyKnocked = false, diceSeq = 0, afterRustyRoll = false;
    let karma: string | null = null, slid: Extract<ReplayEvent, {type: "hazard"}> | null = null;
    const drove = new Set<string>();
    const go = async () => {
      if (started) return true;
      started = true;
      if (state.reveals.length) call(["GO! ", {who: state.reveals[0].actor}, " has Flag 1 and moves first"]);
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
          state.revealed++; state.spotlight = e.actor;
          call([{who: e.actor}, ` plays ${e.value}${e.extra ? ` + ${e.extra}` : ""}${e.boost ? ` with ${EVENTS[e.boost].name}` : ""}`, e.auto ? " (time ran out: lowest card played)" : "", ` · Flag ${state.revealed}`]);
          paint();
          sfx("flip");
          if (e.boost) sfx("sparkle", {delay: 220});
          break;
        }
        case "doubles": {
          state.banner = {kind: "doubles", actors: e.actors, value: e.value};
          call([...e.actors.flatMap((id, i): CaptionPart[] => [i ? (i === e.actors.length - 1 ? " & " : ", ") : "", {who: id}]), ` both played ${e.value}: Doubles! Midway cards after the moves`], "good");
          paint();
          fairSound.doubles(); say(lines.doubles(), 2);
          if (!(await wait(eventDuration(e)))) return false;
          state.banner = null; paint();
          return true;
        }
        case "travel": {
          lastKnock = lastBashVictim === e.actor;
          const steps = e.path.length - 1, last = e.path[steps];
          const knockedAway = e.actor === "rusty" && rustyKnocked;
          // (After Rusty's roll the caption already says how far he reverses.)
          if (e.actor === "rusty") { if (knockedAway) call([`The bash sends Rusty careening ${secs(steps)} across the rink to section ${last.pos}`]); else if (e.teleport) call([`Rusty runs off to section ${last.pos}`]); else if (!afterRustyRoll) call([`Rusty reverses ${secs(steps)}`]); }
          else if (e.teleport) {
            const first = e.path[0];
            call([{who: e.actor}, last.lane !== first.lane ? (last.lane === "mini" ? " shrinks onto the mini-track" : " grows back to full size") : last.pos === 0 ? " goes back to the Start Grid" : ` takes the open section ${last.pos}`]);
          } else {
            let verb = "moves";
            if (lastKnock) verb = karma === e.actor ? "rides the Karma forward" : "is knocked back";
            else if (slid?.actor === e.actor) verb = slid.kind === "grease" ? "slides" : slid.result === "back" ? "spins back" : "is flung forward";
            else if (!drove.has(e.actor)) { verb = "drives"; drove.add(e.actor); say(named(e.actor), 1); }
            call([{who: e.actor}, ` ${verb} ${secs(steps)}`]);
          }
          karma = null; slid = null; rustyKnocked = false;
          paint();
          if (!(await drive(e, knockedAway))) return false;
          if (lastKnock && !knockedAway && e.path.length - 1 >= 5) say("bash_far", 1);
          lastBashVictim = null;
          return true;
        }
        case "bash": {
          const at = e.victim === "rusty" ? rustySlot(view.rusty, length) : where(e.victim);
          // `by` is the driver whose move started it; a different hitter means a chain reaction.
          const chain = !!e.actor && (e.by !== undefined ? e.actor !== e.by : lastKnock);
          fx(e.actor ? "bash" : "rusty-bash", at);
          state.shake = e.victim;
          if (e.victim === "rusty") call([{who: e.actor!}, " bashes Rusty!"], "bash");
          else if (!e.actor) call(["Rusty bashes ", {who: e.victim}, "!"], "bash");
          else if (chain) call(["Chain reaction! ", {who: e.actor}, " crashes into ", {who: e.victim}], "bash");
          else call([{who: e.actor}, " bashes ", {who: e.victim}, "!"], "bash");
          paint();
          if (!e.actor) { sfx("rusty-bash"); say("rusty_bash", 2); }
          else { sfx("bash"); sfx("bonk", {delay: 60, volume: 0.6}); say(chain ? "bash_chain" : named(e.actor, lines.bash()), 2); }
          if (mineHit(e.victim)) sfx("aww", {delay: 250, volume: 0.8}); else sfx("roar", {delay: 120, volume: 0.55});
          lastBashVictim = e.victim;
          if (e.victim === "rusty") rustyKnocked = true;
          if (!(await wait(eventDuration(e)))) return false;
          state.shake = null; paint();
          return true;
        }
        case "hazard": {
          const at = slotPoint(seat(e.actor), e.pos, e.lane, length);
          fx(e.kind, at);
          state.banner = {kind: "hazard", actor: e.actor, hazard: e.kind, roll: e.roll, result: e.result};
          slid = e;
          if (e.kind === "grease") { call([{who: e.actor}, " hits the Grease and slides"]); sfx("grease"); say(named(e.actor, lines.grease()), 2); sfx("roar", {delay: 300, volume: 0.35}); }
          if (e.kind === "tilt") { call([{who: e.actor}, " lands on the Tilt-A-Whirl: roll 1–2 to spin back, 3–4 to hold, 5–6 to fly forward"]); sfx("tilt"); say(named(e.actor, "hazard_tilt"), 2); }
          if (e.kind === "dead") { call([{who: e.actor}, e.result === "paid" ? " hits a Dead Zone: the power’s out!" : " hits a Dead Zone and sits out next round"], "bad"); sfx("dead"); say(named(e.actor, e.result === "paid" ? "hazard_dead_paid" : "hazard_dead_sitout"), 2); if (e.result === "skip") sfx("aww", {delay: 400, volume: 0.6}); }
          paint();
          if (!(await wait(eventDuration(e)))) return false;
          state.banner = null; paint();
          return true;
        }
        case "tickets": {
          const at = where(e.actor);
          setTickets(e.actor, e.total, e.delta);
          fx("tickets", {x: at.x, y: at.y - 40}, `${e.delta > 0 ? "+" : "−"}${Math.abs(e.delta)}`, e.delta > 0 ? "good" : "bad");
          sfx(e.delta > 0 ? "ticket" : "ticket-lose");
          const n = Math.abs(e.delta);
          call([{who: e.actor}, e.reason === "bounty" ? ` collects Rusty’s ${n}-ticket bounty` : e.reason === "dead" ? ` pays ${tix(n)} to keep rolling` : e.reason === "prize" ? ` collects ${tix(n)} from the Prize Wheel` : e.delta > 0 ? ` gets ${tix(n)}` : ` loses ${tix(n)}`], e.delta > 0 ? "good" : "bad");
          if (e.reason === "bounty") { say("rusty_bashed", 2); sfx("cheer", {volume: 0.6}); }
          else if (e.delta < 0 && mineHit(e.actor)) sfx("aww", {volume: 0.6});
          else if (e.reason === "bash") say("bash_ticket", 1);
          paint();
          break;
        }
        case "pay": {
          // The bashed car hands over its ticket(s): to the driver who caused the hit, or to Rusty.
          for (const [id, total] of Object.entries(e.totals)) setTickets(id, total, 0);
          const due = e.paid + e.bank, from = where(e.from);
          if (e.paid) fx("tickets", {x: from.x, y: from.y - 40}, `−${e.paid}`, "bad");
          if (e.to) { const to = where(e.to); fx("tickets", {x: to.x, y: to.y - 40}, `+${due}`, "good"); }
          if (e.paid) sfx("ticket-lose");
          if (e.to) sfx("ticket", {delay: 260});
          if (e.to) call(e.paid === 0 ? [{who: e.from}, " is out of tickets, so the bank pays ", {who: e.to}, ` ${tix(due)}`] : e.bank ? [{who: e.from}, ` pays ${e.paid} and the bank adds ${e.bank} for `, {who: e.to}] : [{who: e.from}, " pays ", {who: e.to}, ` ${tix(e.paid)}`], "good");
          else call(e.paid ? [{who: e.from}, ` loses ${tix(e.paid)} to Rusty`] : [{who: e.from}, " has no tickets for Rusty to take"], "bad");
          if (e.paid) say([lines.who(seat(e.from)), {clip: "pay_up", fallback: e.to ? "bash_ticket" : undefined}], 1);
          else if (e.to) say("bash_ticket", 1);
          if (e.paid && mineHit(e.from)) sfx("aww", {delay: 200, volume: 0.6});
          paint();
          break;
        }
        case "card": {
          state.banner = {kind: "card", actor: e.actor, event: e.kind};
          if (e.kind === "M11") karma = e.actor;
          call([{who: e.actor}, ` · ${EVENTS[e.kind].name} (${EVENTS[e.kind].type})`]);
          if (e.kind === "M20") view.direction = view.direction === 1 ? -1 : 1;
          fx("card", where(e.actor));
          sfx("flip"); sfx(e.kind.toLowerCase() as SfxName, {delay: 160});
          if (e.kind === "M14" || e.kind === "M15" || e.kind === "M07") sfx("aww", {delay: 700, volume: 0.55});
          if (e.kind === "M13" || e.kind === "M02" || e.kind === "M16") sfx("cheer", {delay: 600, volume: 0.45});
          say(named(e.actor, lines.midway(e.kind)), 2);
          paint();
          if (!(await wait(eventDuration(e)))) return false;
          state.banner = null; paint();
          return true;
        }
        case "stall": {
          fx(e.pileup ? "pileup" : "stall", slotPoint(seat(e.actor), e.pos, view.players[e.actor]?.lane ?? "main", length));
          state.banner = {kind: "stall", actor: e.actor, pileup: e.pileup};
          call([{who: e.actor}, e.pileup ? " joins a pile-up and stalls" : " stalls out"], "bad");
          sfx(e.pileup ? "pileup" : "stall"); say(named(e.actor, e.pileup ? "stall_pileup" : "stall_out"), 2);
          paint();
          if (!(await wait(eventDuration(e)))) return false;
          state.banner = null; paint();
          return true;
        }
        case "lap": {
          const at = where(e.actor);
          fx("lap", {x: at.x, y: at.y - 44}, `${e.delta > 0 ? "+" : "−"}${Math.abs(e.delta)}`, e.delta > 0 ? "good" : "bad");
          state.banner = {kind: "lap", actor: e.actor, delta: e.delta};
          setTickets(e.actor, e.total, e.delta);
          call([{who: e.actor}, e.delta > 0 ? ` completes ${e.delta === 1 ? "a lap" : `${e.delta} laps`}: +${tix(e.delta)}` : ` crosses the line backward: −${tix(-e.delta)}`], e.delta > 0 ? "good" : "bad");
          sfx("lap"); sfx(e.delta > 0 ? "ticket" : "ticket-lose", {delay: 300});
          sfx(e.delta > 0 ? "cheer" : "aww", {delay: 200, volume: 0.5});
          say(named(e.actor, lines.lap(e.delta)), 2);
          paint();
          if (!(await wait(eventDuration(e)))) return false;
          state.banner = null; paint();
          return true;
        }
        case "condition": {
          view.condition = e.condition;
          state.banner = {kind: "condition", condition: e.condition};
          call(["New Rink Condition: ", CONDITIONS[e.condition].name]);
          sfx("sign"); sfx("chime", {delay: 400});
          say("rink_new", 3); say(lines.rink(e.condition), 2);
          if (e.condition === "rampage") sfx("alarm", {delay: 900});
          paint();
          if (!(await wait(eventDuration(e)))) return false;
          state.banner = null; paint();
          return true;
        }
        case "roll": {
          // Each die: the viewer's own waits for a click (or rolls itself), everyone else's just rolls.
          const mine = e.rolls.some(r => r.actor === userId);
          const waitMs = mine ? (hooksRef.current?.rollWait?.() ?? ROLL_WAIT) : 0;
          const roller = e.rolls.length === 1 ? e.rolls[0].actor : null;
          state.dice = {id: ++diceSeq, purpose: e.purpose, rolls: e.rolls, phase: mine ? "waiting" : "rolling", mine, waitMs, multiplier: e.multiplier, bonus: e.bonus, card: e.card};
          state.caption = null;
          if (roller && roller !== "rusty") state.spotlight = roller;
          paint();
          if (mine) {
            const auto = await new Promise<boolean>(resolve => {
              let done = false;
              const end = (auto: boolean) => { if (done) return; done = true; clearTimeout(timer); clearInterval(watch); if (rollNow.current === click) rollNow.current = null; resolve(auto); };
              const click = () => end(false);
              const timer = setTimeout(() => end(true), waitMs);
              const watch = setInterval(() => { if (!alive()) end(true); }, 200);
              rollNow.current = click;
            });
            if (!alive()) return false;
            state.dice = {...state.dice!, phase: "rolling", auto}; paint();
          }
          sfx("dice", {volume: 0.85});
          if (!(await wait(DICE_TUMBLE))) return false;
          state.dice = {...state.dice!, phase: "done"};
          const v = e.rolls[0].value, who: CaptionPart = roller === "rusty" || !roller ? "Rusty" : {who: roller};
          if (e.purpose === "knockback") {
            const total = v * (e.multiplier ?? 1) + (e.bonus ?? 0);
            call([who, ` rolls ${v}: knocked back ${total === v ? secs(v) : `${v}${e.multiplier ? ` × ${e.multiplier}` : ""}${e.bonus ? ` + ${e.bonus}` : ""} = ${secs(total)}`}`], "bash");
          } else if (e.purpose === "tilt") {
            call([who, ` rolls ${v}: ${v < 3 ? "spun backward!" : v > 4 ? "flung forward!" : "holding steady"}`]);
            say(v < 3 ? "hazard_tilt_back" : v > 4 ? "hazard_tilt_forward" : "hazard_tilt_stay", 2);
          } else if (e.purpose === "escape") {
            call([who, ` rolls ${v} to escape the stall: ${v >= 4 ? "back in action!" : "still stalled"}`], v >= 4 ? "good" : "bad");
            if (v >= 4) say(named(roller, "stall_free"), 2);
          } else if (e.purpose === "rusty") {
            call([`Rusty rolls ${v}: he reverses ${secs(v)}`]);
          } else {
            const best = Math.max(...e.rolls.map(r => r.value)), top = e.rolls.filter(r => r.value === best);
            call(top.length > 1 ? [`Tied again at ${best}! Roll again`] : [{who: top[0].actor}, ` rolls ${best} and takes the earlier flag`]);
          }
          paint();
          if (!(await wait(DICE_HOLD + (e.rolls.length > 1 ? 400 : 0)))) return false;
          state.dice = null; state.spotlight = null; paint();
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
      afterRustyRoll = index > 0 && replay.events[index - 1].type === "roll" && (replay.events[index - 1] as Extract<ReplayEvent, {type: "roll"}>).purpose === "rusty";
      if (!(await playEvent(e))) return;
      if (hold) { await hold; if (!alive()) return; }
    }
    if (!alive()) return;
    if (!(await go())) return;

    // Wrap up: the leaderboard, the finish, or back to picking.
    const final = latest.current;
    state.motion = {}; state.spotlight = null; state.caption = null; paint();
    stopCrowd();
    if (final?.phase === "finished") {
      sfx("finish"); sfx("cheer-big", {delay: 300, volume: 0.8}); say("end_checkered", 3);
      if (!(await wait((fairSound.length("end_checkered") + 150) / pace()))) return;
      // "Driver two! You win the Blue Ribbon!" Drivers are named by number: a skin can change a car's colour.
      const winners = final.winners, single = winners.length === 1;
      const winLine: VoClip[] = single ? [lines.who(seat(winners[0])), "end_you_win"] : ["end_tie"];
      say(winLine, 3);
      if (!(await wait((winLine.reduce((ms, clip) => ms + fairSound.length(clip), 0) + 150) / pace()))) return;
      if (!winners.includes(userId)) { say("end_you_lose", 3); sfx("aww", {delay: 900, volume: 0.6}); }
      else if (!single) say("end_you_win", 3);
    } else if (final?.phase === "pick") {
      const leader = (t: Record<string, number>) => {
        const top = Math.max(...Object.values(t)), ids = Object.keys(t).filter(id => t[id] === top);
        return ids.length === 1 ? ids[0] : null;
      };
      const now = Object.fromEntries(final.players.map(p => [p.id, p.tickets]));
      const was = leader(before), is = leader(now);
      if (is && was !== is && Object.keys(before).length) {
        say(["lap_new_leader", lines.who(seat(is))], 2); // "We've got a new leader! Driver two!"
        sfx("cheer", {volume: 0.5});
      }
      else if (final.players.some(p => p.active && p.handCount <= 1)) say("end_final_round", 2);
      else say(lines.pick(), 1);
    }
    await hooksRef.current?.onBeat?.({type: "end"});
    finish();

    // One car (or Rusty) drives its hidden route from bay to bay.
    async function drive(e: Extract<ReplayEvent, {type: "travel"}>, knockedAway = false) {
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
      if (knockedAway) say("rusty_jump", 2); // "And Rusty's off to the far side!"
      else if (isRusty) say(rustyMoves++ ? "rusty_again" : replay.round <= 1 ? "rusty_intro" : lines.rustyMove(steps), 2);
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
  }, [skip, userId, armCutoff]);

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

  return {...show, skip, hold, roll, replay: () => { if (latest.current?.replay) void run(latest.current.replay, {}); }};
}
