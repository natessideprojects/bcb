import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import postgres from 'postgres';
const qa=JSON.parse(readFileSync('work/qa-accounts.json','utf8')),a=qa.accounts[0],base=process.env.TEST_URL||'http://localhost:3000';
assert.ok(a.email.endsWith('@example.invalid'),'Only synthetic QA accounts may be funded');
const jar=new Map();
async function call(url,body){const res=await fetch(base+url,{method:body?'POST':'GET',headers:{origin:base,'content-type':'application/json',cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')},body:body?JSON.stringify(body):undefined});for(const c of res.headers.getSetCookie()){const t=c.split(';')[0],i=t.indexOf('=');jar.set(t.slice(0,i),t.slice(i+1));}return {status:res.status,data:await res.json()};}
assert.equal((await call('/api/auth/sign-in/email',{email:a.email,password:a.password})).status,200);
const sql=postgres(process.env.DATABASE_URL,{ssl:{rejectUnauthorized:true},max:1,prepare:false});
try{
 const rows=await sql`UPDATE bcb_profiles SET wallet=wallet+200 WHERE user_id=${a.id} AND is_test=true RETURNING wallet,earned_tickets`;assert.equal(rows.length,1);
 const before=rows[0].wallet,earned=rows[0].earned_tickets;
 const both=await Promise.all([call('/api/shop',{action:'buy',itemId:'rocket'}),call('/api/shop',{action:'buy',itemId:'rocket'})]);assert.ok(both.every(r=>r.status===200));
 const state=(await call('/api/shop')).data.shop;assert.equal(state.wallet,before-90);assert.equal(state.owned.filter(x=>x==='rocket').length,1);
 const eq=await call('/api/shop',{action:'equip',itemId:'rocket'});assert.equal(eq.data.shop.skin,'rocket');
 assert.equal((await call('/api/shop',{action:'buy',itemId:'balloon-dog'})).status,200);assert.equal((await call('/api/shop',{action:'equip',itemId:'balloon-dog'})).data.shop.mascot,'balloon-dog');
 const after=(await call('/api/profile')).data.profile;assert.equal(after.earnedTickets,earned);assert.equal(after.wallet,before-115);
 const room=(await call('/api/rooms',{map:'night',pace:'relaxed'})).data.room;await call('/api/rooms/'+room.id,{action:'bot'});const started=await call('/api/rooms/'+room.id,{action:'start'});assert.equal(started.status,200);const player=started.data.room.game.players.find(p=>p.id===a.id);assert.equal(player.skin,'rocket');assert.equal(player.mascot,'balloon-dog');
 console.log('PASS: concurrent purchase charged once, inventory saved, equip persisted, mascot combined, no lifetime ticket change, loadout appears in new race');
}finally{await sql.end();}
