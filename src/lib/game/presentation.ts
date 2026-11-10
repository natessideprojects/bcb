import {VO} from "../audio-manifest";
import type {ReplayEvent} from "./engine";

// How long each replay beat lasts on screen (ms). The server uses the same
// numbers to reserve replay time in Quick Race deadlines, so keep them modest.
export const GO_BEAT = 2900;
export function travelDuration(steps: number, teleport?: boolean) {
  if (teleport) return 520;
  return Math.min(3400, Math.max(650, steps * 260));
}
export function eventDuration(e: ReplayEvent): number {
  switch (e.type) {
    case "reveal": return 560 + (e.boost ? 450 : 0) + (e.extra ? 300 : 0);
    case "card": return Math.max(2100, ...Object.entries(VO).filter(([key]) => key.startsWith(`midway_${e.kind.toLowerCase()}_`)).map(([,ms]) => ms + 180));
    case "doubles": return 2500;
    case "bash": return 2100;
    case "draw": return 120;
    case "travel": return Math.max(travelDuration(e.path.length - 1, e.teleport), e.actor === "rusty" && !e.teleport ? 3350 : 0);
    case "hazard": return e.kind === "tilt" ? 1650 : e.kind === "dead" ? 2250 : 3400;
    case "lap": return 3100;
    case "tickets": return 420;
    case "condition": return 4650;
    case "stall": return 1400;
  }
}
