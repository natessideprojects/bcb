import {db} from "./db";
import type {TransactionSql} from "postgres";
import type {Game} from "./game/engine";
export type Profile={user_id:string;equipped_skin:string;equipped_mascot:string|null;driver_name:string;is_test:boolean;earned_tickets:number;wallet:number;races:number;wins:number;bashes:number;doubles:number;laps:number;best_score:number;points:number};
const name=(s:string)=>s.replace(/[\u0000-\u001f<>]/g,"").trim().slice(0,24)||"Driver";
export const tier=(points:number)=>points>=600?"Grand Champion":points>=300?"Blue Ribbon":points>=150?"Gold Ticket":points>=50?"Silver Ticket":"Bronze Ticket";
export async function ensureProfile(user:{id:string;name:string;isTest?:boolean}){
 const rows=await db<Profile[]>`INSERT INTO bcb_profiles(user_id,driver_name,is_test) VALUES (${user.id},${name(user.name)},${!!user.isTest}) ON CONFLICT (user_id) DO UPDATE SET is_test=bcb_profiles.is_test OR excluded.is_test RETURNING *`;
 return rows[0];
}
export async function account(user:{id:string;name:string;isTest?:boolean}){
 const found=await db<Profile[]>`SELECT * FROM bcb_profiles WHERE user_id=${user.id}`;
 const p=found[0]||await ensureProfile(user);
 const recent=await db`SELECT room_id,score,reward,won,bashes,doubles,laps,rounds,created_at FROM bcb_results WHERE user_id=${user.id} ORDER BY created_at DESC LIMIT 12`;
 const ranking=await db`SELECT count(*)::int+1 AS rank FROM bcb_profiles WHERE is_test=false AND races>0 AND (points>${p.points} OR (points=${p.points} AND wins>${p.wins}) OR (points=${p.points} AND wins=${p.wins} AND earned_tickets>${p.earned_tickets}))`;
 return {skin:p.equipped_skin,mascot:p.equipped_mascot,name:p.driver_name,earnedTickets:p.earned_tickets,wallet:p.wallet,races:p.races,wins:p.wins,bashes:p.bashes,doubles:p.doubles,laps:p.laps,bestScore:p.best_score,points:p.points,tier:tier(p.points),rank:p.races&&!p.is_test?ranking[0].rank:null,recent};
}
export async function renameProfile(user:{id:string;name:string;isTest?:boolean},driverName:string){await ensureProfile(user);await db`UPDATE bcb_profiles SET driver_name=${name(driverName)} WHERE user_id=${user.id}`;return account(user);}
export async function rankings(viewer:string){const rows=await db<(Profile&{standing:number})[]>`SELECT *, (rank() OVER (ORDER BY points DESC,wins DESC,earned_tickets DESC))::int AS standing FROM bcb_profiles WHERE is_test=false AND races>0 ORDER BY points DESC,wins DESC,earned_tickets DESC,driver_name ASC LIMIT 50`;return rows.map(p=>({rank:p.standing,name:p.driver_name,points:p.points,tier:tier(p.points),wins:p.wins,races:p.races,tickets:p.earned_tickets,bashes:p.bashes,me:p.user_id===viewer}));}
// The room row is already locked. The receipt and totals commit in the SAME
// transaction as the finished game. A retry never grants a second reward.
export async function creditFinished(tx:TransactionSql,roomId:string,g:Game){
 if(g.rules!=="3.4"||g.phase!=="finished")return;
 for(const p of g.players.filter(p=>!p.bot)){
  const won=g.winners.includes(p.id),reward=Math.max(0,p.tickets-3)+2+(won?3:0),points=5+(won?10:0)+Math.min(15,Math.max(0,p.tickets-3));
  const stats=p.stats||{bashes:0,doubles:0,laps:0};
  const receipt=await tx`INSERT INTO bcb_results(room_id,user_id,score,reward,won,bashes,doubles,laps,rounds,points) VALUES (${roomId},${p.id},${p.tickets},${reward},${won},${stats.bashes},${stats.doubles},${stats.laps},${g.round},${points}) ON CONFLICT DO NOTHING RETURNING user_id`;
  if(!receipt.length)continue;
  await tx`INSERT INTO bcb_profiles(user_id,driver_name) VALUES (${p.id},${name(p.name)}) ON CONFLICT DO NOTHING`;
  await tx`UPDATE bcb_profiles SET earned_tickets=earned_tickets+${reward},wallet=wallet+${reward},races=races+1,wins=wins+${won?1:0},bashes=bashes+${stats.bashes},doubles=doubles+${stats.doubles},laps=laps+${stats.laps},best_score=greatest(best_score,${p.tickets}),points=points+${points} WHERE user_id=${p.id}`;
 }
}

export type Account=Awaited<ReturnType<typeof account>>;
export type Ranking=Awaited<ReturnType<typeof rankings>>[number];
