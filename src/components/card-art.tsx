import {Car} from "./brand";
import type {EventId} from "@/lib/game/catalog";
export function SpeedDial({value}:{value:number}){return <svg viewBox="0 0 120 75" className="speed-dial" aria-hidden="true"><path d="M12 65a48 48 0 0 1 96 0" fill="none" stroke="#d4a346" strokeWidth="9"/>{Array.from({length:7},(_,i)=>{const a=(180+i*30)*Math.PI/180;return <path key={i} d={`M${60+39*Math.cos(a)} ${65+39*Math.sin(a)}L${60+48*Math.cos(a)} ${65+48*Math.sin(a)}`} stroke="#fff4d3" strokeWidth="3"/>;})}<path d={`M60 65L${60+39*Math.cos((180+value*16)*Math.PI/180)} ${65+39*Math.sin((180+value*16)*Math.PI/180)}`} stroke="#cf342e" strokeWidth="5" strokeLinecap="round"/><circle cx="60" cy="65" r="7" fill="#1d2b45" stroke="#fff4d3" strokeWidth="2"/></svg>;}
export function HazardArt({kind,x=0,y=0,size=30}:{kind:"grease"|"tilt"|"dead";x?:number;y?:number;size?:number}){return <svg x={x} y={y} width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">{kind==="grease"?<><path d="M9 19C-2 8 11 1 15 12C19 1 28 3 24 14C36 8 42 20 29 23C43 31 28 37 24 28C23 43 9 39 13 28C0 35-4 23 9 19Z" fill="#83b83d" stroke="#355d28" strokeWidth="2"/><path d="M12 13l3 3m8 5 5 1" stroke="#d4e78f" strokeWidth="3" strokeLinecap="round"/></>:kind==="tilt"?<path d="M34 20C33 1 2 1 3 22C4 38 32 39 32 23C32 12 13 10 12 22C12 30 25 29 25 22C25 18 20 18 20 21" fill="none" stroke="#8c3eb9" strokeWidth="6" strokeLinecap="round"/>:<><path d="M21 1L9 23H20L16 39L34 15H23L30 1Z" fill="#f5bd32" stroke="#8a561d" strokeWidth="2"/><path d="M4 26v-5m5 5v-5M2 26h9v5H2z" stroke="#23334c" strokeWidth="2" fill="#23334c"/></>}</svg>;}
const burst="60,6 69,26 86,14 84,35 108,34 92,50 114,63 90,70 98,93 76,85 66,108 55,87 33,104 35,80 10,84 24,64 4,50 29,45 21,22 45,30";
export function EventArt({kind}:{kind:EventId}){
 const purple=["M06","M08","M19","M20"].includes(kind),blue=["M04","M09","M12","M18"].includes(kind);
 const car=kind!=="M11"&&kind!=="M09"&&kind!=="M10"&&kind!=="M13"&&kind!=="M18"&&kind!=="M20";
 return <svg className="event-art" viewBox="0 0 150 105" aria-hidden="true"><ellipse cx="75" cy="85" rx="53" ry="8" fill="#8b633c" opacity=".12"/><polygon points={burst} transform="translate(22 -3) scale(.87)" fill={purple?"#e5c3f1":blue?"#c4e8ef":"#ffe091"} stroke={purple?"#aa74be":blue?"#6ba8bd":"#dc9b33"} strokeWidth="1.5"/>
 {car&&<Car x={kind==="M01"?63:38} y={kind==="M01"?45:24} width={kind==="M01"?38:74} height={kind==="M01"?42:78} color={blue?"#2682c1":purple?"#9e4fac":"#e64535"}/>}
 {kind==="M01"&&<><path d="M28 13l17 6-12 12m12-12L23 40" stroke="#27334b" fill="none" strokeWidth="4"/><text x="94" y="25" className="art-comic">mini!</text></>}
 {["M02","M03","M16","M17"].includes(kind)&&<><path d="M123 12l-19 33h16l-9 27 30-37h-17l14-23Z" fill="#f6be32" stroke="#28354b" strokeWidth="2"/><path d="M18 48h20M12 59h20M18 70h18" stroke="#d34732" strokeWidth="3"/>{["M16","M17"].includes(kind)&&<text x="28" y="27" className="art-comic">×{kind==="M16"?3:2}</text>}</>}
 {kind==="M04"&&<path d="M24 28v-9m10 9v-9M19 28h20v15H19zm10 15v15l-9 9m20-3 8-8" fill="#25334b" stroke="#25334b" strokeWidth="3"/>}
 {kind==="M05"&&<><path d="M18 25l12-18 12 18Z" fill="#e74738" stroke="#26344a" strokeWidth="2"/><path d="M18 25h24" stroke="#26344a" strokeWidth="4"/><text x="115" y="35" className="art-comic">+?</text></>}
 {kind==="M06"&&<><path d="M110 50c-12-5-13-12-3-17-9-7 1-20 9-12 9-12 22 1 14 8 14 10 1 22-10 17" fill="#e1e5eb" stroke="#27354c" strokeWidth="2"/><path d="M28 79l-10 11m16-6-2 13" stroke="#26334b" strokeWidth="3"/></>}
 {kind==="M07"&&<><path d="M20 20v48m0-48h29v23H20Z" fill="#fff7e8" stroke="#24334b" strokeWidth="3"/><path d="M21 21h9v10h-9m9 0h9v11h-9m9-21h9v10h-9" fill="#24334b"/></>}
 {kind==="M08"&&<><circle cx="109" cy="25" r="18" fill="#d5e6ef" stroke="#23334b" strokeWidth="2"/><path d="M91 25h36m-18-18v36m-13-31 26 27m-26 0 26-27" stroke="#7c83b1" strokeWidth="1.5"/><path d="M108 0v7" stroke="#23334b" strokeWidth="2"/></>}
 {kind==="M09"&&<><rect x="40" y="21" width="67" height="65" rx="8" fill="#fff8e8" stroke="#25344b" strokeWidth="3"/><path d="M40 36h67M55 14v17m35-17v17" stroke="#cf4338" strokeWidth="6" strokeLinecap="round"/><text x="71" y="72" textAnchor="middle" className="art-big">↻</text></>}
 {kind==="M10"&&<text x="75" y="75" textAnchor="middle" className="art-big">11</text>}
 {kind==="M11"&&<><Car x="13" y="36" width="57" height="63" color="#e44536"/><Car x="83" y="36" width="57" height="63" color="#2587c6"/><text x="76" y="32" textAnchor="middle" className="art-comic">BASH!</text></>}
 {kind==="M12"&&<path d="M112 14l23 8v22c0 15-23 25-23 25s-23-10-23-25V22Z" fill="#73b779" stroke="#25374a" strokeWidth="3"/>}
 {kind==="M13"&&<><rect x="44" y="13" width="62" height="74" rx="8" fill="#df4c39" stroke="#26364b" strokeWidth="3"/><rect x="54" y="25" width="42" height="26" rx="4" fill="#fff1bc"/><path d="M56 62h38" stroke="#26344b" strokeWidth="5"/><circle cx="78" cy="78" r="12" fill="#f6c64e" stroke="#986b2a" strokeWidth="2"/><text x="78" y="83" textAnchor="middle" className="art-comic">1</text></>}
 {kind==="M14"&&<text x="111" y="28" textAnchor="middle" className="art-comic">−1</text>}
 {kind==="M15"&&<HazardArt kind="grease" x={90} y={53} size={47}/>}
 {kind==="M18"&&<><path d="M39 50c-16-4-12-27 4-27 3-22 34-23 40-4 23-9 39 13 27 30Z" fill="#89b7ce" stroke="#26364b" strokeWidth="3"/>{[43,63,83,103].map(x=><path key={x} d={`M${x} 61l-7 17`} stroke="#398fbb" strokeWidth="5" strokeLinecap="round"/>)}</>}
 {kind==="M19"&&<><path d="M26 19q49-30 98 0-49 34-98 0Z" fill="#f8a93c" stroke="#783b38" strokeWidth="3"/><path d="M75 6v26" stroke="#713343" strokeWidth="6"/></>}
 {kind==="M20"&&<><path d="M99 14c-62 1-24 17-2 17-43 2-7 15 6 15-33 0-1 15 7 15-25 3-3 14 4 15l-17 15" stroke="#9151b3" strokeWidth="7" fill="none" strokeLinecap="round"/><path d="M28 80l25-29 23 29m-48 0v16h48V80" fill="#7bb78d" stroke="#28374a" strokeWidth="3"/></>}
 <path d="M17 10l2 5 6 1-5 4 1 6-5-4-5 3 1-6-4-4 7-1Z" fill="#f4c348"/>
 </svg>;
}
