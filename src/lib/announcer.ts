// Picks announcer lines for game moments, rotating through the variants so the
// same line doesn't repeat back to back.
import type {Condition, EventId} from "./game/catalog";
import type {VoClip} from "./audio-manifest";

let turn = 0;
export const rotate = <T,>(options: readonly T[]): T => options[turn++ % options.length];

const MIDWAY: Record<EventId, VoClip> = {
  M01: "midway_m01_honey", M02: "midway_m02_lead_foot", M03: "midway_m03_power_surge", M04: "midway_m04_power_outage",
  M05: "midway_m05_carnie", M06: "midway_m06_crazy_wheels", M07: "midway_m07_safety", M08: "midway_m08_disco",
  M09: "midway_m09_groundhog", M10: "midway_m10_one_louder", M11: "midway_m11_karma", M12: "midway_m12_daddy",
  M13: "midway_m13_token", M14: "midway_m14_hungry_seat", M15: "midway_m15_kid_vomit", M16: "midway_m16_super_bash",
  M17: "midway_m17_double_bash", M18: "midway_m18_rain_delay", M19: "midway_m19_sauron", M20: "midway_m20_oz",
};

export const lines = {
  reveal: () => rotate(["round_reveal_1", "round_reveal_2"] as const),
  go: () => rotate(["round_go_1", "round_go_2", "round_go_3", "round_go_4"] as const),
  pick: () => rotate(["round_pick_1", "round_pick_2"] as const),
  doubles: () => rotate(["doubles_1", "doubles_2"] as const),
  bash: () => rotate(["bash_1", "bash_3", "bash_2", "bash_4", "bash_1", "bash_head_on"] as const),
  grease: () => rotate(["hazard_grease_1", "hazard_grease_2"] as const),
  rustyMove: (roll: number): VoClip => roll <= 2 ? "rusty_low" : roll >= 6 ? "rusty_jump" : roll === 5 ? "rusty_high" : rotate(["rusty_move_1", "rusty_move_2", "rusty_never"] as const),
  lap: (delta: number): VoClip => delta < 0 ? "lap_backward" : rotate(["lap_complete", "lap_another"] as const),
  midway: (kind: EventId) => MIDWAY[kind],
  rink: (c: Condition) => `rink_${c}` as VoClip,
  /** "Driver two!" Names the driver (by their fixed race number) an event is happening to. */
  who: (seat: number): VoClip => (["who_1", "who_2", "who_3", "who_4", "who_5", "who_6"] as const)[Math.min(5, Math.max(0, seat))],
};
