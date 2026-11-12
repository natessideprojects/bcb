"use client";
import {useEffect,useRef,useSyncExternalStore} from "react";
import {Music2,Volume2,VolumeX,Settings2} from "lucide-react";
import {fairSound,FAIRGROUND_MUSIC,type FairSettings} from "@/lib/fair-audio";
// The label shows the current state ("Sound on" / "Sound off"); the icon matches it.
// Before the first tap the browser keeps audio paused, so the button offers to start it.
function SoundButton({s}:{s:FairSettings}){
 const on=s.enabled&&s.ready,waiting=s.enabled&&!s.ready;
 const label=on?"Sound on":waiting?"Tap for sound":"Sound off";
 const hint=on?"Sound is on. Click to mute.":waiting?"Sound is on. Tap to start the music and announcer.":"Sound is off. Click to turn it on.";
 return <button className={`sound-power ${on?"on":waiting?"waiting":"off"}`} aria-label={hint} title={hint} onClick={()=>{if(waiting)fairSound.start(true);else if(on)fairSound.set({enabled:false});else fairSound.start(true);}}>{s.enabled?<Volume2 size={18}/>:<VolumeX size={18}/>}<span>{label}</span></button>;
}
export function FairgroundSound(){
 const s=useSyncExternalStore(fairSound.subscribe,fairSound.get,fairSound.server);
 const audio=useRef<HTMLAudioElement>(null);
 useEffect(()=>{fairSound.init();fairSound.bindMusic(audio.current);return()=>fairSound.bindMusic(null);},[]);
 return <aside className="fair-sound-dock" aria-label="Fairground sound controls"><audio ref={audio} src={FAIRGROUND_MUSIC.src} preload="none" loop/><SoundButton s={s}/><details><summary aria-label="Sound and animation settings"><Settings2 size={18}/></summary><div className="sound-panel"><h3><Music2 size={18}/> Make it a fair.</h3><p>Music, bumper sounds and the announcer are on, and start with your first tap. The speaker button mutes everything.</p>{(['music','effects','voice'] as const).map(key=><label key={key}>{key==='music'?'Background music · '+FAIRGROUND_MUSIC.title:key==='effects'?'Cars, bashes & crowd':'Announcer'}<input type="range" min="0" max="1" step=".05" value={s[key]} onChange={e=>fairSound.set({[key]:Number(e.target.value)})}/></label>)}<label>Round animation<select value={s.animation} onChange={e=>fairSound.set({animation:e.target.value as typeof s.animation})}><option value="normal">The full fairground show</option><option value="fast">Faster animations</option><option value="off">No animations</option></select></label><button className="button small navy" onClick={()=>{fairSound.start();fairSound.doubles();}}>Test the crowd</button><small>Mute any time. Your settings stay on this device.</small></div></details></aside>;
}
