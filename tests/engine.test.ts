import test from "node:test";
import assert from "node:assert/strict";
import {advanceGame,makeGame,publicGame,scenario,submitPick,validatePick,type Game,type Pick,type Rng} from "../src/lib/game/engine";
import {EVENTS,type EventId} from "../src/lib/game/catalog";
function seeded(seed:number):Rng{return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
const seats=(n=2)=>Array.from({length:n},(_,i)=>({id:"user"+i,name:"Driver "+i,bot:false}));
function fresh(n=2,seed=1){return makeGame(seats(n),"day","relaxed",seeded(seed),1000,{trackLength:28,startingHand:n+1});}
function conserve(g:Game){const speed=[...g.speedDeck,...g.speedDiscard,...g.players.flatMap(p=>p.hand)];assert.equal(speed.length,50);assert.equal(new Set(speed.map(c=>c.id)).size,50);const events=[...g.eventDeck,...g.eventDiscard,...g.players.flatMap(p=>p.held)];assert.equal(events.length,37);assert.equal(new Set(events.map(c=>c.id)).size,37);for(const p of g.players){assert.ok(p.tickets>=0);assert.ok(p.pos>=0&&p.pos<=28);assert.ok(p.hand.length<=g.limit);}}
test("manifest keeps all 20 effects and 37 cards",()=>{assert.equal(Object.keys(EVENTS).length,20);assert.equal(Object.values(EVENTS).reduce((a,e)=>a+e.count,0),37);assert.equal(Object.values(EVENTS).filter(e=>e.type==="INSTANT").reduce((a,e)=>a+e.count,0),25);});
test("setup gives unique main positions, full hands, no setup laps",()=>{for(const n of [2,4,6]){const g=fresh(n,n);conserve(g);assert.equal(new Set(g.players.map(p=>p.pos)).size,n);for(const p of g.players){assert.equal(p.hand.length,n+1);assert.equal(p.lap,0);assert.notEqual(p.pos,14);}}});
test("public state hides all other hands, held cards, picks and future decks",()=>{const g=fresh();submitPick(g,"user1",{primary:g.players[1].hand[0].id},g.round,seeded(6),1001);const view=publicGame(g,"user0");assert.equal(view.players[1].locked,true);assert.ok(!("hand" in view.players[1]));assert.ok(!("held" in view.players[1]));assert.ok(!("picks" in view));assert.ok(!("speedDeck" in view));assert.ok(!JSON.stringify(view).includes('"'+g.players[1].hand[0].id+'"'));assert.equal(publicGame(g,"outsider").me,null);});
test("a driver cannot play another hand or alter a committed card",()=>{const g=fresh();assert.throws(()=>submitPick(g,"user0",{primary:g.players[1].hand[0].id},g.round,seeded(2),1001));const pick={primary:g.players[0].hand[0].id};submitPick(g,"user0",pick,g.round,seeded(2),1001);const snapshot=JSON.stringify(g);submitPick(g,"user0",pick,g.round,seeded(2),1001);assert.equal(JSON.stringify(g),snapshot);assert.throws(()=>submitPick(g,"user0",{primary:g.players[0].hand[1].id},g.round,seeded(2),1001));});
test("boost validation enforces ownership, Lights Out, and extra-card rules",()=>{const g=fresh(),p=g.players[0];p.held.push({id:"boost",kind:"M05",available:g.round});const primary=p.hand[0].id,lowest=p.hand.filter(c=>c.id!==primary).sort((a,b)=>a.value-b.value)[0];assert.throws(()=>validatePick(g,p,{primary,boost:"boost"}));validatePick(g,p,{primary,boost:"boost",extra:lowest.id});g.condition="lights";assert.throws(()=>validatePick(g,p,{primary,boost:"boost",extra:lowest.id}));});
test("every legacy INSTANT action has a concrete effect",()=>{
 for(const kind of Object.keys(EVENTS) as EventId[]){if(EVENTS[kind].type!=="INSTANT")continue;const g=fresh(),p=g.players[0];p.pos=4;g.players[1].pos=10;g.rusty=14;g.condition="free";const before=p.tickets;scenario(g,kind,p.id,seeded(5));assert.ok(g.log.some(e=>e.text.includes(EVENTS[kind].name)));if(kind==="M01")assert.equal(p.lane,"mini");if(kind==="M06")assert.equal(p.stalled,true);if(kind==="M07")assert.equal(p.pos,0);if(kind==="M13")assert.equal(p.tickets,before+1);if(kind==="M14")assert.equal(p.tickets,before-1);if(kind==="M15")assert.equal(p.skip,true);if(kind==="M04"||kind==="M08")assert.equal(p.hand.length,g.limit);}
});
test("Power Surge resolves in order, stops at Rusty, and creates no bounty",()=>{const g=fresh(),p=g.players[0];g.condition="free";p.pos=11;g.players[1].pos=24;g.rusty=14;scenario(g,"M03",p.id,seeded(2));assert.equal(p.pos,13);assert.equal(p.tickets,3);});
test("stalled cars catch intermediate movement and Daddy can intercept",()=>{const g=fresh(),p=g.players[0],other=g.players[1];g.condition="free";p.pos=2;other.pos=4;other.stalled=true;g.rusty=14;scenario(g,"M03",p.id,seeded(2));assert.equal(p.stalled,true);const h=fresh(),a=h.players[0],b=h.players[1];h.condition="free";a.pos=2;b.pos=4;b.stalled=true;a.held.push({id:"daddy",kind:"M12",available:h.round});scenario(h,"M03",a.id,seeded(2));assert.equal(a.stalled,false);assert.ok(h.log.some(e=>e.text.includes("uses Daddy")));});
test("skip and stall persist independently and tickets have a floor",()=>{const g=fresh(),p=g.players[0];p.stalled=true;scenario(g,"M15",p.id,seeded(8));assert.equal(p.skip,true);assert.equal(p.stalled,true);p.tickets=0;scenario(g,"M14",p.id,seeded(9));assert.equal(p.tickets,0);});
test("endgame finishes a complete round without replacement draws",()=>{const g=fresh();const p=g.players[0];g.speedDiscard.push(...p.hand.splice(1));const round=g.round;for(const player of g.players)submitPick(g,player.id,{primary:player.hand[0].id},round,seeded(12),1001);assert.equal(g.phase,"finished");assert.equal(g.players[0].hand.length,0);assert.ok(g.winners.length);conserve(g);});
test("expired rounds pick the lowest unplayed cards and advance once",()=>{const g=fresh();advanceGame(g,seeded(18),g.deadline+1);assert.ok(g.round>=2||g.phase==="finished");conserve(g);});
test("100 complete games exercise all 20 effects without losing cards or hanging",()=>{
 const seen=new Set<string>();
 for(let seed=1;seed<=100;seed++){
  const random=seeded(seed),n=[2,4,6][seed%3],g=makeGame(seats(n),seed%2?"day":"night",seed%3?"relaxed":"quick",random,1000);
  let commands=0;
  while(g.phase!=="finished"&&commands++<1200){const p=g.players.find(p=>p.active&&!g.picks[p.id]);if(!p){advanceGame(g,random,1001);continue;}const primary=p.hand[Math.floor(random()*p.hand.length)];const candidate=g.condition!=="lights"?p.held.find(c=>EVENTS[c.kind].type==="BOOST"&&c.available<=g.round&&((c.kind!=="M05"&&c.kind!=="M09")||p.hand.length>1)):undefined;const pick:Pick={primary:primary.id};if(candidate&&random()<.8){pick.boost=candidate.id;if(candidate.kind==="M05")pick.extra=[...p.hand].filter(c=>c.id!==primary.id).sort((a,b)=>a.value-b.value)[0].id;if(candidate.kind==="M09")pick.extra=p.hand.find(c=>c.id!==primary.id)!.id;}submitPick(g,p.id,pick,g.round,random,1001);conserve(g);for(const [kind,e] of Object.entries(EVENTS))if(g.log.some(l=>l.text.includes(e.name)))seen.add(kind);}
  assert.equal(g.phase,"finished",`seed ${seed} did not finish`);
 }
 assert.equal(seen.size,20,`Unseen effects: ${Object.keys(EVENTS).filter(e=>!seen.has(e))}`);
});

test("Oz reverses travel without changing positions or laps; reverse crossings score forward",()=>{
 const g=fresh();g.condition="free";g.players[0].pos=1;g.players[1].pos=19;g.players[0].lap=2;
 scenario(g,"M20","user0",seeded(3));assert.equal(g.direction,-1);assert.equal(g.players[0].pos,1);assert.equal(g.players[0].lap,2);
 scenario(g,"M03","user0",seeded(3));assert.equal(g.players[0].pos,26);assert.equal(g.players[0].lap,3);
});
test("Rain keeps held cards and uncommitted hand sizes while preserving final-round latch",()=>{
 const g=fresh();const held=g.eventDeck.find(c=>c.kind==="M17")!;g.eventDeck=g.eventDeck.filter(c=>c!==held);g.players[0].held.push(held);g.final=true;
 const counts=g.players.map(p=>p.hand.length),condition=g.condition;scenario(g,"M18","user0",seeded(33));
 assert.deepEqual(g.players.map(p=>p.hand.length),counts);assert.equal(g.players[0].held[0],held);assert.equal(g.condition,condition);assert.equal(g.final,true);assert.equal(g.nextFirstSeat,1);
});
function attack(kind:EventId,karma=false){
 const g=fresh();g.condition="bumper";g.players[0].pos=4;g.players[1].pos=6;g.rusty=20;
 const p=g.players[0],v=g.players[1];p.hand[0].value=2;v.hand[0].value=1;
 const held=g.eventDeck.find(c=>c.kind===kind)!;g.eventDeck=g.eventDeck.filter(c=>c!==held);held.available=1;p.held.push(held);
 if(karma){const k=g.eventDeck.find(c=>c.kind==="M11")!;g.eventDeck=g.eventDeck.filter(c=>c!==k);k.available=1;v.held.push(k);}
 const round=g.round;submitPick(g,p.id,{primary:p.hand[0].id},round,()=>.5,1001);submitPick(g,v.id,{primary:v.hand[0].id},round,()=>.5,1001);return g;
}
test("Double and Super multiply opponent die before the Bumper bonus",()=>{
 for(const kind of ["M17","M16"] as EventId[]){const g=attack(kind);assert.ok(g.log.some(l=>l.text.includes(`Rolled 4 × ${kind==="M17"?2:3} + 2`)));assert.ok(!g.players[0].held.some(c=>c.kind===kind));}
 const g=attack("M17",true);assert.ok(g.log.some(l=>l.text.includes("uses Karma")));
});
test("Sauron spends a nonqualifying card without travel and remains until a bash",()=>{
 const g=fresh();g.condition="free";g.players[0].pos=2;g.players[1].pos=19;g.rusty=14;const p=g.players[0];scenario(g,"M19",p.id,seeded(1));p.hand[0].value=10;g.players[1].hand[0].value=1;
 const round=g.round,card=p.hand[0].id;for(const v of g.players)submitPick(g,v.id,{primary:v.hand[0].id},round,()=>.5,1001);
 assert.equal(p.pos,2);assert.equal(p.compelled,true);assert.ok(!p.hand.some(c=>c.id===card));assert.ok(g.log.some(l=>l.text.includes("card is spent without moving")));
});
test("new arena races start with 16 sections and 6 cards in both paces",()=>{for(const pace of ['quick','relaxed'] as const){for(const n of [2,4,6]){const g=makeGame(seats(n),'day',pace,seeded(50+n),1000);assert.equal(g.trackLength,16);assert.equal(g.limit,6);assert.equal(g.rusty,8);assert.ok(g.players.every(p=>p.hand.length===6&&p.pos>=1&&p.pos<=16));assert.equal(g.deadline-1000,pace==='quick'?60000:86400000);conserve(g);}}});
test("cleanup replaces everyone except Flag 1 rather than consuming a card each round",()=>{const g=makeGame(seats(),'day','relaxed',seeded(42),1000);g.condition='free';const [a,b]=g.players;a.pos=1;b.pos=10;g.rusty=9;a.hand[0].value=10;b.hand[0].value=1;const round=g.round;submitPick(g,a.id,{primary:a.hand[0].id},round,()=>.25,1001);submitPick(g,b.id,{primary:b.hand[0].id},round,()=>.25,1001);assert.equal(g.round,2);assert.equal(g.flags.length,0);assert.equal(a.hand.length,5);assert.equal(b.hand.length,6);assert.ok(g.log.some(l=>l.text.includes('no replacement draw (Flag 1)')));assert.ok(g.log.some(l=>l.text.includes('draws 1 replacement')));conserve(g);});
test("skipped drivers can replace a missing card; stalled drivers cannot draw",()=>{const g=makeGame(seats(3),'day','relaxed',seeded(27),1000);g.condition='free';const [a,b,c]=g.players;a.pos=1;b.pos=4;c.pos=14;g.rusty=9;a.hand[0].value=10;b.active=false;c.active=false;c.stalled=true;g.speedDiscard.push(b.hand.pop()!,c.hand.pop()!);submitPick(g,a.id,{primary:a.hand[0].id},g.round,()=>0,1001);assert.equal(b.hand.length,6);assert.equal(c.hand.length,5);conserve(g);});
test("the final round suppresses every normal replacement draw",()=>{const g=makeGame(seats(),'day','relaxed',seeded(17),1000);const [a,b]=g.players;g.condition='free';g.speedDiscard.push(...a.hand.splice(1));a.hand[0].value=10;b.hand[0].value=1;const before=b.hand.length,round=g.round;submitPick(g,a.id,{primary:a.hand[0].id},round,seeded(4),1001);submitPick(g,b.id,{primary:b.hand[0].id},round,seeded(5),1001);assert.equal(g.phase,'finished');assert.equal(a.hand.length,0);assert.equal(b.hand.length,before-1);assert.ok(!g.replay!.events.some(e=>e.type==='draw'));conserve(g);});
test("replay paths contain actual one-space travel and no future cards",()=>{const g=makeGame(seats(4),'day','relaxed',seeded(11),1000);const round=g.round;for(const p of g.players)submitPick(g,p.id,{primary:p.hand[0].id},round,seeded(p.seat+1),1001);assert.ok(g.replay);assert.equal(g.replay.round,round);assert.ok(g.replay.events.some(e=>e.type==='reveal'));assert.ok(g.replay.events.some(e=>e.type==='travel'));for(const e of g.replay.events){if(e.type==='travel'&&!e.teleport)for(let i=1;i<e.path.length;i++){const d=Math.abs(e.path[i].pos-e.path[i-1].pos);assert.ok(d<=1||d===15,`Bad replay step ${d}`);}}const replay=JSON.stringify(publicGame(g,'user0').replay);assert.ok(!replay.includes('speedDeck'));assert.ok(!replay.includes('hand'));assert.ok(!replay.includes(g.speedDeck[0].id+'"'));});
test("16-section reverse travel wraps at the arena Start Line",()=>{const g=makeGame(seats(),'day','relaxed',seeded(8),1000);g.condition='free';g.players[0].pos=1;g.players[1].pos=11;g.rusty=9;scenario(g,'M20','user0',seeded(2));scenario(g,'M03','user0',seeded(2));assert.equal(g.players[0].pos,14);assert.equal(g.players[0].lap,1);});
test("Quick Race reserves replay time in addition to its pick allowance",()=>{const g=makeGame(seats(4),'day','quick',seeded(76),1000);const round=g.round;for(const p of g.players)submitPick(g,p.id,{primary:p.hand[0].id},round,seeded(p.seat+20),1001);assert.equal(g.round,2);assert.ok(g.deadline>1001+60000);assert.ok(g.deadline<=1001+240000);});
test("saved 3.3 games retain the original 28-space interpretation",()=>{const g=fresh();g.rules='3.3';delete g.trackLength;assert.equal(publicGame(g,'user0').trackLength,28);assert.equal(g.limit,3);const round=g.round;for(const p of g.players)submitPick(g,p.id,{primary:p.hand[0].id},round,seeded(p.seat+12),1001);conserve(g);assert.equal(publicGame(g,'user0').rules,'3.3');});

test("Lead Foot Bash gives the leader a full lap and passes every rival in either direction",()=>{
  for(const direction of [1,-1] as const){
    const game=fresh(3);
    const [leader,first,second]=game.players;
    game.condition="free";
    game.direction=direction;
    game.rusty=14;
    Object.assign(leader,{pos:15,lap:1});
    Object.assign(first,{pos:6,lap:0});
    Object.assign(second,{pos:20,lap:0});
    scenario(game,"M02",leader.id,()=>0);
    assert.equal(leader.lap,2);
    assert.equal(leader.pos,15);
    assert.equal(leader.stats?.bashes,2);
    assert.equal(first.pos,6-direction);
    assert.equal(second.pos,20-direction);
  }
});

test("Lead Foot Bash still moves a trailing driver one space past the leader",()=>{
  const game=fresh(3);
  const [driver,middle,leader]=game.players;
  game.condition="free";
  game.rusty=14;
  Object.assign(driver,{pos:5,lap:0});
  Object.assign(middle,{pos:10,lap:0});
  Object.assign(leader,{pos:15,lap:0});
  scenario(game,"M02",driver.id,()=>0);
  assert.equal(driver.pos,16);
  assert.equal(driver.lap,0);
  assert.equal(driver.stats?.bashes,2);
});
test("Sauron's curse lasts one round per driver, then lifts without a bash",()=>{
 const g=fresh();g.condition="free";g.players[0].pos=2;g.players[1].pos=19;g.rusty=14;const p=g.players[0];scenario(g,"M19",p.id,seeded(1));
 assert.equal(p.compelled,true);assert.equal(p.curse,2);assert.equal(publicGame(g,p.id).players[0].curse,2);
 for(let r=0;r<2;r++){g.condition="free";p.hand[0].value=10;g.players[1].hand[0].value=1;const round=g.round;for(const v of g.players)submitPick(g,v.id,{primary:v.hand[0].id},round,()=>.5,1001+r);
  if(r===0){assert.equal(p.compelled,true);assert.equal(p.curse,1);}}
 assert.equal(p.compelled,false);assert.equal(p.curse,undefined);assert.ok(g.log.some(l=>l.text.includes("Sauron looks away")));
});
test("Sauron's curse length follows the number of drivers",()=>{
 for(const n of [2,3,4,6]){const g=fresh(n,7);scenario(g,"M19",g.players[0].id,seeded(2));assert.equal(g.players[0].curse,n);}
});

// ---------- ticket ledger (Nov 2026 audit) ----------
import {midwayAction,replayBudget,testMove,type ReplayEvent} from "../src/lib/game/engine";
import {ROLL_WAIT} from "../src/lib/game/presentation";
/** Replays a round's events over its starting tickets and checks they explain every change. */
function audit(g:Game,label:string){
  const replay=g.replay!;assert.ok(replay.initial.tickets,label+": replay records starting tickets");
  const run:Record<string,number>={...replay.initial.tickets};
  replay.events.forEach((e,i)=>{
    if(e.type==="pay"){const due=e.paid+e.bank;if(e.to)assert.ok(due===1||due===2,label+": a driver's bash pays 1 or 2 tickets");else assert.ok(e.paid<=1,label+": Rusty takes at most 1");assert.ok(e.paid>=0&&e.paid<=run[e.from],label+": victim pays only what they hold");run[e.from]-=e.paid;if(e.to)run[e.to]+=due;else assert.equal(e.bank,0,label+": the bank never pays Rusty");for(const [id,t] of Object.entries(e.totals))assert.equal(run[id],t,label+": pay totals");}
    if(e.type==="tickets"){run[e.actor]+=e.delta;assert.equal(run[e.actor],e.total,label+": ticket totals");}
    if(e.type==="lap"){run[e.actor]=Math.max(0,run[e.actor]+e.delta);assert.equal(run[e.actor],e.total,label+": lap totals");}
    if(e.type==="bash"&&e.victim!=="rusty"){const next=replay.events.slice(i+1).find(x=>x.type==="pay"||x.type==="bash");assert.ok(next?.type==="pay"&&next.from===e.victim&&next.to===(e.by??null),label+": every bash on a driver is paid for");}
    if(e.type==="bash"&&e.victim==="rusty"){const next=replay.events[i+1];assert.ok(next?.type==="tickets"&&next.reason==="bounty"&&next.actor===e.actor,label+": Rusty's bounty is paid");}
  });
  for(const p of g.players){assert.equal(run[p.id],p.tickets,`${label}: ${p.name}'s tickets match the replay`);assert.ok(p.tickets>=0);}
}
const pays=(events:ReplayEvent[])=>events.filter((e):e is Extract<ReplayEvent,{type:"pay"}>=>e.type==="pay");

test("a bash is a ticket swap: the victim pays the driver who hit them",()=>{
  const g=fresh(2);g.condition="free";g.rusty=20;const [a,b]=g.players;a.pos=1;b.pos=5;
  const events=testMove(g,a.id,4,()=>0);
  assert.deepEqual(pays(events),[{type:"pay",from:b.id,to:a.id,paid:1,bank:0,totals:{[b.id]:2,[a.id]:4}}]);
  assert.equal(a.tickets,4);assert.equal(b.tickets,2);assert.equal(a.stats?.bashes,1);audit(g,"swap");
});
test("a broke victim is covered by the bank, and Judging doubles the swap",()=>{
  const g=fresh(2);g.condition="free";g.rusty=20;const [a,b]=g.players;a.pos=1;b.pos=5;b.tickets=0;
  testMove(g,a.id,4,()=>0);assert.equal(a.tickets,4);assert.equal(b.tickets,0);assert.deepEqual(pays(g.replay!.events)[0],{type:"pay",from:b.id,to:a.id,paid:0,bank:1,totals:{[b.id]:0,[a.id]:4}});audit(g,"broke");
  const h=fresh(2);h.condition="judging";h.rusty=20;const [c,d]=h.players;c.pos=1;d.pos=5;d.tickets=1;
  testMove(h,c.id,4,()=>0);assert.equal(c.tickets,5);assert.equal(d.tickets,0);assert.equal(pays(h.replay!.events)[0].bank,1);audit(h,"judging");
});
test("chain reactions pay the driver who started them, and a knocked car never spends its Bash card",()=>{
  const g=fresh(3);g.condition="free";g.rusty=20;const [a,b,c]=g.players;a.pos=1;b.pos=5;c.pos=4;
  b.held.push({id:"super",kind:"M16",available:0});
  const events=testMove(g,a.id,4,()=>0);
  const bashes=events.filter(e=>e.type==="bash");assert.equal(bashes.length,2);
  assert.deepEqual(bashes.map(e=>e.type==="bash"&&[e.actor,e.victim,e.by]),[[a.id,b.id,a.id],[b.id,c.id,a.id]]);
  assert.deepEqual(pays(events).map(e=>[e.from,e.to]),[[b.id,a.id],[c.id,a.id]]);
  assert.equal(a.tickets,5);assert.equal(b.tickets,2);assert.equal(c.tickets,2);
  assert.ok(b.held.some(x=>x.id==="super"),"the knocked car keeps its Super Bash");
  assert.equal(a.stats?.bashes,2);assert.equal(b.stats?.bashes,0);audit(g,"chain");
});
test("Rusty takes a ticket from every car he hits; bashing Rusty pays a 2-ticket bounty from the bank",()=>{
  const g=fresh(2,3);g.condition="free";const [a,b]=g.players;a.pos=5;b.pos=12;g.rusty=6;
  for(const p of g.players){p.hand[0].value=p===a?10:9;}
  const round=g.round;b.pos=2;a.pos=20;g.rusty=6;
  // Rusty reverses after the moves; with a die of 1 he steps from 6 to 5.
  b.hand[0].value=3;a.hand[0].value=10;a.pos=11;
  for(const p of g.players)submitPick(g,p.id,{primary:p.hand[0].id},round,()=>0,1001);
  const hit=g.replay!.events.find(e=>e.type==="bash"&&e.actor===null);
  assert.ok(hit,"Rusty bashed someone");const pay=pays(g.replay!.events).find(e=>e.to===null)!;
  assert.equal(pay.paid,1);assert.equal(pay.bank,0);audit(g,"rusty");
  const h=fresh(2);h.condition="free";h.rusty=9;const [c]=h.players;c.pos=5;h.players[1].pos=20;
  testMove(h,c.id,4,()=>0);assert.equal(c.tickets,5);assert.ok(h.replay!.events.some(e=>e.type==="tickets"&&e.reason==="bounty"&&e.delta===2));audit(h,"bounty");
});
test("ticket ledger holds across hundreds of random races, including Midway draws",()=>{
  let bashes=0,rusty=0,bounties=0,rounds=0;
  for(let seed=1;seed<=120;seed++){
    const n=2+seed%5,rng=seeded(seed*7919);
    const g=makeGame(seats(n),seed%2?"day":"night","relaxed",rng,1000,{manualMidway:seed%3===0});
    for(let guard=0;guard<120&&g.phase!=="finished";guard++){
      if(g.phase==="midway"){const next=g.midway!.queue[0];midwayAction(g,next.actor,g.round,"reveal",undefined,rng,1001);midwayAction(g,next.actor,g.round,"place",next.card.id,rng,1001);audit(g,`seed ${seed} midway`);continue;}
      const round=g.round,waiting=g.players.filter(p=>p.active&&!g.picks[p.id]);
      for(const p of waiting)submitPick(g,p.id,{primary:p.hand[Math.floor(rng()*p.hand.length)].id},round,rng,1001);
      if(g.replay?.round===round){audit(g,`seed ${seed} round ${round}`);rounds++;
        for(const e of g.replay.events){if(e.type==="bash"){if(e.victim==="rusty")bounties++;else if(e.actor===null)rusty++;else bashes++;}}}
    }
    assert.equal(g.phase,"finished",`seed ${seed} finishes`);
  }
  assert.ok(rounds>500&&bashes>50&&rusty>10&&bounties>5,`coverage: ${rounds} rounds, ${bashes} bashes, ${rusty} Rusty hits, ${bounties} bounties`);
});
test("flags follow the printed card value and only Flag 1 skips the replacement draw",()=>{
  for(let seed=1;seed<=40;seed++){
    const n=2+seed%5,g=makeGame(seats(n),"day","relaxed",seeded(seed),1000);g.condition="free";
    const round=g.round,picks=new Map<string,number>(),sizes=new Map(g.players.map(p=>[p.id,p.hand.length]));
    for(const p of g.players.filter(p=>p.active)){const c=p.hand[Math.floor(seeded(seed+p.seat)()*p.hand.length)];picks.set(p.id,c.value);submitPick(g,p.id,{primary:c.id},round,seeded(seed*3),1001);}
    if(g.replay?.round!==round||g.phase!=="pick")continue;
    const order=g.lastReveal.map(r=>r.id),values=order.map(id=>picks.get(id)!);
    for(let i=1;i<values.length;i++)assert.ok(values[i-1]>=values[i],`seed ${seed}: flags run highest card first`);
    assert.deepEqual(g.replay.events.filter(e=>e.type==="reveal").map(e=>e.type==="reveal"&&e.actor),order,"reveal order is the flag order");
    for(const p of g.players){if(!picks.has(p.id)||p.stalled)continue;assert.equal(p.hand.length,sizes.get(p.id)!-(p.id===order[0]?1:0),`seed ${seed}: ${p.name} hand after cleanup`);}
    assert.ok(g.log.some(l=>l.text.includes("no replacement draw (Flag 1)")));
  }
});
test("no hostages: when the pick timer runs out, an absent driver's lowest card is played",()=>{
  const g=makeGame(seats(3),"day","quick",seeded(90),1000);const [a,b,c]=g.players;const round=g.round;
  const lowest=(p:typeof b)=>Math.min(...p.hand.map(x=>x.value));const lb=lowest(b),lc=lowest(c);
  submitPick(g,a.id,{primary:a.hand[0].id},round,seeded(1),1001);
  advanceGame(g,seeded(2),g.deadline-1);assert.equal(g.round,round,"the round waits until the timer runs out");
  advanceGame(g,seeded(2),g.deadline+1);
  assert.equal(g.replay?.round,round,"the round resolves for everyone else");assert.ok(g.round>round||g.phase==="finished");
  const reveals=g.replay!.events.filter((e):e is Extract<ReplayEvent,{type:"reveal"}>=>e.type==="reveal");
  assert.equal(reveals.find(e=>e.actor===b.id)?.value,lb);assert.equal(reveals.find(e=>e.actor===c.id)?.value,lc);
  assert.equal(reveals.find(e=>e.actor===b.id)?.auto,true);assert.equal(reveals.find(e=>e.actor===a.id)?.auto,undefined);
  assert.equal(b.misses,1);assert.equal(a.misses,0);assert.ok(g.log.some(l=>l.text.includes("timer expired; the lowest card is locked in")));
  conserve(g);
});

// ---------- dice (Nov 2026): every roll is shown ----------
type Roll=Extract<ReplayEvent,{type:"roll"}>;
const rollsOf=(events:ReplayEvent[],purpose?:Roll["purpose"])=>events.filter((e):e is Roll=>e.type==="roll"&&(!purpose||e.purpose===purpose));
test("the bashed driver rolls for knockback, and the shown roll is the distance used",()=>{
  const g=fresh(2);g.condition="bumper";g.rusty=20;const [a,b]=g.players;a.pos=1;b.pos=9;
  const events=testMove(g,a.id,8,()=>.5); // die = 4
  const [roll]=rollsOf(events,"knockback");
  assert.deepEqual(roll,{type:"roll",purpose:"knockback",rolls:[{actor:b.id,value:4}],bonus:2});
  assert.equal(b.pos,9-6,"knocked back 4 + Bumper 2");
  const order=events.map(e=>e.type);assert.ok(order.indexOf("roll")>order.indexOf("bash")&&order.indexOf("roll")<order.indexOf("pay"));
});
test("Super Bash shows its multiplier on the knockback roll",()=>{
  const g=fresh(2);g.condition="free";g.rusty=20;const [a,b]=g.players;a.pos=1;b.pos=5;a.held.push({id:"super",kind:"M16",available:0});
  const events=testMove(g,a.id,4,()=>0);
  const [roll]=rollsOf(events,"knockback");assert.equal(roll.multiplier,3);assert.equal(roll.rolls[0].value,1);
  assert.ok(g.cards?.some(c=>c.kind==="M16"&&c.how==="used"&&c.actor===a.id),"used Bash cards are listed for everyone");
});
test("Tilt-A-Whirl, Rusty, stall escapes and tied flags all show their dice",()=>{
  let tilt=0,rusty=0,escape=0,tie=0;
  for(let seed=1;seed<=60;seed++){
    const n=2+seed%5,rng=seeded(seed*31);const g=makeGame(seats(n),seed%2?"day":"night","relaxed",rng,1000);
    for(let guard=0;guard<40&&g.phase==="pick";guard++){
      const round=g.round;for(const p of g.players.filter(p=>p.active&&!g.picks[p.id]))submitPick(g,p.id,{primary:p.hand[Math.floor(rng()*p.hand.length)].id},round,rng,1001);
      if(g.replay?.round!==round)continue;const ev=g.replay.events;
      ev.forEach((e,i)=>{
        if(e.type==="hazard"&&e.kind==="tilt"){const r=ev[i+1];assert.ok(r?.type==="roll"&&r.purpose==="tilt"&&r.rolls[0].value===e.roll&&r.rolls[0].actor===e.actor);tilt++;}
        if(e.type==="roll"&&e.purpose==="rusty"){const t=ev[i+1];assert.ok(t?.type==="travel"&&t.actor==="rusty"&&t.path.length-1===e.rolls[0].value,"Rusty drives exactly his roll");rusty++;}
        if(e.type==="roll"&&e.purpose==="escape"){assert.ok(e.rolls[0].value>=1&&e.rolls[0].value<=6);escape++;}
        if(e.type==="roll"&&e.purpose==="tie"){const ids=e.rolls.map(r=>r.actor);const flags=g.lastReveal.map(r=>r.id);assert.ok(ids.every(id=>g.lastReveal.find(r=>r.id===id)?.primary===e.card));
          const best=Math.max(...e.rolls.map(r=>r.value)),winners=e.rolls.filter(r=>r.value===best).map(r=>r.actor);if(winners.length===1){const pos=(id:string)=>flags.indexOf(id);assert.ok(ids.every(id=>id===winners[0]||pos(winners[0])<pos(id)),"the higher roll takes the earlier flag");}tie++;}
        if(e.type==="travel"&&e.actor==="rusty")assert.ok(!e.teleport,"Rusty never teleports");
      });
      assert.ok(ev.findIndex(e=>e.type==="roll"&&e.purpose==="tie")<0||ev.findIndex(e=>e.type==="roll"&&e.purpose==="tie")>ev.findLastIndex(e=>e.type==="reveal"),"tie rolls come after the reveal");
    }
  }
  assert.ok(tilt>5&&rusty>50&&escape>2&&tie>5,`coverage: tilt ${tilt}, rusty ${rusty}, escape ${escape}, tie ${tie}`);
});
test("a bashed Rusty drives half a lap ahead instead of teleporting",()=>{
  const g=fresh(2);g.condition="free";g.trackLength=16;g.rusty=9;const [c,d]=g.players;c.pos=5;d.pos=2;
  const events=testMove(g,c.id,4,()=>0);const t=events.find(e=>e.type==="travel"&&e.actor==="rusty");
  assert.ok(t&&t.type==="travel"&&!t.teleport);assert.equal(t.path.length-1,8);assert.equal(t.path.at(-1)!.pos,1);assert.equal(g.rusty,1);
  for(let i=1;i<t.path.length;i++){const step=Math.abs(t.path[i].pos-t.path[i-1].pos);assert.ok(step===1||step===15);}
});
test("drawn INSTANT cards are listed for every driver to read",()=>{
  const g=fresh(2);g.condition="free";scenario(g,"M04",g.players[1].id,seeded(4));
  const view=publicGame(g,g.players[0].id);assert.deepEqual(view.cards.map(c=>[c.actor,c.kind,c.how]),[[g.players[1].id,"M04","drew"]]);
});
test("the playback reserve waits for human dice only",()=>{
  const replay={round:1,initial:{players:{},rusty:1,direction:1 as const,condition:"free" as const,milestone:0},events:[{type:"roll" as const,purpose:"knockback" as const,rolls:[{actor:"bot",value:3}]},{type:"roll" as const,purpose:"rusty" as const,rolls:[{actor:"rusty",value:2}]},{type:"roll" as const,purpose:"tilt" as const,rolls:[{actor:"nate",value:5}]}]};
  assert.equal(replayBudget(replay,["nate"])-replayBudget(replay,[]),ROLL_WAIT);
});
test("knockbacks are marked so playback slows down and pauses on them",()=>{
  const g=fresh(2);g.condition="free";g.rusty=20;const [a,b]=g.players;a.pos=1;b.pos=9;
  const events=testMove(g,a.id,8,()=>.5);
  const knock=events.find(e=>e.type==="travel"&&e.actor===b.id);assert.ok(knock?.type==="travel"&&knock.knock===true);
  const own=events.find(e=>e.type==="travel"&&e.actor===a.id);assert.ok(own?.type==="travel"&&!own.knock);
});
