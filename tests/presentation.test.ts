import test from "node:test";
import assert from "node:assert/strict";
import {EVENTS, type EventId} from "../src/lib/game/catalog";
import {VO} from "../src/lib/audio-manifest";
import {eventDuration} from "../src/lib/game/presentation";
import {slotPoint, carRoute, travelPoint} from "../src/lib/game/rink";
import {existsSync} from "node:fs";
test("all recorded announcer clips exist and each event card gets its complete line",()=>{
 for(const clip of Object.keys(VO))assert.ok(existsSync(`public/audio/vo/${clip}.mp3`),clip);
 for(const kind of Object.keys(EVENTS) as EventId[]){const lengths=Object.entries(VO).filter(([key])=>key.startsWith(`midway_${kind.toLowerCase()}_`)).map(([,n])=>n);assert.ok(lengths.length);assert.ok(eventDuration({type:"card",actor:"test",kind})>Math.max(...lengths),kind);}
});
test("rink routes end at the server-selected bay for current and saved track sizes",()=>{
 for(const length of [16,18,28])for(let seat=0;seat<6;seat++)for(const [from,to] of [[1,6],[length-1,2],[2,length-1]]){
 const a=slotPoint(seat,from,"main",length),b=slotPoint(seat,to,"main",length);let delta=to-from;if(delta>length/2)delta-=length;if(delta< -length/2)delta+=length;
 const stops=Array.from({length:Math.abs(delta)+1},(_,i)=>from+i*Math.sign(delta));const end=travelPoint(p=>carRoute(seat,p,length),a,b,stops,1);
 assert.ok(Math.hypot(end.x-b.x,end.y-b.y)<.001);
 }
});
