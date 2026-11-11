"use client";
// The 2-minute tutorial: a scripted three-round race that plays itself on the
// real rink, with speech bubbles explaining every action as it happens.
import {useCallback,useEffect,useRef,useState} from "react";
import Link from "next/link";
import {ArrowRight,Pause,Play,RotateCcw,SkipForward,Ticket,X} from "lucide-react";
import {Brand,Car} from "./brand";
import {Board} from "./board";
import {ReplayScene} from "./replay-scene";
import {GuestEntry} from "./guest-entry";
import {CardPeek,type PeekCard} from "./card-peek";
import {EventArt,SpeedDial} from "./card-art";
import {useRoundReplay,type Beat} from "./use-round-replay";
import {makeGame,publicGame,type Game,type ReplayEvent,type Visual,type PublicGame} from "@/lib/game/engine";
import {CONDITIONS,EVENTS,type Condition,type EventId} from "@/lib/game/catalog";
import {floorPoint,slotPoint,rustySlot,type Pt} from "@/lib/game/rink";

const ME="tutor-you",BIS="tutor-biscuit",TAF="tutor-taffy",LEN=16;
type Anchor=string|"center"|"dock"|{section:number};
type Bubble={text:string;anchor:Anchor;title?:string};
type Pose3={pos:number;lap:number;lane?:"main"|"mini"};
type RoundState={players:Record<string,Pose3&{tickets:number;hand:number[];held?:EventId[]}>;rusty:number;condition:Condition;milestone:number;reveal:{id:string;primary:number;extra?:number;boost?:EventId}[]};

// ---------- the scripted race ----------
const p=(pos:number,lap=1):{pos:number;lap:number;lane:"main"} =>({pos,lap,lane:"main"});
const path=(...xs:number[])=>xs.map(x=>p(x));
const rp=(...xs:number[])=>xs.map(x=>({pos:x,lap:0,lane:"main" as const}));
// Your hand follows the real draw rule: everyone except Flag 1 draws one Speed Card after a round.
const START:RoundState={players:{[ME]:{...p(1),tickets:3,hand:[5,3,1,2,7,9]},[BIS]:{...p(6),tickets:3,hand:[]},[TAF]:{...p(9),tickets:3,hand:[]}},rusty:15,condition:"lights",milestone:1,reveal:[]};
const ROUNDS:{events:ReplayEvent[];after:RoundState}[]=[
  {events:[
    {type:"reveal",actor:ME,value:5},{type:"reveal",actor:BIS,value:3},{type:"reveal",actor:TAF,value:1},
    {type:"travel",actor:ME,path:path(1,2,3,4,5,6)},
    {type:"bash",actor:ME,victim:BIS,pos:6,lane:"main",by:ME},
    {type:"roll",purpose:"knockback",rolls:[{actor:BIS,value:2}]},
    {type:"pay",from:BIS,to:ME,paid:1,bank:0,totals:{[BIS]:2,[ME]:4}},
    {type:"travel",actor:BIS,path:path(6,5,4)},
    {type:"travel",actor:BIS,path:path(4,5,6,7)},
    {type:"travel",actor:TAF,path:path(9,10)},
    {type:"roll",purpose:"rusty",rolls:[{actor:"rusty",value:3}]},
    {type:"travel",actor:"rusty",path:rp(15,14,13,12)},
  ],after:{players:{[ME]:{...p(6),tickets:4,hand:[3,1,2,7,9]},[BIS]:{...p(7),tickets:2,hand:[]},[TAF]:{...p(10),tickets:3,hand:[]}},rusty:12,condition:"lights",milestone:1,reveal:[{id:ME,primary:5},{id:BIS,primary:3},{id:TAF,primary:1}]}},
  {events:[
    {type:"reveal",actor:ME,value:3},{type:"reveal",actor:TAF,value:3},{type:"reveal",actor:BIS,value:1},
    {type:"roll",purpose:"tie",rolls:[{actor:ME,value:5},{actor:TAF,value:2}],card:3},
    {type:"doubles",actors:[ME,TAF],value:3},
    {type:"travel",actor:ME,path:path(6,7,8,9)},
    {type:"travel",actor:TAF,path:path(10,11,12,13)},
    {type:"hazard",actor:TAF,kind:"tilt",pos:13,lane:"main",roll:1,result:"back"},
    {type:"roll",purpose:"tilt",rolls:[{actor:TAF,value:1}]},
    {type:"travel",actor:TAF,path:path(13,12,11,10)},
    {type:"travel",actor:BIS,path:path(7,8)},
    {type:"hazard",actor:BIS,kind:"dead",pos:8,lane:"main",result:"paid"},
    {type:"tickets",actor:BIS,delta:-1,reason:"dead",total:1},
    {type:"roll",purpose:"rusty",rolls:[{actor:"rusty",value:2}]},
    {type:"travel",actor:"rusty",path:rp(12,11,10)},
    {type:"bash",actor:null,victim:TAF,pos:10,lane:"main",by:null},
    {type:"roll",purpose:"knockback",rolls:[{actor:TAF,value:3}]},
    {type:"pay",from:TAF,to:null,paid:1,bank:0,totals:{[TAF]:2}},
    {type:"travel",actor:TAF,path:path(10,9,8,7)},
    {type:"card",actor:ME,kind:"M05"},
    {type:"card",actor:TAF,kind:"M13"},
    {type:"tickets",actor:TAF,delta:1,reason:"card",total:3},
  ],after:{players:{[ME]:{...p(9),tickets:4,hand:[1,2,7,9],held:["M05"]},[BIS]:{...p(8),tickets:1,hand:[]},[TAF]:{...p(7),tickets:3,hand:[]}},rusty:10,condition:"lights",milestone:1,reveal:[{id:ME,primary:3},{id:TAF,primary:3},{id:BIS,primary:1}]}},
  {events:[
    {type:"reveal",actor:BIS,value:9},{type:"reveal",actor:TAF,value:2},{type:"reveal",actor:ME,value:1,extra:2,boost:"M05"},
    {type:"travel",actor:BIS,path:[...path(8,9,10,11,12,13,14,15,16),p(1,2)]},
    {type:"travel",actor:TAF,path:path(7,8,9)},
    {type:"bash",actor:TAF,victim:ME,pos:9,lane:"main",by:TAF},
    {type:"roll",purpose:"knockback",rolls:[{actor:ME,value:2}]},
    {type:"pay",from:ME,to:TAF,paid:1,bank:0,totals:{[ME]:3,[TAF]:4}},
    {type:"travel",actor:ME,path:path(9,8,7)},
    {type:"travel",actor:ME,path:path(7,8,9,10)},
    {type:"bash",actor:ME,victim:"rusty",pos:10,lane:"main",by:ME},
    {type:"tickets",actor:ME,delta:2,reason:"bounty",total:5},
    {type:"travel",actor:"rusty",path:rp(10,11,12,13,14,15,16,1,2)},
    {type:"roll",purpose:"rusty",rolls:[{actor:"rusty",value:3}]},
    {type:"travel",actor:"rusty",path:rp(2,1,16,15)},
    {type:"lap",actor:BIS,delta:1,total:2},
    {type:"condition",condition:"rampage"},
  ],after:{players:{[ME]:{...p(10),tickets:5,hand:[7,9,6]},[BIS]:{...p(1,2),tickets:2,hand:[]},[TAF]:{...p(9),tickets:4,hand:[]}},rusty:15,condition:"rampage",milestone:2,reveal:[{id:BIS,primary:9},{id:TAF,primary:2},{id:ME,primary:1,extra:2,boost:"M05"}]}},
];

// What the announcer-in-a-bubble says during each round, keyed by event index.
// Every bubble names the driver it's about, so "you" always means you.
const NARRATION:Record<number,Record<number,Bubble>>={
  0:{
    0:{anchor:"center",title:"Reveal!",text:"Everyone’s cards flip at the same time. The highest card takes Flag 1 and moves first. The F1, F2, F3 tags on the cards show the order."},
    3:{anchor:ME,text:"You played 5, so you move 5 sections…"},
    4:{anchor:BIS,title:"BASH!",text:"…and land right on Biscuit’s section. That’s a bash!"},
    5:{anchor:"dock",title:"Knockback roll",text:"A bashed driver rolls the die to see how far they get knocked back. Biscuit rolled a 2."},
    6:{anchor:ME,title:"Ticket swap",text:"Every bash is a ticket swap: Biscuit hands you one of their tickets. Watch the lineup: you go up to 4, Biscuit drops to 2."},
    7:{anchor:BIS,text:"Biscuit gets knocked back 2 sections…"},
    8:{anchor:BIS,text:"…and then still drives their own card: 3 sections."},
    9:{anchor:TAF,text:"Taffy only had a 1, so Taffy is Flag 3 and goes last."},
    10:{anchor:"rusty",title:"Rusty’s roll",text:"After every driver has moved, Rusty rolls the die and drives backwards that many sections."},
    11:{anchor:"rusty",text:"Rusty rolled a 3. He missed everyone… this time."},
  },
  1:{
    2:{anchor:"center",title:"Tied cards",text:"You and Taffy both flipped a 3. A tie is settled with the die: the higher roll gets the earlier flag."},
    3:{anchor:"dock",title:"Your roll!",text:"Click your die to roll it (or press Next). In a real race, your die rolls itself if you wait too long."},
    4:{anchor:"center",title:"DOUBLES!",text:"You rolled 5 and Taffy rolled 2, so you’re Flag 1 again. Matching cards are also Doubles: both of you win a Midway card after the moves."},
    6:{anchor:TAF,text:"Taffy drives 3 and lands on the Tilt-A-Whirl…"},
    7:{anchor:TAF,title:"Tilt-A-Whirl",text:"Taffy rolls the die: 1–2 spins back 3, 3–4 stays put, 5–6 flings forward 3."},
    9:{anchor:TAF,text:"Taffy rolled a 1, so Taffy spins back 3 sections."},
    10:{anchor:BIS,text:"Biscuit’s 1 lands on a Dead Zone…"},
    11:{anchor:BIS,title:"Dead Zone",text:"The power’s out! Biscuit pays 1 ticket to keep rolling (down to 1). A driver with no ticket to spare sits out the next round instead."},
    14:{anchor:"rusty",text:"Rusty rolls a 2 and reverses… straight into Taffy!"},
    15:{anchor:TAF,title:"CRUNCH!",text:"Rusty bashes Taffy. Taffy rolls for knockback: a 3."},
    17:{anchor:TAF,text:"Rusty also takes one of Taffy’s tickets. Rusty never gives them back."},
    19:{anchor:"dock",title:"Midway card",text:"Your Doubles prize: Distracted Carnie, a BOOST. It waits on your mat until you play it with a Speed Card. Tap any Midway card on the rink to read it."},
    20:{anchor:TAF,text:"Taffy drew an INSTANT card. Instants happen right away: Taffy gets a free ticket!"},
  },
  2:{
    2:{anchor:"center",text:"Biscuit flipped a 9, so Biscuit is Flag 1 and goes first. Your boosted 1 is Flag 3: flags follow the printed card, not the boost."},
    3:{anchor:BIS,title:"New lap!",text:"Biscuit crosses the checkered Start Line and starts a new lap."},
    5:{anchor:ME,title:"BASH!",text:"Taffy lands on you!"},
    6:{anchor:"dock",title:"Your knockback roll",text:"You were bashed, so you roll for knockback. Click your die (or press Next)."},
    7:{anchor:ME,text:"You rolled a 2, and you hand Taffy one of your tickets."},
    9:{anchor:ME,text:"Now your boosted move: 1 + 2 = 3 sections… onto Rusty!"},
    11:{anchor:ME,title:"Rusty bounty",text:"Bashing Rusty pays you 2 tickets from the bank…"},
    12:{anchor:"rusty",text:"…and the hit sends Rusty careening half a lap across the rink."},
    15:{anchor:BIS,text:"Every completed lap pays a ticket at the end of the round. Biscuit gets one."},
    16:{anchor:"center",title:"New Rink Condition",text:"The first driver onto a new lap flips the Rink Sign. Rusty’s Rampage: Rusty moves twice every round until the next flip!"},
  },
};

type Step={say:Bubble;chosen?:number[];boost?:boolean}|{round:number};
const SCRIPT:Step[]=[
  {say:{anchor:ME,title:"Welcome to the fair!",text:"Let’s watch a quick 3-round race. You’re Rookie, Driver 1: the car with the gold ring. Biscuit is Driver 2 and Taffy is Driver 3. Driver numbers are handed out when a race starts and never change, so watch the badges, the lineup and the announcer."}},
  {say:{anchor:"center",text:"The rink has 16 numbered sections. Your Speed Card is how many sections you move. The route there? Pure bumper-car chaos."}},
  {say:{anchor:{section:3},title:"Hazards",text:"Grease slides you 2 more, the Tilt-A-Whirl spins you with a die roll and a Dead Zone costs a ticket or a turn."}},
  {say:{anchor:"center",title:"Dice",text:"Every die roll shows on the rink, like a real board game. When it’s your roll, you click your die."}},
  {say:{anchor:"rusty",title:"Meet Rusty",text:"Rusty is the runaway house car. He drives backwards every round, bashes anyone he lands on and takes one of their tickets."}},
  {say:{anchor:"dock",title:"Your hand",text:"Every round, each driver secretly picks one Speed Card from their hand."}},
  {say:{anchor:"dock",text:"You pick 5 and lock in. Nobody sees it until every driver has locked in."},chosen:[5]},
  {round:0},
  {say:{anchor:"dock",title:"Draw back up",text:"Round over! Everyone except Flag 1 draws one Speed Card. You had Flag 1, so you skip the draw: that’s the price of moving first. Round 2: you pick 3."},chosen:[3]},
  {round:1},
  {say:{anchor:"dock",title:"Using a boost",text:"Round 3: you play your 1 with Distracted Carnie, which adds your lowest other card (the 2) to the move."},chosen:[1,2],boost:true},
  {round:2},
  {say:{anchor:"center",title:"That’s the race!",text:"Rounds keep going until a driver runs out of Speed Cards. Most tickets wins the Blue Ribbon, and you’re leading with 5!"}},
];

const seeded=(seed:number)=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
function buildGame(state:RoundState,round:number,replay?:{events:ReplayEvent[];initial:Visual;sequence:number}):Game{
  const g=makeGame([{id:ME,name:"Rookie",bot:false},{id:BIS,name:"Biscuit",bot:true},{id:TAF,name:"Taffy",bot:true}],"day","relaxed",seeded(7),0,{trackLength:LEN});
  g.round=round+1;g.phase="pick";g.condition=state.condition;g.milestone=state.milestone;g.highLap=state.milestone;g.rusty=state.rusty;g.direction=1;g.log=[];g.lastReveal=state.reveal;g.deadline=Date.now()+86400000;
  for(const pl of g.players){const s=state.players[pl.id];pl.pos=s.pos;pl.lap=s.lap;pl.lane=s.lane||"main";pl.tickets=s.tickets;pl.skip=false;pl.stalled=false;pl.compelled=false;
    pl.hand=(s.hand.length?s.hand:[4,4,4,4,4,4]).map((v,i)=>({id:`${pl.id}-${round}-${i}`,value:v}));pl.held=(s.held||[]).map((kind,i)=>({id:`${pl.id}-m${i}`,kind,available:0}));}
  g.replay=replay?{round,sequence:replay.sequence,initial:replay.initial,events:replay.events}:undefined;
  return g;
}
const visualOf=(s:RoundState):Visual=>({players:Object.fromEntries(Object.entries(s.players).map(([id,v])=>[id,{pos:v.pos,lap:v.lap,lane:v.lane||"main"}])),rusty:s.rusty,direction:1,condition:s.condition,milestone:s.milestone,tickets:Object.fromEntries(Object.entries(s.players).map(([id,v])=>[id,v.tickets]))});
const AUTO_KEY="bcb.tutorial-auto";

export function Tutorial({signedIn}:{signedIn:boolean}){
  const [game,setGame]=useState<PublicGame>(()=>publicGame(buildGame(START,0),ME));
  const [bubble,setBubble]=useState<Bubble|null>(null),[chosen,setChosen]=useState<number[]>([]),[boost,setBoost]=useState(false),[auto,setAuto]=useState(false),[done,setDone]=useState(false),[runId,setRunId]=useState(0);
  const roundRef=useRef(-1),autoRef=useRef(false),advance=useRef<(()=>void)|null>(null),roundDone=useRef<(()=>void)|null>(null),alive=useRef(0);
  autoRef.current=auto;
  const [mounted,setMounted]=useState(false);
  useEffect(()=>{setMounted(true);try{setAuto(localStorage.getItem(AUTO_KEY)==="1");}catch{}},[]);
  const toggleAuto=()=>setAuto(a=>{try{localStorage.setItem(AUTO_KEY,a?"0":"1");}catch{}return !a;});

  // Each bubble waits for Next (button, Enter, Space or →). With Auto-play on it also
  // moves on by itself after a generous reading time.
  const hold=useCallback((text:string)=>new Promise<void>(resolve=>{
    let left=Math.min(14000,Math.max(4500,text.length*80));const mine=alive.current;
    const finish=()=>{clearInterval(t);if(advance.current===finish)advance.current=null;resolve();};
    const t=setInterval(()=>{if(alive.current!==mine){finish();return;}if(autoRef.current)left-=100;if(left<=0)finish();},100);
    advance.current=finish;
  }),[]);
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{if((e.key==="Enter"||e.key===" "||e.key==="ArrowRight")&&(rollRef.current||advance.current)&&!(e.target instanceof HTMLElement&&e.target.closest("input,textarea,select,a,button,[role=dialog]"))){e.preventDefault();if(rollRef.current)rollRef.current();else advance.current?.();}};
    window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);
  },[]);

  const onBeat=useCallback((beat:Beat)=>{
    if(beat.type==="end"){roundDone.current?.();roundDone.current=null;return;}
    if(beat.type!=="event")return;
    const line=NARRATION[roundRef.current]?.[beat.index];if(!line)return;
    setBubble(line);
    // On your own roll, clicking the die is the "Next": the bubble just explains it.
    if(beat.event.type==="roll"&&beat.event.rolls.some(r=>r.actor===ME))return;
    return hold(line.text);
  },[hold]);
  const theater=useRoundReplay(game,ME,{onBeat,noCutoff:true,rollWait:()=>autoRef.current?5000:30*60*1000});
  const rollPending=!!(theater.dice?.mine&&theater.dice.phase==="waiting");
  const rollRef=useRef<(()=>void)|null>(null);rollRef.current=rollPending?theater.roll:null;
  const next=()=>{if(rollRef.current)rollRef.current();else advance.current?.();};
  const [cardView,setCardView]=useState<PeekCard|null>(null);
  const openCard=(c:PeekCard)=>{setCardView(c);theater.hold(true);};
  const closeCard=()=>{setCardView(null);theater.hold(false);};

  useEffect(()=>{
    const mine=++alive.current;let state=START;
    roundRef.current=-1;setDone(false);setChosen([]);setBoost(false);setBubble(null);setGame(publicGame(buildGame(START,0),ME));
    (async()=>{
      await new Promise(r=>setTimeout(r,600));
      for(const step of SCRIPT){
        if(alive.current!==mine)return;
        if("say" in step){setChosen(step.chosen||[]);setBoost(!!step.boost);setBubble(step.say);await hold(step.say.text);continue;}
        const r=ROUNDS[step.round];roundRef.current=step.round;setBubble(null);
        const finished=new Promise<void>(res=>{roundDone.current=res;});
        setGame(publicGame(buildGame(r.after,step.round+1,{events:r.events,initial:visualOf(state),sequence:runId*10+step.round+1}),ME));
        await finished;state=r.after;setChosen([]);setBoost(false);
      }
      if(alive.current===mine){setBubble(null);setDone(true);}
    })();
    return ()=>{alive.current++;advance.current?.();};
  },[runId]); // eslint-disable-line react-hooks/exhaustive-deps

  const restart=()=>{theater.skip();roundDone.current?.();setRunId(n=>n+1);};
  const me=game.players.find(x=>x.id===ME)!;
  const hand=(game.me?.hand||[]).map(c=>c.value),held=game.me?.held||[];
  const anchorAt=(a:Anchor):Pt|null=>{
    if(a==="center"||a==="dock")return null;
    if(typeof a==="object")return floorPoint(a.section,0.75,LEN);
    const v=theater.visual;
    if(a==="rusty")return theater.motion.rusty??rustySlot(v?.rusty??game.rusty,LEN);
    const pl=game.players.find(x=>x.id===a);if(!pl)return null;
    const m=theater.motion[a];if(m)return m;
    const pose=v?.players[a]??pl;return slotPoint(pl.seat,pose.pos,pose.lane,LEN);
  };
  const at=bubble?anchorAt(bubble.anchor):null;
  const below=at?at.y<230:false;
  const bubbleStyle=at?{left:`${Math.min(82,Math.max(18,at.x/10))}%`,top:`${(at.y+(below?24:-62))/7.3}%`}:undefined;

  return <>
    <header className="site-header race-header compact"><Brand/><div className="race-heading"><span className="eyebrow light">2-MINUTE TUTORIAL</span><strong>How a round works</strong></div>
      <nav className="tutorial-controls">
        {!done&&<button className="text-button" onClick={toggleAuto} aria-pressed={auto} title={auto?"Tips move on by themselves. Click to wait for Next instead.":"Each tip waits for Next. Click to let tips move on by themselves."}>{auto?<Pause size={16}/>:<Play size={16}/>}<span>{auto?"Auto-play on":"Auto-play"}</span></button>}
        {!done&&<button className="text-button" onClick={next}><SkipForward size={16}/><span>{rollPending?"Roll":"Next"}</span></button>}
        <button className="text-button" onClick={restart}><RotateCcw size={16}/><span>Restart</span></button>
        <Link href="/" className="text-button" aria-label="Exit tutorial"><X size={16}/><span>Exit</span></Link>
      </nav></header>
    {!mounted?<main className="arena tutorial"><p className="loading-page">Rolling out the rink…</p></main>:<main className="arena tutorial">
      <section className="arena-stage">
        <div className={`stage-frame ${theater.active?"playing":""}`}>
          <Board game={game} userId={ME} visual={theater.visual} motion={theater.motion} fx={theater.fx} shake={theater.shake} spotlight={theater.spotlight} hot={null} round={theater.active?theater.round:undefined}/>
          <ReplayScene show={theater} game={game} hideCaption={!!bubble&&(bubble.anchor==="center"||bubble.anchor==="dock")} onRoll={theater.roll} onPeek={openCard}/>
          <div className="stage-chips"><span className="stage-chip condition" title={CONDITIONS[theater.visual?.condition||game.condition].text}><b>{CONDITIONS[theater.visual?.condition||game.condition].name}</b><i>{CONDITIONS[theater.visual?.condition||game.condition].text}</i></span></div>
          {bubble&&<div key={bubble.text} className={`tutor-bubble ${at?(below?"below":"above"):bubble.anchor==="dock"?"dock":"center"}`} style={bubbleStyle} role="status" aria-live="polite">
            {bubble.title&&<strong>{bubble.title}</strong>}<p>{bubble.text}</p>
            <button className={auto?"":"waiting"} onClick={next} aria-label={rollPending?"Roll your die":"Next tip"}>{rollPending?"Roll":"Next"} <ArrowRight size={13}/></button>
          </div>}
          {cardView&&<CardPeek card={cardView} game={game} onClose={closeCard}/>}
          {done&&<div className="finish-card tutor-finish" role="status"><span className="eyebrow">YOU’VE GOT THE BASICS</span><h2>Ready to ride?</h2>
            {signedIn?<Link className="button red" href="/#play">Host or join a race <ArrowRight size={16}/></Link>:<GuestEntry next="/#play" label="Play as a guest"/>}
            <button className="text-button" onClick={restart}><RotateCcw size={15}/> Watch again</button></div>}
        </div>
      </section>
      <section className={`arena-dock ${bubble?.anchor==="dock"?"tutor-focus":""}`} aria-label="Your hand (tutorial)">
        <div className="dock-status"><span className="eyebrow">{theater.active?`ROUND ${theater.round} ON THE RINK`:"YOUR HAND"} · DRIVER 1</span><strong>{theater.active?"Watch the rink!":chosen.length?"Locked in.":"Pick your speed."}</strong><span className="ticket-chip"><Ticket size={16}/>{me.tickets}<small>tickets</small></span><p>Higher cards move first. Land on a rival to bash them.</p></div>
        <div className="dock-cards">
          <div className="speed-row">{hand.map((v,i)=><span key={i} className={`mini-speed ${chosen[0]===v?"chosen":""} ${chosen[1]===v?"extra":""}`} aria-label={`Speed ${v}`}><span className="corner">{v}</span><strong>{v}</strong><SpeedDial value={v}/></span>)}</div>
          <div className="midway-row">{held.map(c=><span key={c.id} className={`midway-chip ${EVENTS[c.kind].type.toLowerCase()} ${boost?"chosen":""}`}><EventArt kind={c.kind}/><span><b>{EVENTS[c.kind].name}</b><small>{boost?"Added to move":"Boost on your mat"}</small></span></span>)}{!held.length&&<p className="midway-empty">Match another driver’s card (Doubles) to win Midway cards.</p>}</div>
        </div>
        <div className="dock-action"><span className="button red lock-button" aria-disabled="true">{chosen.length?`Locked: ${chosen[0]}${chosen[1]?` + ${chosen[1]}`:""}`:"Pick a card"}</span><small className="lock-count">Tutorial: the cards play themselves</small></div>
      </section>
      <aside className="arena-rail">
        <section className="lineup" aria-label="The lineup"><h3>The lineup <span>tickets</span></h3>
          {game.players.map(pl=>({pl,t:theater.active&&theater.tickets?theater.tickets[pl.id]??pl.tickets:pl.tickets})).sort((a,b)=>b.t-a.t||a.pl.seat-b.pl.seat).map(({pl,t})=>{const flag=game.lastReveal.findIndex(r=>r.id===pl.id)+1;return <article key={pl.id} className={`line-row ${pl.id===ME?"is-you":""} ${theater.spotlight===pl.id?"moving":""}`}><span className="line-car"><Car color={pl.color} width="38" height="40"/><i style={{background:pl.color}}>{pl.seat+1}</i>{flag?<b className={`line-flag ${flag===1?"first":""}`} title={`Flag ${flag} last round`}>F{flag}</b>:null}</span><div><strong>{pl.name}{pl.id===ME?" (you)":""}</strong><small><b className="driver-tag">Driver {pl.seat+1}</b> · Sec {pl.pos} · Lap {pl.lap}{flag===1?" · no draw":""}</small></div><b key={t} className={`line-score ${theater.active?"counting":""}`}>{t}</b></article>;})}
        </section>
        <section className="tutor-cheats"><h3>Cheat sheet</h3><ul>
          <li><b>Speed Card</b> = sections you move. Highest goes first.</li>
          <li><b>Driver 1–6</b>: your number for the whole race, on your car’s badge.</li>
          <li><b>Flags</b>: highest card is Flag 1 and moves first, but skips the draw.</li>
          <li><b>Bash</b> = land on a rival: they hand you a ticket and roll the die for knockback.</li>
          <li><b>Dice</b>: every roll shows on the rink. Click to roll your own.</li>
          <li><b>Rusty</b> drives backwards and takes a ticket from anyone he hits. Bash him for 2.</li>
          <li><b>Doubles</b> = matching cards: win Midway cards.</li>
          <li><b>Laps</b> pay a ticket. Most tickets wins.</li>
        </ul></section>
      </aside>
    </main>}
  </>;
}
