"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {ArrowLeft,ArrowRight,Check,Clock3,Copy,Flag,Info,Lock,Plus,RefreshCw,RotateCcw,Shield,SkipForward,Ticket,Trophy,Users,X,Zap} from "lucide-react";
import {Brand,Car} from "./brand";
import {Rules} from "./rules";
import {Board} from "./board";
import {useRoundReplay} from "./use-round-replay";
import {ReplayScene} from "./replay-scene";
import {EventArt,SpeedDial} from "./card-art";
import {api} from "@/lib/client-api";
import {fairSound} from "@/lib/fair-audio";
import {CONDITIONS,EVENTS,MAPS,type Policy} from "@/lib/game/catalog";
import type {PublicRoom,Command} from "@/lib/rooms";

function Timer({deadline,quick}:{deadline:number;quick:boolean}){
 const[now,setNow]=useState(Date.now()),warned=useRef(0);
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t);},[]);
 const secs=Math.max(0,Math.ceil((deadline-now)/1000));
 useEffect(()=>{if(quick&&secs===10&&warned.current!==deadline){warned.current=deadline;fairSound.effect("beep");fairSound.say("round_ten_seconds",2);}},[secs,quick,deadline]);
 return <span className={`round-timer ${secs<15?"urgent":""}`}><Clock3 size={15}/>{secs>3600?`${Math.floor(secs/3600)}h ${Math.floor(secs%3600/60)}m`:secs>60?`${Math.floor(secs/60)}m ${secs%60}s`:secs?`${secs}s`:"Resolving…"}</span>;
}

export function Race({id,user}:{id:string;user:{id:string;name:string}}){
 const router=useRouter();const[room,setRoom]=useState<PublicRoom|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false),[rules,setRules]=useState(false),[copied,setCopied]=useState(false),[primary,setPrimary]=useState(""),[extra,setExtra]=useState(""),[boost,setBoost]=useState(""),[peek,setPeek]=useState(""),[policy,setPolicy]=useState<Policy>({dead:"pay",karma:"use",daddy:"intercept",bash:"strongest"});
 const load=useCallback(async()=>{try{const r=await api<{room:PublicRoom}>("/api/rooms/"+id);setRoom(old=>!old||r.room.id!==old.id||r.room.revision>=old.revision?r.room:old);setError("");}catch(e){setError((e as Error).message);}},[id]);
 useEffect(()=>{let active=true;const pull=()=>{if(active&&document.visibilityState==="visible")void load();};pull();if(room?.status==="finished"||room?.status==="closed")return()=>{active=false;};const timer=setInterval(pull,room?.status==="lobby"?6000:4000);document.addEventListener("visibilitychange",pull);return()=>{active=false;clearInterval(timer);document.removeEventListener("visibilitychange",pull);};},[load,room?.status]);
 const game=room?.game;const theater=useRoundReplay(game||undefined,user.id);const me=game?.players.find(p=>p.id===user.id),own=game?.me,host=room?.hostId===user.id;
 useEffect(()=>{setPrimary("");setExtra("");setBoost("");setPeek("");},[game?.round]);
 useEffect(()=>{if(own?.policy)setPolicy(own.policy);},[own?.policy.dead,own?.policy.karma,own?.policy.daddy,own?.policy.bash]); // eslint-disable-line react-hooks/exhaustive-deps

 // Announcer moments outside the round playback: drivers arriving, everyone ready, the start.
 const seen=useRef<{status?:string;seats?:number;ready?:boolean}>({});
 const ready=room?.seats.every(p=>p.ready),humanLocked=game?.players.some(p=>!p.bot&&p.locked);
 useEffect(()=>{if(!room)return;const was=seen.current;
  if(was.status==="lobby"&&room.status==="playing"){fairSound.effect("go");fairSound.say("start_engines",3);}
  else if(room.status==="lobby"&&was.seats!==undefined){if(room.seats.length>was.seats){fairSound.effect("chime");fairSound.say("lobby_joined",2);}else if(ready&&!was.ready&&room.seats.length>1)fairSound.say("lobby_ready",2);}
  seen.current={status:room.status,seats:room.seats.length,ready};},[room?.status,room?.seats.length,ready]); // eslint-disable-line react-hooks/exhaustive-deps

 async function command(cmd:Command){setBusy(true);setError("");try{const r=await api<{room:PublicRoom}>("/api/rooms/"+id,cmd);setRoom(old=>!old||r.room.id!==old.id||r.room.revision>=old.revision?r.room:old);if(cmd.action==="pick"){fairSound.effect("lock");fairSound.say("round_locked",1);}}catch(e){setError((e as Error).message);void load();}finally{setBusy(false);}}
 async function invite(){if(!room)return;try{await navigator.clipboard.writeText(window.location.origin+"/join/"+room.code);setCopied(true);setTimeout(()=>setCopied(false),2500);}catch{setError("Copy the room code below and send it to your friends.");}}
 async function again(){setBusy(true);try{const r=await api<{room:PublicRoom}>("/api/rooms",{map:room!.map,pace:room!.pace});router.push("/room/"+r.room.id);}catch(e){setError((e as Error).message);setBusy(false);}}
 const held=own?.held||[],selectedBoost=held.find(c=>c.id===boost),boostKind=selectedBoost?.kind,needsExtra=boostKind==="M05"||boostKind==="M09",locked=!!own?.pick;
 function choosePrimary(value:string){fairSound.effect("select");setPrimary(value);if(boostKind==="M05")setExtra([...(own?.hand||[])].filter(c=>c.id!==value).sort((a,b)=>a.value-b.value)[0]?.id||"");else if(extra===value)setExtra("");}
 function chooseBoost(value:string){const next=boost===value?"":value;setBoost(next);const card=held.find(c=>c.id===next);setExtra(card?.kind==="M05"?[...(own?.hand||[])].filter(c=>c.id!==primary).sort((a,b)=>a.value-b.value)[0]?.id||"":"");}
 const inGame=!!(room&&room.status!=="lobby"&&room.status!=="closed"&&game&&me&&own);

 if(inGame&&game&&me&&own&&room){
  const condition=CONDITIONS[theater.visual?.condition||game.condition],direction=theater.visual?.direction||game.direction,finished=game.phase==="finished";
  const peekCard=held.find(c=>c.id===peek)||selectedBoost;
  const canPlay=!busy&&!theater.active&&!locked&&me.active&&!finished;
  const status=theater.active?`ROUND ${theater.round} ON THE RINK`:finished?"RACE COMPLETE":locked?"LOCKED IN":!me.active?(me.stalled?"STALLED":"SITTING OUT"):"YOUR MOVE";
  const title=theater.active?"Watch the rink!":finished?"That’s a wrap.":locked?"Keep your poker face.":!me.active?(me.stalled?"Engine trouble.":"Back next round."):"Pick your speed.";
  const hint=theater.active?"Your next hand is ready when the show ends. Tap Skip to jump ahead.":peekCard?`${EVENTS[peekCard.kind].name}: ${EVENTS[peekCard.kind].text}`:finished?"":locked?"Cards flip when every driver locks in.":!me.active?(me.stalled?"Roll 4–6 next round to clear the stall. Defenses still protect you.":"Your saved defenses still protect you."):me.compelled?"Sauron’s curse: land a direct bash to move.":"Higher cards move first. Land on a rival to bash them.";
  const lockedCount=game.players.filter(p=>p.active&&p.locked).length,activeCount=game.players.filter(p=>p.active).length;
  return <>
   <header className="site-header race-header compact"><Brand/><div className="race-heading"><span className="eyebrow light">{room.pace==="quick"?"QUICK RACE":"FRIENDS RACE"} · {game.trackLength||28} SECTIONS</span><strong>{MAPS[room.map].name} · {finished?"Final":`Round ${theater.active?theater.round:game.round}`}</strong></div>{game.phase==="pick"&&!theater.active&&<Timer deadline={game.deadline} quick={room.pace==="quick"}/>}<nav><button className="text-button" onClick={()=>setRules(true)}><Info size={17}/><span>Rules</span></button><Link href="/" className="text-button"><ArrowLeft size={16}/><span>Races</span></Link></nav></header>
   <main className="arena">
    {error&&<p className="alert arena-alert" role="alert">{error} <button onClick={()=>void load()}>Refresh</button></p>}
    <section className="arena-stage">
     <div className={`stage-frame ${theater.active?"playing":""}`}>
      <Board game={game} userId={user.id} visual={theater.visual} motion={theater.motion} fx={theater.fx} shake={theater.shake} spotlight={theater.spotlight} hot={theater.banner?.kind==="hazard"&&theater.visual?{pos:theater.visual.players[theater.banner.actor]?.pos??0,kind:theater.banner.hazard}:null} round={theater.active?theater.round:undefined}/>
      <ReplayScene show={theater} game={game}/>
      <div className="stage-chips"><span className="stage-chip condition" title={condition.text}><Zap size={14}/><b>{condition.name}</b><i>{condition.text}</i></span><span className="stage-chip" title={direction===1?"Driving clockwise":"Driving counterclockwise"}>{direction===1?"↻":"↺"}</span></div>
      <div className="stage-controls">{theater.active?<button className="stage-button" onClick={theater.skip}><SkipForward size={14}/> Skip</button>:game.replay&&<button className="stage-button" onClick={()=>{fairSound.effect("tap");theater.replay();}}><RotateCcw size={14}/> Replay round {game.replay.round}</button>}</div>
      {finished&&!theater.active&&<div className="finish-card" role="status"><Trophy size={40}/><span className="eyebrow">THE BLUE RIBBON GOES TO</span><h2>{game.winners.map(id=>game.players.find(p=>p.id===id)!.name).join(" & ")}{game.winners.includes(user.id)?" — that’s you!":"!"}</h2><p>{game.players.find(p=>p.id===game.winners[0])?.tickets} tickets · {game.round} rounds of good-natured chaos</p><button className="button red small" onClick={again} disabled={busy}>Race again <ArrowRight size={16}/></button></div>}
     </div>
    </section>

    <section className="arena-dock" aria-label="Your hand">
     <div className="dock-status">
      <span className="eyebrow">{status}</span>
      <strong>{title}</strong>
      <span className="ticket-chip" title="Your tickets"><Ticket size={16}/>{me.tickets}<small>tickets</small></span>
      {hint&&<p>{hint}</p>}
     </div>
     <div className="dock-cards">
      <div className="speed-row" role="group" aria-label="Speed Cards">{own.hand.map(c=><button key={c.id} className={`mini-speed ${(own.pick?.primary||primary)===c.id?"chosen":""} ${extra===c.id?"extra":""}`} aria-label={`Speed ${c.value}`} aria-pressed={(own.pick?.primary||primary)===c.id} disabled={!canPlay} onClick={()=>choosePrimary(c.id)}><span className="corner">{c.value}</span><strong>{c.value}</strong><SpeedDial value={c.value}/></button>)}{!own.hand.length&&<p className="subtle">No Speed Cards left.</p>}</div>
      <div className="midway-row" role="group" aria-label="Midway cards">{held.map(c=>{const e=EVENTS[c.kind],isBoost=e.type==="BOOST",usable=isBoost&&canPlay&&game.condition!=="lights"&&!((c.kind==="M05"||c.kind==="M09")&&own.hand.length<2);return <button key={c.id} className={`midway-chip ${e.type.toLowerCase()} ${boost===c.id?"chosen":""} ${usable?"usable":""}`} title={`${e.name}: ${e.text}`} aria-pressed={boost===c.id} onClick={()=>{fairSound.effect("tap");setPeek(peek===c.id?"":c.id);if(usable)chooseBoost(c.id);}}><EventArt kind={c.kind}/><span><b>{e.name}</b><small>{isBoost?(usable?(boost===c.id?"Added to move":"Tap to boost"):game.condition==="lights"?"No boosts now":"Boost"):e.type==="DEFENSE"?"Auto defense":"Auto on bash"}</small></span></button>;})}{!held.length&&<p className="midway-empty">Match another driver’s card (Doubles) to win Midway cards.</p>}</div>
     </div>
     <div className="dock-action">
      {needsExtra&&!locked&&game.phase==="pick"&&<label className="extra-pick">{boostKind==="M05"?"Plus your lowest card":"Second move"}<select value={extra} disabled={boostKind==="M05"||busy} onChange={e=>setExtra(e.target.value)}><option value="">Pick a card</option>{own.hand.filter(c=>c.id!==primary).map(c=><option key={c.id} value={c.id}>Speed {c.value}</option>)}</select></label>}
      {game.phase==="pick"&&<button className="button red lock-button" disabled={!canPlay||!primary||(needsExtra&&!extra)} onClick={()=>void command({action:"pick",round:game.round,pick:{primary,...(boost?{boost}:{}),...(needsExtra&&extra?{extra}:{})}})}>{busy?"Locking…":locked?<><Check size={18}/> Locked</>:!me.active?"Next round":primary?<><Lock size={16}/> Lock in {own.hand.find(c=>c.id===primary)?.value}</>:"Pick a card"}</button>}
      {finished?<button className="button red lock-button" onClick={again} disabled={busy}>Race again <ArrowRight size={16}/></button>:<small className="lock-count">{lockedCount} of {activeCount} locked in</small>}
     </div>
    </section>

    <aside className="arena-rail">
     <section className="lineup" aria-label="The lineup">
      <h3>The lineup <span>tickets</span></h3>
      {[...game.players].sort((a,b)=>b.tickets-a.tickets||a.seat-b.seat).map(p=>{const reveal=game.lastReveal.find(r=>r.id===p.id);return <article className={`line-row ${p.id===user.id?"is-you":""} ${theater.spotlight===p.id?"moving":""}`} key={p.id}><span className="line-car"><Car color={p.color} width="38" height="40"/><i style={{background:p.color}}>{p.seat+1}</i></span><div><strong>{p.name}{p.id===user.id?" (you)":""}</strong><small>{p.pos===0?"Start Grid":`Section ${p.pos}`} · Lap {p.lap}{p.lane==="mini"?" · Mini":""}{reveal?` · played ${reveal.primary}`:""}</small><small className="line-state">{p.stalled?"Stalled · ":""}{p.skip?"Skips next · ":""}{p.compelled?"Sauron’s curse · ":""}{finished?`${p.handCount} cards left`:!p.active?"Sitting out":p.locked?"✓ Locked in":"Choosing…"}</small></div><b className="line-score">{p.tickets}</b></article>;})}
     </section>
     <details className="rink-log" open>
      <summary>From the rink <button className="icon-button" aria-label="Refresh race" onClick={e=>{e.preventDefault();void load();}}><RefreshCw size={14}/></button></summary>
      <ol>{[...game.log].reverse().slice(0,40).map(l=><li key={l.id} className={l.kind}><span>R{l.round}</span><p>{l.text}</p></li>)}</ol>
     </details>
     <details className="responses-panel">
      <summary><Shield size={15}/> Auto-responses</summary>
      <form onSubmit={e=>{e.preventDefault();void command({action:"policy",policy});}}><p>Used when a Dead Zone, bash or pile-up happens while you’re away.</p>
       <label>Dead Zone<select value={policy.dead} onChange={e=>setPolicy({...policy,dead:e.target.value as Policy["dead"]})}><option value="pay">Pay when I can</option><option value="skip">Take the skip</option></select></label>
       <label>Karma Bash<select value={policy.karma} onChange={e=>setPolicy({...policy,karma:e.target.value as Policy["karma"]})}><option value="use">Use on first bash</option><option value="hold">Hold for later</option></select></label>
       <label>Daddy Take the Wheel<select value={policy.daddy} onChange={e=>setPolicy({...policy,daddy:e.target.value as Policy["daddy"]})}><option value="intercept">Avoid first pile-up</option><option value="escape">Escape at Readiness</option><option value="hold">Hold for later</option></select></label>
       <label>Bash cards<select value={policy.bash} onChange={e=>setPolicy({...policy,bash:e.target.value as Policy["bash"]})}><option value="strongest">Use strongest available</option><option value="double">Use Double Bash only</option><option value="triple">Use Super Bash only</option><option value="hold">Hold for later</option></select></label>
       <button className="button small navy" disabled={busy||humanLocked||finished}>Save responses <Check size={15}/></button>{humanLocked&&<small>A driver has locked in. Save before the first pick next round.</small>}
      </form>
     </details>
    </aside>
   </main>
   {rules&&<Rules onClose={()=>setRules(false)}/>}
  </>;
 }

 return <><header className="site-header race-header"><Brand/><nav><Link href="/profile" className="text-button">My driver</Link><Link href="/" className="text-button"><ArrowLeft size={16}/> Your races</Link><button className="text-button" onClick={()=>setRules(true)}><Info size={17}/> Rules</button></nav></header><main className="race-page page-width">{error&&<p className="alert" role="alert">{error} <button onClick={()=>void load()}>Refresh</button></p>}{!room?<div className="loading-page"><Car/><h2>Finding your rink…</h2>{error&&<Link href="/">Back to your races</Link>}</div>:room.status==="closed"?<div className="empty-state"><Flag size={38}/><h1>The host closed this room.</h1><p>There’s always another lap.</p><Link className="button red" href="/">Back to your races</Link></div>:<>
 <div className="race-title-row"><div><span className="eyebrow"><span className="lock-dot"/> PRIVATE ROOM · {room.pace==="quick"?"QUICK RACE":"FRIENDS RACE"}</span><h1>{MAPS[room.map].name}</h1></div><div className="race-title-actions">{room.status==="lobby"&&<button className="button small navy" onClick={invite}>{copied?<Check size={17}/>:<Copy size={17}/>} {copied?"Invitation copied":"Copy invitation"}</button>}</div></div>
 {room.status==="lobby"?<div className="lobby-layout"><section className="lobby-main"><div className={`lobby-rink ${room.map}`}><span className="eyebrow light">THE GATE IS OPEN</span><h2>Who’s riding with us?</h2><div className="lobby-cars">{room.seats.map((p,i)=><div key={p.id}><Car color={p.color}/><span>{p.name}</span><small>{p.bot?"BOT":i===0?"HOST":"DRIVER"}</small></div>)}</div><span className="lobby-checks"/></div><div className="lobby-seats">{room.seats.map((p,i)=><div className="lobby-seat" key={p.id}><span className="seat-number" style={{background:p.color}}>{i+1}</span><span><strong>{p.name}{p.id===user.id?" (you)":""}</strong><small>{p.bot?"House guest · bot":p.id===room.hostId?"Your host":"Invited driver"}</small></span><span className={`ready-state ${p.ready?"yes":""}`}>{p.ready?<Check size={15}/>:<Clock3 size={15}/>} {p.ready?"Ready":"Getting settled"}</span>{host&&p.id!==user.id&&<button className="icon-button" disabled={busy} onClick={()=>void command({action:"remove",playerId:p.id})} aria-label={`Remove ${p.name}`}><X size={17}/></button>}</div>)}{room.seats.length<6&&host&&<button className="add-bot" disabled={busy} onClick={()=>void command({action:"bot"})}><Plus size={18}/> Add a bot driver <span>Practice while friends arrive</span></button>}</div></section><aside className="lobby-side"><span className="eyebrow">YOUR PRIVATE INVITATION</span><h3>Save them a seat.</h3><p>Send the invitation link, or share this room code.</p><div className="room-code">{room.code.match(/.{1,4}/g)?.join(" ")}</div><button className="button outline full" onClick={invite}>{copied?<Check size={17}/>:<Copy size={17}/>} {copied?"Copied!":"Copy invitation link"}</button><div className="lobby-details"><p><Users size={18}/><span><strong>{room.seats.length} of 6 seats filled</strong>At least 2 drivers, including bots</span></p><p><Clock3 size={18}/><span><strong>{room.pace==="quick"?"60 seconds per pick":"24 hours per pick"}</strong>{room.pace==="quick"?"6 starting Speed Cards":"6 starting cards"}</span></p><p><Shield size={18}/><span><strong>Cards stay secret</strong>Everyone reveals together</span></p></div>{host?<button className="button red full" disabled={busy||room.seats.length<2||!ready} onClick={()=>void command({action:"start"})}>{busy?"One moment…":"Start the race"}<Flag size={18}/></button>:<button className="button red full" disabled={busy} onClick={()=>void command({action:"ready",ready:!room.seats.find(p=>p.id===user.id)!.ready})}>{room.seats.find(p=>p.id===user.id)?.ready?"I’m not ready yet":"Ready to ride"}<Check size={18}/></button>}<p className="fine-print">{!ready?"The race starts when every driver is ready.":room.seats.length<2?"Invite a friend or add a bot to start.":host?"Starting locks the guest list for this race.":"You’re ready. The host will start the race."}</p>{host&&<button className="quiet-danger" onClick={()=>{if(confirm("Close this waiting room for everyone?"))void command({action:"close"});}}>Close this room</button>}</aside></div>:null}</>}
 </main><footer className="race-footer page-width"><Link href="/">← Your races</Link><span>Private playtest · Rules {game?.rules||"3.4"}</span></footer>{rules&&<Rules onClose={()=>setRules(false)}/>}</>;
}
