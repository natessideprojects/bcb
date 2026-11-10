"use client";
import {useEffect,useSyncExternalStore} from "react";
import {Music2,Volume2,VolumeX,Settings2} from "lucide-react";
import {fairSound} from "@/lib/fair-audio";
export function FairgroundSound(){
 const s=useSyncExternalStore(fairSound.subscribe,fairSound.get,fairSound.server);
 useEffect(()=>fairSound.init(),[]);
 return <aside className="fair-sound-dock" aria-label="Fairground sound controls"><button className={`sound-power ${s.enabled?'on':''}`} aria-pressed={s.enabled} onClick={()=>{fairSound.set({enabled:!s.enabled});if(!s.enabled)fairSound.say('start_welcome',3);}}>{s.enabled?<Volume2 size={18}/>:<VolumeX size={18}/>}<span>{s.enabled?'Fair sound on':'Turn on fair sound'}</span></button><details><summary aria-label="Sound and animation settings"><Settings2 size={18}/></summary><div className="sound-panel"><h3><Music2 size={18}/> Make it a fair.</h3><p>Music, bumper sounds and the announcer start when you turn sound on.</p>{(['music','effects','voice'] as const).map(key=><label key={key}>{key==='music'?'Background music':key==='effects'?'Cars, bashes & crowd':'Announcer'}<input type="range" min="0" max="1" step=".05" value={s[key]} onChange={e=>fairSound.set({[key]:Number(e.target.value)})}/></label>)}<label>Round animation<select value={s.animation} onChange={e=>fairSound.set({animation:e.target.value as typeof s.animation})}><option value="normal">The full fairground show</option><option value="fast">Faster animations</option><option value="off">No animations</option></select></label><button className="button small navy" onClick={()=>{fairSound.set({enabled:true});fairSound.doubles();}}>Test the crowd</button><small>Mute any time. Your settings stay on this device.</small></div></details></aside>;
}
