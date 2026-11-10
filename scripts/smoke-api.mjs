import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
const base=process.env.TEST_URL||'http://localhost:3000';
const root=process.cwd();if(root.toLowerCase().split(/[\\/]/).includes('onedrive'))throw Error('Invalid workspace');
const stamp=Date.now();
class Driver{
  jar=new Map();id='';
  constructor(name,index){this.name=name;this.email=`bcb-qa-${stamp}-${index}@example.invalid`;this.password=randomBytes(18).toString('base64url')+'aA9!';}
  async call(url,body,origin=base){
    const res=await fetch(base+url,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'content-type':'application/json',origin}),'cookie':[...this.jar].map(([k,v])=>`${k}=${v}`).join('; ')},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});
    for(const c of res.headers.getSetCookie()){const first=c.split(';')[0],i=first.indexOf('=');const k=first.slice(0,i),v=first.slice(i+1);if(v)this.jar.set(k,v);else this.jar.delete(k);}
    const data=await res.json().catch(()=>null);return {status:res.status,data};
  }
  async signup(){const r=await this.call('/api/auth/sign-up/email',{email:this.email,password:this.password,name:this.name});if(r.status!==200)throw Error(`Signup HTTP ${r.status}: ${r.data?.code||r.data?.error?.code||r.data?.message||'not successful'}`);const s=await this.call('/api/auth/get-session');assert.ok(s.data?.user?.id,'New account must have a genuine signed-in session');this.id=s.data.user.id;}
}
const a=new Driver('Brake Tester',1),b=new Driver('Bumper Tester',2),outsider=new Driver('Outside Tester',3);
for(const p of [a,b,outsider])await p.signup();
console.log('PASS: three isolated managed-auth accounts and sessions');
mkdirSync(path.join(root,'work'),{recursive:true});
writeFileSync(path.join(root,'work','qa-accounts.json'),JSON.stringify({base,accounts:[a,b,outsider].map(p=>({name:p.name,email:p.email,password:p.password,id:p.id})),createdRooms:[]},null,2));
const anonymous=new Driver('anonymous',0);
assert.equal((await anonymous.call('/api/rooms')).status,401);
assert.equal((await a.call('/api/rooms',{map:'day',pace:'relaxed'},'https://outside.invalid')).status,403);
let r=await a.call('/api/rooms',{map:'day',pace:'relaxed'});assert.equal(r.status,200);const id=r.data.room.id,code=r.data.room.code;
writeFileSync(path.join(root,'work','qa-accounts.json'),JSON.stringify({base,accounts:[a,b,outsider].map(p=>({name:p.name,email:p.email,password:p.password,id:p.id})),createdRooms:[id]},null,2));
assert.equal((await outsider.call('/api/rooms/'+id)).status,404);
assert.equal((await outsider.call('/api/rooms')).data.rooms.length,0);
assert.equal((await b.call('/api/rooms/join',{code})).status,200);
assert.equal((await b.call('/api/rooms/'+id,{action:'start'})).status,403);
assert.equal((await a.call('/api/rooms/'+id,{action:'start'})).status,409);
await b.call('/api/rooms/'+id,{action:'ready',ready:true});
await a.call('/api/rooms/'+id,{action:'bot'});
r=await a.call('/api/rooms/'+id,{action:'start'});assert.equal(r.status,200);assert.equal(r.data.room.status,'playing');
console.log('PASS: invite join, membership privacy, ready-up and host-only start');
let av=r.data.room,bv=(await b.call('/api/rooms/'+id)).data.room;
assert.ok(!('hand' in av.game.players.find(p=>p.id===b.id)));
assert.ok(!('picks' in av.game));assert.ok(!('speedDeck' in av.game));
const foreign=bv.game.me.hand[0].id;
assert.equal((await a.call('/api/rooms/'+id,{action:'pick',round:av.game.round,pick:{primary:foreign}})).status,409);
const round=av.game.round,pa=av.game.me.hand[0].id,pb=bv.game.me.hand[0].id;
const first=await a.call('/api/rooms/'+id,{action:'pick',round,pick:{primary:pa}});assert.equal(first.status,200);
bv=(await b.call('/api/rooms/'+id)).data.room;assert.ok(bv.game.players.find(p=>p.id===a.id).locked);assert.ok(!JSON.stringify(bv).includes('"'+pa+'"'));
const duplicate=await a.call('/api/rooms/'+id,{action:'pick',round,pick:{primary:pa}});assert.equal(duplicate.status,200);assert.equal(duplicate.data.room.game.round,round);
const results=await Promise.all([b.call('/api/rooms/'+id,{action:'pick',round,pick:{primary:pb}}),b.call('/api/rooms/'+id,{action:'pick',round,pick:{primary:pb}})]);assert.ok(results.some(r=>r.status===200));assert.ok(results.every(r=>r.status===200||r.status===409));
av=(await a.call('/api/rooms/'+id)).data.room;assert.equal(av.game.round,round+1);assert.equal(av.game.lastReveal.length,3);
console.log('PASS: foreign-card rejection, hidden locked picks, duplicate submits and one atomic round');
for(let turns=0;turns<45&&av.status!=='finished';turns++){
  for(const p of [a,b]){const current=(await p.call('/api/rooms/'+id));assert.equal(current.status,200);const room=current.data.room,g=room.game;if(room.status==='finished'){av=room;break;}const player=g.players.find(x=>x.id===p.id);if(player.active&&!player.locked){const q=await p.call('/api/rooms/'+id,{action:'pick',round:g.round,pick:{primary:g.me.hand[0].id}});assert.equal(q.status,200);av=q.data.room;}}
}
assert.equal(av.status,'finished');assert.ok(av.game.winners.length);
const before=(await a.call('/api/auth/sign-out',{}));assert.equal(before.status,200);assert.equal((await a.call('/api/rooms')).status,401);
const signin=await a.call('/api/auth/sign-in/email',{email:a.email,password:a.password});assert.equal(signin.status,200);const restored=await a.call('/api/rooms/'+id);assert.equal(restored.status,200);assert.equal(restored.data.room.status,'finished');assert.deepEqual(restored.data.room.game.winners,av.game.winners);
console.log('PASS: complete multiplayer game, scoring, sign-out, sign-in, and saved race recovery');

assert.equal((await anonymous.call('/api/profile')).status,401);
const profile=(await a.call('/api/profile')).data.profile;
assert.equal(profile.races,1);assert.equal(profile.recent.length,1);
const mine=av.game.players.find(p=>p.id===a.id),won=av.game.winners.includes(a.id);
assert.equal(profile.wallet,Math.max(0,mine.tickets-3)+2+(won?3:0));assert.equal(profile.wins,won?1:0);
await Promise.all([a.call('/api/rooms/'+id),a.call('/api/rooms/'+id)]);
const stable=(await a.call('/api/profile')).data.profile;assert.equal(stable.races,1);assert.equal(stable.wallet,profile.wallet);
assert.equal((await outsider.call('/api/profile')).data.profile.recent.length,0);
const ladder=(await a.call('/api/leaderboard'));assert.equal(ladder.status,200);assert.ok(!ladder.data.drivers.some(p=>p.name==='Brake Tester'));
const renamed=await a.call('/api/profile',{name:'Brake Inspector'});assert.equal(renamed.status,200);assert.equal(renamed.data.profile.name,'Brake Inspector');
const waiting=await a.call('/api/rooms',{map:'night',pace:'relaxed'});assert.equal(waiting.status,200);assert.equal(waiting.data.room.seats[0].name,'Brake Inspector');await a.call('/api/rooms/'+waiting.data.room.id,{action:'close'});
console.log('PASS: persistent profile awards, duplicate-credit prevention, private history, name update and genuine leaderboard');

writeFileSync(path.join(root,'work','api-smoke-result.json'),JSON.stringify({base,roomId:id,passed:true,rounds:av.game.round,accounts:3,checks:['real auth','401 anonymous','403 bad origin','404 nonmember','private invite join','host controls','ready-up','foreign-card rejection','hidden hand/pick','duplicate submission','atomic round','finished game','saved recovery','profile awards','idempotent rewards','private profile history','profile rename','leaderboard']},null,2));
console.log('PASS: end-to-end private multiplayer API story');
