import test from "node:test";
import assert from "node:assert/strict";
import {rudeName,openName} from "../src/lib/names";
import {lobbyClock,OPEN_COUNTDOWN,type RoomState} from "../src/lib/rooms";
test("open-race names: rude ones become Driver, ordinary ones pass",()=>{
  for(const bad of ["Fuck Face","sh1tlord","B!tch","dickhead","Ass","s3xy","N4zi"])assert.equal(rudeName(bad),true,bad);
  for(const ok of ["Nate","Dickens","Hancock","Titan","Grape Ape","Cassie","Bass Pro","Assassin","Sussex","Cockburn","Penny"])assert.equal(rudeName(ok),false,ok);
  assert.equal(openName("sh1t"),"Driver");assert.equal(openName("Biscuit"),"Biscuit");
});
test("open races count down from the second person, not bots, and keep their clock",()=>{
  const seat=(id:string,bot=false)=>({id,name:id,bot,ready:true});
  const state:RoomState={map:"day",pace:"quick",seats:[seat("host"),seat("bot-1",true)],banned:[],game:null,open:true};
  assert.equal(lobbyClock(state,1000),undefined,"host and a bot: no countdown");
  state.seats.push(seat("guest"));const at=lobbyClock(state,1000);assert.equal(at,1000+OPEN_COUNTDOWN);
  state.startsAt=at;state.seats.push(seat("third"));assert.equal(lobbyClock(state,5000),at,"later joins don't reset it");
  state.seats=state.seats.filter(s=>s.id==="host"||s.bot);assert.equal(lobbyClock(state,6000),undefined,"everyone else left: it stops");
  assert.equal(lobbyClock({...state,open:false,seats:[seat("a"),seat("b")]},1000),undefined,"private rooms never count down");
});
