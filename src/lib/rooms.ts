import {randomBytes,randomInt,randomUUID} from "node:crypto";
import {db} from "./db";
import type {TransactionSql} from "postgres";
import {ensureProfile,creditFinished} from "./profiles";
import {DEFAULT_POLICY,PAINTS,type MapId} from "./game/catalog";
import {advanceGame,midwayAction,GameError,makeGame,publicGame,submitPick,type Game,type Pick} from "./game/engine";
import type {Policy} from "./game/catalog";
import {openName} from "./names";

export type Seat={skin?:string;mascot?:string|null;id:string;name:string;bot:boolean;ready:boolean};
/** `open`: a pick-up race anyone can find and join. `startsAt`: its auto-start countdown (ms). */
export type RoomState={map:MapId;pace:"quick"|"relaxed";seats:Seat[];banned:string[];game:Game|null;open?:boolean;startsAt?:number};
export type RoomRow={id:string;code:string;host_id:string;player_ids:string[];status:"lobby"|"playing"|"finished"|"closed";revision:number;state:RoomState;created_at:Date;updated_at:Date};
export type User={id:string;name:string;isTest?:boolean;guest?:boolean};
const rng=()=>randomInt(0,0x100000000)/0x100000000;
export class HttpError extends Error{constructor(public status:number,message:string){super(message);}}
export const cleanName=(name:string)=>name.replace(/[\u0000-\u001f<>]/g,"").trim().slice(0,24)||"Driver";

export async function rate(user:string,bucket:string,max:number,seconds=60){
  const at=Math.floor(Date.now()/(seconds*1000)),key=`${user}:${bucket}:${at}`;
  const rows=await db`INSERT INTO bcb_limits (key,count,expires_at) VALUES (${key},1,now()+interval '2 days') ON CONFLICT (key) DO UPDATE SET count=bcb_limits.count+1 RETURNING count`;
  if(rows[0].count>max)throw new HttpError(429,"A little too fast. Please wait a moment and try again.");
}
export const OPEN_COUNTDOWN=60000;
/**
 * The auto-start clock for an open race: it starts when a second person (not a bot)
 * sits down, stops if people leave, and never moves once running.
 */
export function lobbyClock(state:RoomState,now:number){if(!state.open)return undefined;return state.seats.filter(s=>!s.bot).length<2?undefined:state.startsAt??now+OPEN_COUNTDOWN;}
/** The race "title" by pace. */
export const paceName=(pace:"quick"|"relaxed")=>pace==="quick"?"Quick race":"Long race";
function roomPublic(r:RoomRow,user:string){return {id:r.id,code:r.code,hostId:r.host_id,status:r.status,revision:r.revision,open:!!r.state.open,startsAt:r.state.startsAt??null,now:Date.now(),map:r.state.map,pace:r.state.pace,seats:r.state.seats.map((p,i)=>({...p,color:PAINTS[i]})),game:r.state.game?publicGame(r.state.game,user):null};}
export type PublicRoom=ReturnType<typeof roomPublic>;

export async function myRooms(user:string){
  const rooms=await db<RoomRow[]>`SELECT * FROM bcb_rooms WHERE ${user}=ANY(player_ids) AND status<>'closed' ORDER BY updated_at DESC LIMIT 20`;
  return rooms.map(r=>({id:r.id,status:r.status,map:r.state.map,pace:r.state.pace,open:!!r.state.open,round:r.state.game?.round||0,seats:r.state.seats.map((s,i)=>({name:s.name,color:PAINTS[i],bot:s.bot})),updatedAt:r.updated_at}));
}
export async function createRoom(user:User,map:MapId,pace:"quick"|"relaxed",open=false){
  await rate(user.id,"create",10,86400);
  const profile=await ensureProfile(user);user={...user,name:profile.driver_name};
  const count=await db`SELECT count(*)::int AS n FROM bcb_rooms WHERE host_id=${user.id} AND status IN ('lobby','playing')`;
  if(count[0].n>=5)throw new HttpError(409,"You already host five open rooms. Close one before creating another.");
  const name=cleanName(user.name);
  const state:RoomState={map,pace,seats:[{id:user.id,name:open?openName(name):name,bot:false,ready:true,skin:profile.equipped_skin,mascot:profile.equipped_mascot}],banned:[],game:null,...(open?{open:true}:{})};
  const rows=await db<RoomRow[]>`INSERT INTO bcb_rooms (id,code,host_id,player_ids,state) VALUES (${randomUUID()},${randomBytes(8).toString("hex").toUpperCase()},${user.id},${[user.id]},${db.json(state as never)}) RETURNING *`;
  await db`DELETE FROM bcb_limits WHERE expires_at<now()`;
  return roomPublic(rows[0],user.id);
}
export async function joinRoom(user:User,code:string){
  await rate(user.id,"join",20,3600);
  const profile=await ensureProfile(user);user={...user,name:profile.driver_name};
  return db.begin(async tx=>{
    const rows=await tx<RoomRow[]>`SELECT * FROM bcb_rooms WHERE code=${code} FOR UPDATE`;
    const r=rows[0];if(!r||r.status==="closed"||r.state.banned.includes(user.id))throw new HttpError(404,"That invitation is unavailable. Ask the host for a current link.");
    if(r.player_ids.includes(user.id))return roomPublic(r,user.id);
    if(r.status!=="lobby")throw new HttpError(409,"This race has started. Ask your friend to create the next one.");
    return seatDriver(tx,r,user,profile);
  });
}
type Tx=TransactionSql;
type Profile=Awaited<ReturnType<typeof ensureProfile>>;
/** Seats a driver in a waiting room (both invite and open races). A sixth driver starts an open race at once. */
async function seatDriver(tx:Tx,r:RoomRow,user:User,profile:Profile){
  if(r.state.seats.length>=6)throw new HttpError(409,"This room already has six drivers.");
  const name=cleanName(user.name);
  r.state.seats.push({id:user.id,name:r.state.open?openName(name):name,bot:false,ready:!!r.state.open,skin:profile.equipped_skin,mascot:profile.equipped_mascot});r.player_ids.push(user.id);
  r.state.startsAt=lobbyClock(r.state,Date.now());
  if(r.state.open&&r.state.seats.length>=6)await startGame(tx,r);
  r.revision++;
  await tx`UPDATE bcb_rooms SET state=${tx.json(r.state as never)},player_ids=${r.player_ids},status=${r.status},revision=${r.revision},updated_at=now() WHERE id=${r.id}`;
  return roomPublic(r,user.id);
}
async function startGame(tx:Tx,r:RoomRow){
  for(const seat of r.state.seats.filter(s=>!s.bot)){const p=await tx`SELECT equipped_skin,equipped_mascot FROM bcb_profiles WHERE user_id=${seat.id}`;if(p[0]){seat.skin=p[0].equipped_skin;seat.mascot=p[0].equipped_mascot;}}
  r.state.game=makeGame(r.state.seats,r.state.map,r.state.pace,rng,Date.now(),{manualMidway:true,starterMidway:true});r.state.startsAt=undefined;
  r.status=r.state.game.phase==="finished"?"finished":"playing";
}
const OPEN_ROWS=(tx:Tx|typeof db)=>(tx as typeof db)<RoomRow[]>`SELECT * FROM bcb_rooms WHERE status='lobby' AND state->>'open'='true' AND updated_at>now()-interval '3 hours' ORDER BY created_at ASC LIMIT 60`;
/** Open races still in the waiting room with a free seat (plus any you're already in). */
export async function openRooms(user:string){
  const now=Date.now();
  return (await OPEN_ROWS(db)).filter(r=>(r.player_ids.includes(user)||r.state.seats.length<6&&!r.state.banned.includes(user))&&!(r.state.startsAt&&r.state.startsAt<now-15000)).slice(0,20)
    .map(r=>({id:r.id,map:r.state.map,pace:r.state.pace,title:paceName(r.state.pace),host:r.state.seats.find(s=>s.id===r.host_id)?.name||"Driver",drivers:r.state.seats.length,people:r.state.seats.filter(s=>!s.bot).length,startsAt:r.state.startsAt??null,now,mine:r.player_ids.includes(user)}));
}
/** Join an open race from the list. */
export async function joinOpen(user:User,id:string){
  await rate(user.id,"join",20,3600);
  const profile=await ensureProfile(user);user={...user,name:profile.driver_name};
  return db.begin(async tx=>{
    const rows=await tx<RoomRow[]>`SELECT * FROM bcb_rooms WHERE id=${id} FOR UPDATE`;
    const r=rows[0];if(!r||!r.state.open||r.status==="closed"||r.state.banned.includes(user.id))throw new HttpError(404,"That race isn’t open any more. Pick another one or try Quick Match.");
    if(r.player_ids.includes(user.id))return roomPublic(r,user.id);
    if(r.status!=="lobby")throw new HttpError(409,"That race just started. Pick another one or try Quick Match.");
    return seatDriver(tx,r,user,profile);
  });
}
/** Quick Match: rejoin your open waiting room, or take a seat in the fullest open race, or open a new Quick race. */
export async function quickMatch(user:User){
  await rate(user.id,"quick",20,3600);
  const now=Date.now(),rows=await OPEN_ROWS(db);
  const mine=rows.find(r=>r.player_ids.includes(user.id));if(mine)return roomPublic(mine,user.id);
  const people=(r:RoomRow)=>r.state.seats.filter(s=>!s.bot).length;
  const choices=rows.filter(r=>r.state.seats.length<6&&!r.state.banned.includes(user.id)&&!(r.state.startsAt&&r.state.startsAt<now+5000))
    .sort((a,b)=>(a.state.pace==="quick"?0:1)-(b.state.pace==="quick"?0:1)||people(b)-people(a)||+a.created_at-+b.created_at);
  for(const r of choices){try{return await joinOpen(user,r.id);}catch(e){if(!(e instanceof HttpError))throw e;}}
  return createRoom(user,Math.random()<.5?"day":"night","quick",true);
}
export async function readRoom(user:string,id:string){
  const rows=await db<RoomRow[]>`SELECT * FROM bcb_rooms WHERE id=${id} AND ${user}=ANY(player_ids)`;
  const r=rows[0];if(!r)throw new HttpError(404,"This room is unavailable to your account. Join using its invitation link.");
  if(r.status==="lobby"&&r.state.open&&r.state.startsAt&&r.state.startsAt<=Date.now())return mutateRoom(user,id,{action:"tick"});
  if(r.status==="playing"&&r.state.game&&(r.state.game.deadline<=Date.now()||(r.state.game.phase==="pick"&&!r.state.game.players.some(p=>p.active&&!r.state.game!.picks[p.id]))))return mutateRoom(user,id,{action:"tick"});
  return roomPublic(r,user);
}
export type Command={action:"ready";ready:boolean}|{action:"bot"}|{action:"leave"}|{action:"remove";playerId:string}|{action:"start"}|{action:"pick";pick:Pick;round:number}|{action:"policy";policy:Policy}|{action:"close"}|{action:"drawMidway";round:number}|{action:"placeMidway";round:number;cardId:string}|{action:"tick"};
export async function mutateRoom(user:string,id:string,command:Command){
  return db.begin(async tx=>{
    const rows=await tx<RoomRow[]>`SELECT * FROM bcb_rooms WHERE id=${id} AND ${user}=ANY(player_ids) FOR UPDATE`;
    const r=rows[0];if(!r)throw new HttpError(404,"This room is unavailable to your account.");
    if(r.status==="closed"&&command.action!=="close")throw new HttpError(409,"The host closed this room.");
    const host=()=>{if(r.host_id!==user)throw new HttpError(403,"Only the host can do that.");};
    const lobby=()=>{if(r.status!=="lobby")throw new HttpError(409,"The race has already started.");};
    switch(command.action){
      case "ready":lobby();r.state.seats.find(p=>p.id===user)!.ready=command.ready;break;
      case "bot":host();lobby();if(r.state.seats.length>=6)throw new HttpError(409,"Six drivers is the room limit.");r.state.seats.push({id:"bot-"+randomUUID(),name:["Penny","Ace","Tilly","Sparky","Wally"][r.state.seats.filter(p=>p.bot).length],bot:true,ready:true});if(r.state.open&&r.state.seats.length>=6)await startGame(tx,r);break;
      case "leave":lobby();if(r.host_id===user)throw new HttpError(400,"Hosts close the room instead of leaving.");r.state.seats=r.state.seats.filter(p=>p.id!==user);r.player_ids=r.player_ids.filter(p=>p!==user);r.state.startsAt=lobbyClock(r.state,Date.now());break;
      case "remove":{host();lobby();if(command.playerId===user)throw new HttpError(400,"The host must stay in the room.");const seat=r.state.seats.find(p=>p.id===command.playerId);if(!seat)throw new HttpError(404,"Driver not found.");r.state.seats=r.state.seats.filter(p=>p.id!==command.playerId);r.player_ids=r.player_ids.filter(p=>p!==command.playerId);if(!seat.bot)r.state.banned.push(seat.id);r.state.startsAt=lobbyClock(r.state,Date.now());break;}
      case "start":host();lobby();if(r.state.seats.some(p=>!p.ready))throw new HttpError(409,"Wait for every driver to ready up.");if(r.state.seats.length<2)throw new HttpError(409,"A race needs at least two drivers.");await startGame(tx,r);break;
      case "pick":if(!r.state.game||r.status!=="playing")throw new HttpError(409,"There is no active round.");advanceGame(r.state.game,rng);submitPick(r.state.game,user,command.pick,command.round,rng);if(r.state.game.phase==="finished")r.status="finished";break;
      case "drawMidway":case "placeMidway":if(!r.state.game||r.status!=="playing")throw new HttpError(409,"There is no active race.");midwayAction(r.state.game,user,command.round,command.action==="drawMidway"?"reveal":"place",command.action==="placeMidway"?command.cardId:undefined,rng);if(r.state.game.phase==="finished")r.status="finished";break;
      case "policy":{if(!r.state.game||r.status!=="playing")throw new HttpError(409,"There is no active race.");if(r.state.game.players.some(p=>!p.bot&&r.state.game!.picks[p.id]))throw new HttpError(409,"A driver has locked in. Change responses before the next round's first pick.");r.state.game.players.find(p=>p.id===user)!.policy=command.policy;break;}
      case "close":host();r.status="closed";break;
      case "tick":if(r.status==="lobby"&&r.state.open&&r.state.startsAt&&r.state.startsAt<=Date.now()){if(r.state.seats.length>=2)await startGame(tx,r);else r.state.startsAt=undefined;}
        else if(r.state.game&&r.status==="playing"){advanceGame(r.state.game,rng);if(r.state.game.phase==="finished")r.status="finished";}break;
    }
    if(r.state.game&&r.status==="finished")await creditFinished(tx,r.id,r.state.game);
    r.revision++;
    await tx`UPDATE bcb_rooms SET state=${tx.json(r.state as never)},player_ids=${r.player_ids},status=${r.status},revision=${r.revision},updated_at=now() WHERE id=${r.id}`;
    return roomPublic(r,user);
  });
}
export function apiError(error:unknown){
  const options={headers:{"Cache-Control":"private, no-store"}};
  if(error instanceof HttpError)return Response.json({error:error.message},{status:error.status,...options});
  if(error instanceof GameError)return Response.json({error:error.message},{status:409,...options});
  console.error("Private room request failed",{code:(error as {code?:string})?.code||"unknown"});
  return Response.json({error:"The fairground is taking a moment. Please try again."},{status:503,...options});
}
