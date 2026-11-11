import test from "node:test";
import assert from "node:assert/strict";
import {SKINS,MASCOTS,COSMETICS,FREE_SKINS} from "../src/lib/cosmetic-catalog";
test("prize catalog includes 30 unique skins, six free colors and 12 passengers",()=>{assert.equal(SKINS.length,30);assert.equal(MASCOTS.length,12);assert.equal(FREE_SKINS.length,6);assert.equal(new Set(COSMETICS.map(c=>c.id)).size,42);for(const x of COSMETICS)assert.ok(Number.isInteger(x.price)&&x.price>=0);for(const id of ['rocket','monster','flame','rust','flower','tie-dye'])assert.ok(SKINS.some(c=>c.id===id));});
