import test from "node:test";
import assert from "node:assert/strict";
import {choose, lines, LONG_TAKE, POOLS} from "../src/lib/announcer";
import {VO} from "../src/lib/audio-manifest";

const ms = (clip: string) => (VO as Record<string, number>)[clip];

test("a pool never repeats its last take and skips takes that aren't recorded yet", () => {
  const pool = ["bash_1", "bash_2", "bash_3", "not_recorded_yet"];
  let last = "";
  for (let i = 0; i < 200; i++) {
    const take = choose(pool)!;
    assert.ok(take in VO, "only recorded takes are picked");
    assert.notEqual(take, last, "no back-to-back repeats");
    last = take;
  }
  assert.equal(choose(["knock_back_1_unrecorded"]), undefined);
});

test("long takes play less often than short ones, and fit asks for a take that fits", () => {
  const counts: Record<string, number> = {};
  for (let i = 0; i < 3000; i++) { const t = choose(POOLS.rustyMove)!; counts[t] = (counts[t] ?? 0) + 1; }
  const long = Object.keys(counts).filter(t => ms(t) > LONG_TAKE), short = Object.keys(counts).filter(t => ms(t) <= LONG_TAKE);
  assert.ok(long.length && short.length);
  const avg = (keys: string[]) => keys.reduce((s, k) => s + counts[k], 0) / keys.length;
  assert.ok(avg(long) < avg(short), `long ${avg(long)} vs short ${avg(short)}`);
  for (let i = 0; i < 50; i++) assert.ok(ms(choose(POOLS.rustyMove, 2100)!) <= 2100);
  // Nothing fits: the shortest take is used.
  const shortest = POOLS.rustyMove.filter(t => t in VO).reduce((a, b) => (ms(a) <= ms(b) ? a : b));
  assert.equal(choose(POOLS.rustyMove, 100), shortest);
});

test("every recorded moment has a line, and doubles never promise a card right away", () => {
  for (const roll of [1, 2, 3, 4, 5, 6]) { assert.ok(lines.rustyMove(roll) in VO); assert.ok(lines.tiltResult(roll) in VO); }
  for (let i = 0; i < 20; i++) assert.notEqual(lines.doubles(), "doubles_1");
  assert.ok(lines.doubles(true) in VO, "falls back until the final-round take is recorded");
  assert.ok((lines.knock(6, false) ?? "") in VO, "far knockbacks already have a take");
});
