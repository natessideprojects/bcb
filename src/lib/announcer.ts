// Picks announcer lines for game moments.
//
// Each moment has a pool of takes. A pick never repeats the most recent takes from
// that pool, long takes come up less often than short ones (they're the ones that
// get cut off when the action moves on), and a caller can ask for a take that fits
// the time the moment is on screen. Takes not recorded yet (missing from the audio
// manifest) are skipped, so new ElevenLabs lines join the rotation as soon as
// their files land in public/audio/vo/.
import type {Condition, EventId} from "./game/catalog";
import {VO, type VoClip} from "./audio-manifest";

type Take = VoClip | (string & {});
const length = (clip: VoClip) => (VO as Record<string, number>)[clip];
const recorded = (take: Take): take is VoClip => take in VO;
/** Takes longer than this (ms) are "long": they play about a third as often when a short one is available. */
export const LONG_TAKE = 2400;
const recent = new Map<string, VoClip[]>();

/** One take from a pool, or undefined when none of its takes are recorded yet. `fit` is the time available (ms). */
export function choose(pool: readonly Take[], fit?: number): VoClip | undefined {
  const ready = pool.filter(recorded);
  if (!ready.length) return undefined;
  const key = pool.join("|"), seen = recent.get(key) ?? [];
  let options = ready.filter(take => !seen.includes(take));
  if (!options.length) options = ready;
  if (fit !== undefined) {
    const fits = options.filter(take => length(take) <= fit);
    options = fits.length ? fits : [ready.reduce((a, b) => (length(a) <= length(b) ? a : b))];
  }
  const short = options.some(take => length(take) <= LONG_TAKE);
  const weight = (take: VoClip) => (short && length(take) > LONG_TAKE ? 0.35 : 1);
  let roll = Math.random() * options.reduce((sum, take) => sum + weight(take), 0), pick = options[0];
  for (const take of options) { roll -= weight(take); if (roll <= 0) { pick = take; break; } }
  // Remember about half the pool, so a take sits out a few turns before it can return.
  recent.set(key, [pick, ...seen].slice(0, Math.max(1, Math.floor(ready.length / 2))));
  return pick;
}

// Generic takes shared by several moments.
const BACKWARD = ["knock_back_2", "knock_back_3", "knock_back_5"] as const; // "Back you go!" "Reverse! Reverse!" "Wrong way, buddy!"
const FORWARD = ["push_forward_1", "push_forward_2", "push_forward_3"] as const; // "Bounced forward!" "Shoved ahead!" "Free ride!"

export const POOLS = {
  reveal: ["round_reveal_1", "round_reveal_2"],
  go: ["round_go_1", "round_go_2", "round_go_3", "round_go_4"],
  pick: ["round_pick_1", "round_pick_2", "round_pick_3", "round_pick_4"],
  // Midway cards for Doubles are drawn after the moves, so these never say "grab a card now".
  doubles: ["doubles_2", "doubles_3", "doubles_4"],
  doublesLast: ["doubles_last"],
  bash: ["bash_1", "bash_2", "bash_3", "bash_4", "bash_head_on", "bash_5", "bash_6", "bash_8"],
  pay: ["pay_up", "pay_up_2", "pay_up_3"],
  knock: ["knock_back_1", ...BACKWARD],
  knockFar: ["bash_far", "knock_far_1", "knock_far_2"],
  karma: ["karma_forward", ...FORWARD],
  grease: ["hazard_grease_1", "hazard_grease_2", "hazard_grease_3"],
  tilt: ["hazard_tilt", "hazard_tilt_2"],
  tiltBack: ["hazard_tilt_back", ...BACKWARD],
  tiltForward: ["hazard_tilt_forward", ...FORWARD],
  tiltStay: ["hazard_tilt_stay"],
  rustyLow: ["rusty_low", "rusty_low_2", "rusty_low_3", "rusty_low_5"],
  rustyMove: ["rusty_move_1", "rusty_move_2", "rusty_never", "rusty_move_3", "rusty_move_4"],
  rustyHigh: ["rusty_high", "rusty_high_2"],
  lap: ["lap_complete", "lap_another", "lap_complete_2"],
  lapBack: ["lap_backward", "lap_backward_2"],
} as const satisfies Record<string, readonly Take[]>;

// Each Midway card's name line, plus alternates drawn from the flavor text on the original 2017 cards.
const MIDWAY: Record<EventId, readonly Take[]> = {
  M01: ["midway_m01_honey", "midway_m01_raygun"], M02: ["midway_m02_lead_foot"], M03: ["midway_m03_power_surge"],
  M04: ["midway_m04_power_outage"], M05: ["midway_m05_carnie"], M06: ["midway_m06_crazy_wheels", "midway_m06_quagmire"],
  M07: ["midway_m07_safety", "midway_m07_loser"], M08: ["midway_m08_disco", "midway_m08_blinded"],
  M09: ["midway_m09_groundhog", "midway_m09_phil"], M10: ["midway_m10_one_louder", "midway_m10_rock"],
  M11: ["midway_m11_karma"], M12: ["midway_m12_daddy"], M13: ["midway_m13_token"], M14: ["midway_m14_hungry_seat"],
  M15: ["midway_m15_kid_vomit"], M16: ["midway_m16_super_bash"], M17: ["midway_m17_double_bash"],
  M18: ["midway_m18_rain_delay"], M19: ["midway_m19_sauron", "midway_m19_fools"], M20: ["midway_m20_oz"],
};

/** Pools with at least one recorded take always return a clip. */
const take = (pool: readonly Take[], fit?: number) => choose(pool, fit)!;

export const lines = {
  reveal: () => take(POOLS.reveal),
  go: () => take(POOLS.go),
  pick: () => take(POOLS.pick),
  doubles: (last = false) => (last && choose(POOLS.doublesLast)) || take(POOLS.doubles),
  bash: (fit?: number) => take(POOLS.bash, fit),
  pay: () => take(POOLS.pay),
  /** A bashed car flying back (or, with Karma Bash, forward). Undefined until those takes are recorded. */
  knock: (steps: number, forward: boolean, fit?: number) => (forward ? choose(POOLS.karma, fit) : steps >= 5 ? choose(POOLS.knockFar, fit) : choose(POOLS.knock, fit)),
  grease: (fit?: number) => take(POOLS.grease, fit),
  tilt: (fit?: number) => take(POOLS.tilt, fit),
  tiltResult: (roll: number) => take(roll < 3 ? POOLS.tiltBack : roll > 4 ? POOLS.tiltForward : POOLS.tiltStay),
  rustyMove: (roll: number, fit?: number) => take(roll <= 2 ? POOLS.rustyLow : roll >= 5 ? POOLS.rustyHigh : POOLS.rustyMove, fit),
  lap: (delta: number, fit?: number) => take(delta < 0 ? POOLS.lapBack : POOLS.lap, fit),
  midway: (kind: EventId, fit?: number) => take(MIDWAY[kind], fit),
  rink: (c: Condition) => `rink_${c}` as VoClip,
  /** "Driver two!" Names the driver (by their fixed race number) an event is happening to. */
  who: (seat: number): VoClip => (["who_1", "who_2", "who_3", "who_4", "who_5", "who_6"] as const)[Math.min(5, Math.max(0, seat))],
};

/** Every take the pools can ask for, recorded or not (for the script and cue sheet). */
export const ALL_TAKES: readonly string[] = [...new Set([...Object.values(POOLS).flat(), ...Object.values(MIDWAY).flat()])];
