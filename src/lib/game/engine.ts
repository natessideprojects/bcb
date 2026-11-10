import {GO_BEAT,eventDuration} from "./presentation";
import {CONDITIONS,DEFAULT_POLICY,EVENTS,MAPS,PAINTS,type Condition,type EventId,type MapId,type Policy} from "./catalog";

export type Speed={id:string;value:number};
export type Midway={id:string;kind:EventId;available:number};
export type Pick={primary:string;extra?:string;boost?:string};
export type Pose={pos:number;lap:number;lane:"main"|"mini"};
export type Visual={players:Record<string,Pose>;rusty:number;direction:1|-1;condition:Condition;milestone:number};
export type ReplayEvent={type:"travel";actor:string;path:Pose[];teleport?:boolean}|{type:"bash";actor:string|null;victim:string;pos:number;lane:"main"|"mini"}|{type:"reveal";actor:string;value:number;extra?:number;boost?:EventId}|{type:"doubles";actors:string[];value:number}|{type:"card";actor:string;kind:EventId}|{type:"draw";actor:string;count:number;reason:string}|{type:"hazard";actor:string;kind:"grease"|"tilt"|"dead";pos:number;lane:"main"|"mini";roll?:number;result:"slide"|"forward"|"back"|"stay"|"paid"|"skip"}|{type:"lap";actor:string;delta:number}|{type:"tickets";actor:string;delta:number;reason:"bash"|"bounty"|"dead"|"card"|"prize"}|{type:"condition";condition:Condition}|{type:"stall";actor:string;pos:number;pileup:boolean};
export type RoundReplay={round:number;initial:Visual;events:ReplayEvent[]};
export function replayBudget(replay:RoundReplay|undefined){if(!replay)return 0;return Math.min(90000,GO_BEAT+5000+replay.events.reduce((ms,e)=>ms+eventDuration(e),0));}
export const trackSize=(g:{trackLength?:number})=>g.trackLength||28;
export const gameMap=(g:{trackLength?:number;map:MapId})=>trackSize(g)===16?(g.map==="day"?{...MAPS.day,grease:[3,11],tilt:[5,13],dead:[8,16]}:{...MAPS.night,grease:[4,12],tilt:[7,15],dead:[1,9]}):trackSize(g)===18?(g.map==="day"?{...MAPS.day,grease:[3,12],tilt:[6,15],dead:[9,18]}:{...MAPS.night,grease:[4,13],tilt:[7,16],dead:[1,10]}):MAPS[g.map];
const pose=(p:Pose):Pose=>({pos:p.pos,lap:p.lap,lane:p.lane});
const visual=(g:Game):Visual=>({players:Object.fromEntries(g.players.map(p=>[p.id,pose(p)])),rusty:g.rusty,direction:g.direction,condition:g.condition,milestone:g.milestone});
export type Player={id:string;name:string;seat:number;color:string;bot:boolean;pos:number;lap:number;lane:"main"|"mini";tickets:number;hand:Speed[];held:Midway[];skip:boolean;stalled:boolean;shrink:number;compelled:boolean;active:boolean;policy:Policy;misses:number;stats?:{bashes:number;doubles:number;laps:number}};
export type Log={id:number;round:number;text:string;kind:"move"|"bash"|"event"|"round"|"condition"};
export type Game={rules:"3.3"|"3.4";trackLength?:16|18|28;replay?:RoundReplay;phase:"pick"|"finished";map:MapId;pace:"relaxed"|"quick";direction:1|-1;firstSeat:number;nextFirstSeat:number|null;round:number;limit:number;players:Player[];rusty:number;condition:Condition;conditionDeck:Condition[];conditionDiscard:Condition[];milestone:number;highLap:number;speedDeck:Speed[];speedDiscard:Speed[];eventDeck:Midway[];eventDiscard:Midway[];picks:Record<string,Pick>;flags:string[];log:Log[];logSeq:number;deadline:number;final:boolean;lastReveal:{id:string;primary:number;extra?:number;boost?:EventId}[];winners:string[]};
export type Rng=()=>number;
type Chain={owner:string|null;hit:Set<string>;hazards:Set<string>;defenses:Set<string>;grow:Set<string>;steps:number};
export class GameError extends Error {}
const wrap=(n:number,length=28)=>((n-1)%length+length)%length+1;
export const position=(p:{lap:number;pos:number},direction:1|-1=1,length=28)=>p.lap*(length+1)+(p.pos===0?0:direction===1?p.pos:length+1-p.pos);

// All randomness is injected by the server (crypto.randomInt). Seeded sources
// are used only in tests. No future dice or deck seed is sent to a client.
class Referee {
  constructor(public g:Game,public random:Rng){}
  get size(){return trackSize(this.g);}
  wrap(n:number){return wrap(n,this.size);}
  emit(event:ReplayEvent){if(this.g.replay?.round===this.g.round)this.g.replay.events.push(event);}
  movement(actor:string,from:Pose,to:Pose,teleport=false){if(this.g.replay?.round!==this.g.round)return;const last=this.g.replay.events.at(-1);if(!teleport&&last?.type==="travel"&&last.actor===actor&&!last.teleport)last.path.push(to);else this.emit({type:"travel",actor,path:[from,to],...(teleport?{teleport:true}:{})});}
  stat(p:Player,key:"bashes"|"doubles"|"laps",amount=1){p.stats??={bashes:0,doubles:0,laps:0};p.stats[key]+=amount;}

  die(){return 1+Math.min(5,Math.floor(this.random()*6));}
  shuffle<T>(a:T[]){for(let i=a.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  note(text:string,kind:Log["kind"]="event"){this.g.log.push({id:++this.g.logSeq,round:this.g.round,text,kind});this.g.log=this.g.log.slice(-300);}
  player(id:string){const p=this.g.players.find(p=>p.id===id);if(!p)throw new GameError("Driver not found.");return p;}
  seatOrder(){return [...this.g.players].sort((a,b)=>(a.seat-this.g.firstSeat+this.g.players.length)%this.g.players.length-(b.seat-this.g.firstSeat+this.g.players.length)%this.g.players.length);}
  ordered(){return this.seatOrder().sort((a,b)=>{const ai=this.g.flags.indexOf(a.id),bi=this.g.flags.indexOf(b.id);return (ai<0?100:ai)-(bi<0?100:bi);});}
  drawSpeed(p:Player,count=1){for(let i=0;i<count;i++){if(!this.g.speedDeck.length)this.g.speedDeck=this.shuffle(this.g.speedDiscard.splice(0));const c=this.g.speedDeck.shift();if(c)p.hand.push(c);}}
  drawEvent(){if(!this.g.eventDeck.length)this.g.eventDeck=this.shuffle(this.g.eventDiscard.splice(0));return this.g.eventDeck.shift();}
  usable(p:Player,kind:EventId){return p.held.find(c=>c.kind===kind&&c.available<=this.g.round);}
  use(p:Player,kind:EventId){const i=p.held.findIndex(c=>c.kind===kind&&c.available<=this.g.round);if(i<0)return false;const [c]=p.held.splice(i,1);this.g.eventDiscard.push(c);this.emit({type:"card",actor:p.id,kind});this.note(`${p.name} uses ${EVENTS[kind].name}.`);return true;}
  chain(owner:string|null,action:(c:Chain)=>void){const c:Chain={owner,hit:new Set(),hazards:new Set(),defenses:new Set(),grow:new Set(),steps:0};action(c);for(const p of this.seatOrder()){if(c.grow.has(p.id)&&p.lane==="mini"){const prior=pose(p);p.lane="main";p.shrink=0;this.movement(p.id,prior,pose(p),true);if(p.pos&&this.occupied(p,p.pos))this.safe(p,p.pos,-this.g.direction,false);this.note(`${p.name} grows back to full size.`);}}}
  occupied(p:Player,n:number){return n!==0&&(n===this.g.rusty||this.g.players.some(o=>o.id!==p.id&&o.lane===p.lane&&o.pos===n));}
  safe(p:Player,n:number,direction:number,before=true){let at=before?this.wrap(n-direction):n;for(let i=0;i<this.size+1;i++){if(!this.occupied(p,at)){const beforePose=pose(p);p.pos=at;this.movement(p.id,beforePose,pose(p),true);return;}at=this.wrap(at-direction);}throw new GameError("No safe space available.");}
  markGrow(p:Player,c:Chain){if(p.lane==="mini")c.grow.add(p.id);}
  step(p:Player,d:number,c:Chain){const beforePose=pose(p),old=p.pos,forward=d*this.g.direction>0;let crossing=0;if(old===0){p.pos=d>0?1:this.size;if(!forward)crossing=-1;}else{p.pos=this.wrap(old+d);if(old===this.size&&d>0)crossing=this.g.direction;if(old===1&&d<0)crossing=-this.g.direction;}p.lap+=crossing;this.delta[p.id]=(this.delta[p.id]||0)+crossing;this.g.highLap=Math.max(this.g.highLap,p.lap);if(p.lane==="mini"){p.shrink=Math.max(0,p.shrink+d*this.g.direction);if(p.shrink>=this.size)this.markGrow(p,c);}if(crossing>0)this.stat(p,"laps",crossing);this.movement(p.id,beforePose,pose(p));}
  directBashPossible(p:Player,distance:number){const d=this.g.direction;let at=p.pos;let usedDaddy=false;for(let i=0;i<distance;i++){at=at===0?(d>0?1:this.size):this.wrap(at+d);const stalled=this.g.players.some(o=>o.id!==p.id&&o.lane===p.lane&&o.pos===at&&o.stalled);if(stalled){if(usedDaddy||p.policy.daddy!=="intercept"||!this.usable(p,"M12"))return false;usedDaddy=true;}}return at===this.g.rusty||this.g.players.some(o=>o.id!==p.id&&o.lane===p.lane&&o.pos===at&&!o.stalled);}
  speed(p:Player,distance:number){if(p.compelled&&!this.directBashPossible(p,distance)){this.note(`${p.name} is watched by Sauron: no direct bash, so the card is spent without moving.`);return;}this.note(`${p.name} moves ${distance}.`,"move");this.chain(p.id,c=>this.travel(p,distance,"speed",c));}
  delta:Record<string,number>={};
  travel(p:Player,distance:number,source:"speed"|"forced"|"lead",c:Chain){
    if(++c.steps>256)throw new GameError("Movement chain exceeded its safety limit.");
    const direction=Math.sign(distance)*this.g.direction;let remaining=Math.abs(distance);if(!remaining)return;
    if(remaining>10000)throw new GameError("Invalid movement distance.");
    while(remaining>0){this.step(p,direction,c);remaining--;
      const block=this.g.players.some(o=>o.id!==p.id&&o.pos===p.pos&&o.lane===p.lane&&o.stalled);
      if(block&&(source!=="lead"||remaining===0)){
        if(!c.defenses.has(p.id)&&p.policy.daddy==="intercept"&&this.use(p,"M12")){c.defenses.add(p.id);if(!remaining)remaining=1;}
        else{p.stalled=true;this.emit({type:"stall",actor:p.id,pos:p.pos,pileup:true});this.note(`${p.name} joins a pile-up on ${p.pos}.`);return;}
      }
    }
    const end=p.pos,lane=p.lane;
    if(end===this.g.rusty){if(source==="speed"){p.tickets+=2;p.compelled=false;this.markGrow(p,c);let next=this.wrap(end+Math.floor(this.size/2)*this.g.direction);while(this.g.players.some(o=>o.pos===next))next=this.wrap(next+this.g.direction);this.emit({type:"bash",actor:p.id,victim:"rusty",pos:end,lane:p.lane});this.emit({type:"tickets",actor:p.id,delta:2,reason:"bounty"});this.stat(p,"bashes");this.movement("rusty",{pos:this.g.rusty,lap:0,lane:"main"},{pos:next,lap:0,lane:"main"},true);this.g.rusty=next;this.note(`${p.name} bashes Rusty for 2 tickets! Rusty jumps to ${next}.`,"bash");}else{this.safe(p,end,direction);this.note(`${p.name} stops safely before Rusty.`);return;}}
    else{
      const victims=this.g.players.filter(o=>o.id!==p.id&&o.pos===end&&o.lane===lane);
      if(victims.some(v=>v.stalled)){p.stalled=true;this.emit({type:"stall",actor:p.id,pos:end,pileup:true});this.note(`${p.name} joins a pile-up on ${end}.`);return;}
      const victim=victims[0];
      if(victim){if(c.hit.has(victim.id)){this.safe(p,end,direction);this.note(`${p.name} takes a safe space; that driver was already hit.`);return;}this.bash(victim,p,c);}
    }
    if(p.pos===end&&p.lane===lane)this.hazard(p,c);
  }
  bash(victim:Player,attacker:Player|null,c:Chain){
    if(c.hit.has(victim.id))return;c.hit.add(victim.id);this.emit({type:"bash",actor:attacker?.id||null,victim:victim.id,pos:victim.pos,lane:victim.lane});if(attacker)this.stat(attacker,"bashes");this.markGrow(victim,c);if(attacker)this.markGrow(attacker,c);
    const roll=this.die();let multiplier=1;
    if(attacker){attacker.compelled=false;const policy=attacker.policy.bash||"strongest";const choices:EventId[]=policy==="hold"?[]:policy==="double"?["M17"]:policy==="triple"?["M16"]:["M16","M17"];for(const kind of choices){if(this.use(attacker,kind)){multiplier=kind==="M16"?3:2;break;}}}
    let distance=roll*multiplier+(this.g.condition==="bumper"?2:0);
    if(c.owner){const gain=this.g.condition==="judging"?2:1;this.player(c.owner).tickets+=gain;this.emit({type:"tickets",actor:c.owner,delta:gain,reason:"bash"});}
    this.note(`${attacker?attacker.name:"Rusty"} bashes ${victim.name}. Rolled ${roll}${multiplier>1?" × "+multiplier:""}${this.g.condition==="bumper"?" + 2":""}.`,"bash");
    if(!c.defenses.has(victim.id)&&victim.policy.karma==="use"&&this.use(victim,"M11")){c.defenses.add(victim.id);distance=-distance;}
    this.travel(victim,-distance,"forced",c);
  }
  hazard(p:Player,c:Chain){
    const n=p.pos,key=p.id+":"+n;if(c.hazards.has(key))return;
    const map=gameMap(this.g);if(![...map.grease,...map.tilt,...map.dead].includes(n))return;c.hazards.add(key);
    if(map.grease.includes(n)){const d=this.g.condition==="rain"?4:2;this.emit({type:"hazard",actor:p.id,kind:"grease",pos:n,lane:p.lane,result:"slide"});this.note(`${p.name} slides ${d} from Grease ${n}.`,"move");this.travel(p,d,"forced",c);}
    else if(map.tilt.includes(n)){const roll=this.die(),d=this.g.condition==="overdrive"?5:3;this.emit({type:"hazard",actor:p.id,kind:"tilt",pos:n,lane:p.lane,roll,result:roll<3?"back":roll>4?"forward":"stay"});this.note(`${p.name} rolls ${roll} on Tilt ${n}.`,"move");if(roll<3)this.travel(p,-d,"forced",c);if(roll>4)this.travel(p,d,"forced",c);}
    else if(this.g.condition!=="free"){const cost=this.g.condition==="inspector"?2:1;if(p.policy.dead==="pay"&&p.tickets>=cost){p.tickets-=cost;this.emit({type:"hazard",actor:p.id,kind:"dead",pos:n,lane:p.lane,result:"paid"});this.emit({type:"tickets",actor:p.id,delta:-cost,reason:"dead"});this.note(`${p.name} pays ${cost} at the Dead Zone.`);}else{p.skip=true;this.emit({type:"hazard",actor:p.id,kind:"dead",pos:n,lane:p.lane,result:"skip"});this.note(`${p.name} must skip next round after the Dead Zone.`);}}
  }
  replace(p:Player,count:number){const cards=[...p.hand].sort((a,b)=>b.value-a.value).slice(0,count);p.hand=p.hand.filter(c=>!cards.some(x=>x.id===c.id));this.g.speedDiscard.push(...cards);this.drawSpeed(p,cards.length);}
  condition(){const g=this.g;if(!g.conditionDeck.length)g.conditionDeck=this.shuffle(g.conditionDiscard.splice(0));const next=g.conditionDeck.shift();if(!next)return;if(g.condition)g.conditionDiscard.push(g.condition);g.condition=next;this.emit({type:"condition",condition:next});this.note(CONDITIONS[next].name+" is on the Rink Sign.","condition");if(next==="prize"){const last=Math.min(...g.players.map(p=>position(p,g.direction,this.size)));for(const p of g.players)if(position(p,g.direction,this.size)===last){p.tickets+=2;this.emit({type:"tickets",actor:p.id,delta:2,reason:"prize"});this.note(`${p.name} collects 2 tickets from Prize Wheel.`);}}}
  instant(p:Player,card:Midway){
    this.emit({type:"card",actor:p.id,kind:card.kind});this.note(`${p.name} draws ${EVENTS[card.kind].name}.`);
    this.chain(p.id,c=>{switch(card.kind){
      case "M01":{const prior=pose(p);p.lane="mini";p.shrink=0;this.movement(p.id,prior,pose(p),true);if(p.pos&&this.occupied(p,p.pos))this.safe(p,p.pos,-this.g.direction,false);break;}
      case "M02":{
        const rank=(v:Player)=>position(v,this.g.direction,this.size),progress=(v:Player)=>v.pos===0?0:this.g.direction>0?v.pos:this.size+1-v.pos;
        const start=rank(p),leader=[...this.g.players].sort((a,b)=>rank(b)-rank(a))[0];
        const distance=rank(leader)>start?(leader.lap-p.lap)*this.size+progress(leader)-progress(p)+1:1;
        const targets=this.g.players.filter(o=>o.id!==p.id&&rank(o)>start&&rank(o)<=rank(leader)).sort((a,b)=>rank(a)-rank(b)||a.seat-b.seat);
        this.travel(p,Math.max(1,distance),"lead",c);for(const target of targets)if(!c.hit.has(target.id))this.bash(target,p,c);break;
      }
      case "M03":for(const target of this.ordered())this.travel(target,3,"forced",c);break;
      case "M04":for(const target of this.ordered())this.replace(target,1);break;
      case "M06":p.stalled=true;this.emit({type:"stall",actor:p.id,pos:p.pos,pileup:false});break;
      case "M07":{const before=pose(p);p.pos=0;this.movement(p.id,before,pose(p),true);break;}
      case "M08":this.replace(p,2);break;
      case "M13":p.tickets++;this.emit({type:"tickets",actor:p.id,delta:1,reason:"card"});break;
      case "M14":if(p.tickets>0)this.emit({type:"tickets",actor:p.id,delta:-1,reason:"card"});p.tickets=Math.max(0,p.tickets-1);break;
      case "M15":p.skip=true;break;
      case "M18":{
        const counts=new Map(this.g.players.map(v=>[v.id,v.hand.length]));
        for(const v of this.g.players)this.g.speedDiscard.push(...v.hand.splice(0));
        this.g.speedDeck=this.shuffle([...this.g.speedDeck,...this.g.speedDiscard]);this.g.speedDiscard=[];
        this.g.eventDeck=this.shuffle([...this.g.eventDeck,...this.g.eventDiscard]);this.g.eventDiscard=[];
        const first=(p.seat+1)%this.g.players.length;this.g.nextFirstSeat=first;
        const redraw=[...this.g.players].sort((a,b)=>(a.seat-first+this.g.players.length)%this.g.players.length-(b.seat-first+this.g.players.length)%this.g.players.length);
        for(const v of redraw)this.drawSpeed(v,counts.get(v.id));
        this.note(`Rain Delay resets the two legacy decks. ${this.g.players[first].name} starts the redraw; held Midway cards and the Rink Condition stay.`);break;
      }
      case "M19":p.compelled=true;break;
      case "M20":this.g.direction=this.g.direction===1?-1:1;this.note(`The rink reverses! Forward is now ${this.g.direction===1?"clockwise":"counterclockwise"}. All cars stay on their spaces.`);break;
    }});
    this.g.eventDiscard.push(card);
  }
  orderTies(group:Player[],depth=0):Player[]{if(group.length<2)return group;if(depth>100)throw new GameError("Please retry the tied roll.");const rolls=group.map(p=>({p,r:this.die()}));this.note(rolls.map(x=>`${x.p.name}: ${x.r}`).join(" · ")+" for tied order.");return [6,5,4,3,2,1].flatMap(r=>this.orderTies(rolls.filter(x=>x.r===r).map(x=>x.p),depth+1));}
  begin(now:number){
    const g=this.g;if(g.nextFirstSeat!==null){g.firstSeat=g.nextFirstSeat;g.nextFirstSeat=null;}g.round++;g.picks={};g.flags=[];g.deadline=now+(g.pace==="quick"?(g.rules==="3.4"?60000+replayBudget(g.replay):20000):86400000);this.note(`Round ${g.round} · ${CONDITIONS[g.condition].name}`,"round");
    for(const p of this.seatOrder()){const skipped=p.skip;p.skip=false;p.active=!skipped;if(skipped)this.note(`${p.name} sits out this round.`);if(p.stalled&&!skipped){if(p.policy.daddy==="escape"&&this.use(p,"M12")){p.stalled=false;}else{const roll=this.die();p.stalled=roll<4;this.note(`${p.name} rolls ${roll} to escape: ${p.stalled?"still stalled":"back in action"}.`);}}p.active=p.active&&!p.stalled;}
    for(const p of g.players.filter(p=>p.bot&&p.active)){const primary=p.hand[Math.floor(this.random()*p.hand.length)];if(!primary)throw new GameError("A driver has no cards.");g.picks[p.id]={primary:primary.id};}
  }
  resolve(now:number){
    const g=this.g;this.delta={};g.replay={round:g.round,initial:visual(g),events:[]};const active=g.players.filter(p=>p.active);
    const cards=new Map(active.map(p=>[p.id,p.hand.find(c=>c.id===g.picks[p.id].primary)!]));
    const order=[10,9,8,7,6,5,4,3,2,1].flatMap(v=>this.orderTies(active.filter(p=>cards.get(p.id)?.value===v)));
    g.flags=order.map(p=>p.id);g.lastReveal=[];
    for(const p of order){const pick=g.picks[p.id];this.emit({type:"reveal",actor:p.id,value:cards.get(p.id)!.value,extra:p.hand.find(c=>c.id===pick.extra)?.value,boost:p.held.find(c=>c.id===pick.boost)?.kind});}
    for(const value of new Set(active.map(p=>cards.get(p.id)!.value))){const group=active.filter(p=>cards.get(p.id)!.value===value);if(group.length>1){this.emit({type:"doubles",actors:group.map(p=>p.id),value});for(const p of group)this.stat(p,"doubles");}}

    const pending=new Map<string,Midway[]>();
    for(const p of order){const value=cards.get(p.id)!.value;const duplicates=active.filter(o=>cards.get(o.id)?.value===value).length;if(duplicates>1){const count=g.condition==="fireworks"?2:1;const drawn:Midway[]=[];for(let i=0;i<count;i++){const e=this.drawEvent();if(e)drawn.push(e);}pending.set(p.id,drawn);this.note(`${p.name} draws ${drawn.length} Midway card${drawn.length===1?"":"s"} for Doubles.`);}}
    const moves=new Map<string,{primary:Speed;extra?:Speed;boost?:Midway}>();const played:Speed[]=[],boosts:Midway[]=[];
    for(const p of order){const pick=g.picks[p.id],primary=cards.get(p.id)!,extra=p.hand.find(c=>c.id===pick.extra),boost=p.held.find(c=>c.id===pick.boost);moves.set(p.id,{primary,extra,boost});p.hand=p.hand.filter(c=>c.id!==primary.id&&c.id!==extra?.id);if(boost){p.held=p.held.filter(c=>c.id!==boost.id);boosts.push(boost);}played.push(primary);if(extra)played.push(extra);if(!p.hand.length)g.final=true;g.lastReveal.push({id:p.id,primary:primary.value,extra:extra?.value,boost:boost?.kind});this.note(`${p.name} reveals ${primary.value}${boost?" + "+EVENTS[boost.kind].name:""}.`,"move");}
    const mod=(v:number)=>Math.max(1,v+(g.condition==="surge"?1:g.condition==="brownout"?-1:0));
    for(const p of order){const m=moves.get(p.id)!;if(p.stalled){this.note(`${p.name}'s committed movement is canceled by the stall.`);continue;}const base=m.boost?.kind==="M10"?11:m.primary.value+(m.boost?.kind==="M05"?m.extra!.value:0);this.speed(p,mod(base));if(m.boost?.kind==="M09"&&!p.stalled)this.speed(p,mod(m.extra!.value));}
    for(let i=0;i<(g.condition==="rampage"?2:1);i++){const roll=this.die();const path:Pose[]=[{pos:g.rusty,lap:0,lane:"main"}];for(let step=0;step<roll;step++)path.push({pos:this.wrap(g.rusty-(step+1)*g.direction),lap:0,lane:"main"});this.emit({type:"travel",actor:"rusty",path});g.rusty=path.at(-1)!.pos;this.note(`Rusty rolls ${roll} and reverses to ${g.rusty}.`,"move");const victims=g.players.filter(p=>p.pos===g.rusty).sort((a,b)=>a.seat-b.seat);this.chain(null,c=>{for(const p of victims)if(p.pos===g.rusty&&!c.hit.has(p.id))this.bash(p,null,c);});}
    for(const p of this.ordered()){for(const e of pending.get(p.id)||[]){if(EVENTS[e.kind].type==="INSTANT")this.instant(p,e);else{e.available=g.round+1;p.held.push(e);}}}
    for(const p of g.players){const delta=this.delta[p.id]||0;if(delta){p.tickets=Math.max(0,p.tickets+delta);this.emit({type:"lap",actor:p.id,delta});this.note(`${p.name}: ${delta>0?"+":""}${delta} lap ticket${Math.abs(delta)===1?"":"s"}.`);}}
    g.speedDiscard.push(...played);g.eventDiscard.push(...boosts);
    if(g.final){g.phase="finished";const rank=[...g.players].sort((a,b)=>b.tickets-a.tickets||position(b,g.direction,this.size)-position(a,g.direction,this.size));g.winners=rank.filter(p=>p.tickets===rank[0].tickets&&position(p,g.direction,this.size)===position(rank[0],g.direction,this.size)).map(p=>p.id);this.note(`${g.winners.map(id=>this.player(id).name).join(" and ")} win${g.winners.length===1?"s":""} the Blue Ribbon!`,"round");g.picks={};return;}
    while(g.milestone<g.highLap){g.milestone++;this.condition();}
    for(const p of this.ordered()){if(!p.stalled&&p.id!==g.flags[0]&&p.hand.length<g.limit){this.drawSpeed(p);this.emit({type:"draw",actor:p.id,count:1,reason:"Replacement draw"});this.note(`${p.name} draws 1 replacement Speed Card.`);}else this.note(`${p.name}: no replacement draw (${p.stalled?"stalled":p.id===g.flags[0]?"Flag 1":"hand limit"}).`);}
    this.begin(now);
  }
}

export function validatePick(g:Game,p:Player,pick:Pick){
  if(g.phase!=="pick"||!p.active)throw new GameError("You are not choosing a card this round.");
  if(!p.hand.some(c=>c.id===pick.primary))throw new GameError("Choose a Speed Card from your own hand.");
  const boost=pick.boost?p.held.find(c=>c.id===pick.boost&&c.available<=g.round):undefined;
  if(pick.boost&&(!boost||EVENTS[boost.kind].type!=="BOOST"))throw new GameError("Choose a usable BOOST from your own cards.");
  if(boost&&g.condition==="lights")throw new GameError("Lights Out: save your BOOST for later.");
  const need=boost&&(boost.kind==="M05"||boost.kind==="M09");
  if(need){const extra=p.hand.find(c=>c.id===pick.extra&&c.id!==pick.primary);if(!extra)throw new GameError("This BOOST needs a second Speed Card.");if(boost.kind==="M05"&&extra.value!==Math.min(...p.hand.filter(c=>c.id!==pick.primary).map(c=>c.value)))throw new GameError("Distracted Carnie needs your lowest additional card.");}
  else if(pick.extra)throw new GameError("An extra Speed Card needs Distracted Carnie or Groundhog Day.");
}

export function makeGame(seats:{id:string;name:string;bot:boolean}[],map:MapId,pace:"relaxed"|"quick",random:Rng,now=Date.now(),options:{trackLength?:16|18|28;startingHand?:number}={}):Game{
  if(seats.length<2||seats.length>6)throw new GameError("A race needs 2–6 drivers.");
  const g:Game={rules:"3.4",trackLength:options.trackLength||16,phase:"pick",map,pace,direction:1,firstSeat:0,nextFirstSeat:null,round:0,limit:options.startingHand??6,players:seats.map((s,i)=>({...s,seat:i,color:PAINTS[i],pos:0,lap:0,lane:"main",tickets:3,hand:[],held:[],skip:false,stalled:false,shrink:0,compelled:false,active:true,policy:{...DEFAULT_POLICY},misses:0,stats:{bashes:0,doubles:0,laps:0}})),rusty:Math.floor((options.trackLength||16)/2),condition:undefined as unknown as Condition,conditionDeck:[],conditionDiscard:[],milestone:0,highLap:0,speedDeck:[],speedDiscard:[],eventDeck:[],eventDiscard:[],picks:{},flags:[],log:[],logSeq:0,deadline:now,final:false,lastReveal:[],winners:[]};
  const r=new Referee(g,random);g.speedDeck=r.shuffle(Array.from({length:50},(_,i)=>({id:"s"+i,value:Math.floor(i/5)+1})));g.eventDeck=r.shuffle(Object.entries(EVENTS).flatMap(([kind,e])=>Array.from({length:e.count},(_,i)=>({id:kind+"-"+i,kind:kind as EventId,available:0}))));g.conditionDeck=r.shuffle(Object.keys(CONDITIONS) as Condition[]);
  for(const p of g.players)r.drawSpeed(p,g.limit);
  const lowest=new Map(g.players.map(p=>[p.id,[...p.hand].sort((a,b)=>a.value-b.value)[0]]));
  const order=[10,9,8,7,6,5,4,3,2,1].flatMap(v=>r.orderTies(g.players.filter(p=>lowest.get(p.id)!.value===v)));
  for(const p of order){p.pos=lowest.get(p.id)!.value;if(r.occupied(p,p.pos))r.safe(p,p.pos,1,false);p.hand=p.hand.filter(c=>c.id!==lowest.get(p.id)!.id);g.speedDiscard.push(lowest.get(p.id)!);}
  for(const p of g.players)r.drawSpeed(p);r.condition();r.begin(now);advanceGame(g,random,now);return g;
}

export function submitPick(g:Game,userId:string,pick:Pick,round:number,random:Rng,now=Date.now()){
  if(round!==g.round)throw new GameError("That round has moved on. Your hand has been refreshed.");
  const p=g.players.find(p=>p.id===userId);if(!p)throw new GameError("You are not a driver in this race.");
  if(g.picks[userId]){if(JSON.stringify(g.picks[userId])===JSON.stringify(pick))return;throw new GameError("Your card is already locked in.");}
  validatePick(g,p,pick);g.picks[userId]={...pick};p.misses=0;advanceGame(g,random,now);
}
export function advanceGame(g:Game,random:Rng,now=Date.now()){
  const r=new Referee(g,random);
  for(let pass=0;pass<20&&g.phase==="pick";pass++){
    if(g.deadline<=now){for(const p of g.players.filter(p=>p.active&&!g.picks[p.id])){const c=[...p.hand].sort((a,b)=>a.value-b.value)[0];if(!c)throw new GameError("A driver has no Speed Cards.");g.picks[p.id]={primary:c.id};p.misses++;r.note(`${p.name}'s timer expired; the lowest card is locked in.`);}}
    if(g.players.some(p=>p.active&&!g.picks[p.id]))return;
    r.resolve(now);
  }
}

export function publicGame(g:Game,viewer:string){
  return {rules:g.rules,trackLength:trackSize(g),replay:g.replay||null,phase:g.phase,map:g.map,pace:g.pace,direction:g.direction,firstSeat:g.firstSeat,round:g.round,limit:g.limit,rusty:g.rusty,condition:g.condition,milestone:g.milestone,deadline:g.deadline,flags:g.flags,lastReveal:g.lastReveal,log:g.log,winners:g.winners,
    players:g.players.map(p=>({id:p.id,name:p.name,seat:p.seat,color:p.color,bot:p.bot,pos:p.pos,lap:p.lap,lane:p.lane,tickets:p.tickets,skip:p.skip,stalled:p.stalled,shrink:p.shrink,compelled:p.compelled,active:p.active,handCount:p.hand.length,heldCount:p.held.length,locked:!!g.picks[p.id]})),
    me:(()=>{const p=g.players.find(p=>p.id===viewer);return p?{hand:p.hand,held:p.held,policy:p.policy,pick:g.picks[viewer]||null}:null;})(),
    decks:{speed:g.speedDeck.length,midway:g.eventDeck.length,conditions:g.conditionDeck.length}
  };
}
export type PublicGame=ReturnType<typeof publicGame>;

// Test-only entry point for deterministic rule scenarios. Production commands
// never accept an event kind, dice result, position, or tickets from a client.
export function scenario(g:Game,kind:EventId,ownerId:string,random:Rng){const r=new Referee(g,random);r.instant(r.player(ownerId),{id:"fixture",kind,available:0});return g;}
