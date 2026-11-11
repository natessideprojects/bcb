import {VO} from "../audio-manifest";
import type {ReplayEvent} from "./engine";

// How long each replay beat lasts on screen (ms). The server uses the same
// numbers to reserve replay time in Quick Race deadlines. Beats leave room for
// the play-by-play caption and the announcer naming the driver involved.
export const GO_BEAT = 2900;
export function travelDuration(steps: number, teleport?: boolean) {
  if (teleport) return 700;
  return Math.min(3800, Math.max(950, steps * 330));
}
export function eventDuration(e: ReplayEvent): number {
  switch (e.type) {
    case "reveal": return 950 + (e.boost ? 450 : 0) + (e.extra ? 300 : 0);
    case "card": return Math.max(2700, ...Object.entries(VO).filter(([key]) => key.startsWith(`midway_${e.kind.toLowerCase()}_`)).map(([,ms]) => ms + 700));
    case "doubles": return 2900;
    case "bash": return 2300;
    case "pay": return 1500;
    case "draw": return 120;
    case "travel": return Math.max(travelDuration(e.path.length - 1, e.teleport), e.actor === "rusty" && !e.teleport ? 3350 : 0);
    case "hazard": return e.kind === "tilt" ? 2300 : e.kind === "dead" ? 2700 : 3400;
    case "lap": return 3300;
    case "tickets": return 1100;
    case "condition": return 4650;
    case "stall": return 2100;
  }
}
