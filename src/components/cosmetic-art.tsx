import {useId} from "react";
import {cosmetic} from "@/lib/cosmetic-catalog";
// Hand-drawn SVG extensions of the game's outlined, glossy toy-car art.
export function SkinBody({skin}:{skin:string}){
 const item=cosmetic(skin),t=item?.theme||"standard",c=item?.color||"#ec4c3e",id=useId().replace(/:/g,"");
 return <svg viewBox="0 0 120 100" overflow="visible" aria-hidden="true"><defs><linearGradient id={id} x2=".25" y2="1"><stop stopColor="#fff" stopOpacity=".65"/><stop offset=".4" stopColor={c}/><stop offset="1" stopColor="#15263c"/></linearGradient></defs>
 <ellipse cx="61" cy="86" rx="51" ry="9" fill="#13263d" opacity=".22"/>
 {t==="monster"&&<g fill="#243141" stroke="#102037" strokeWidth="3">{[22,96].map(x=><g key={x}><ellipse cx={x} cy="71" rx="17" ry="23"/><ellipse cx={x} cy="71" rx="9" ry="14" fill="#bbc3cb"/><path d={`M${x-14} 59h28m-30 12h32m-29 12h27`} stroke="#63717d" strokeWidth="4"/></g>)}</g>}
 {t==="rocket"?<g stroke="#17304a" strokeWidth="3"><path d="M28 58 11 74 36 77M81 45 102 62 88 69" fill="#e65040"/><path d="M16 62Q32 18 78 30L110 52Q91 76 46 77Z" fill={`url(#${id})`}/><circle cx="70" cy="48" r="13" fill="#43bcd5"/><circle cx="70" cy="48" r="17" fill="none" stroke="#edf5f5" strokeWidth="4"/><path d="M34 48 48 69" stroke="#718a9c"/>{[43,52,85,92].map((x,i)=><circle key={x} cx={x} cy={i%2?64:37} r="2" fill="#17304a"/>)}<path d="M15 63 4 65 13 71" fill="#8eeaff" stroke="#e8ffff"/></g>:<g stroke="#17304a" strokeWidth="3">
 <path d="M8 69Q10 50 36 44H87Q108 51 112 68L105 80Q59 99 13 82Z" fill="#283b50"/>
 <path d="M12 59Q21 36 59 35 96 34 107 55L109 68Q70 89 14 70Z" fill={`url(#${id})`}/>
 <path d="M27 45Q40 28 67 31 88 33 93 45L85 56 34 59Z" fill={c}/>
 <path d="M42 45Q41 23 63 23 83 23 83 43L75 49 46 50Z" fill="#263b50"/>
 <path d="M46 42Q48 29 65 29 77 29 78 41" stroke="#8aabb7" fill="none" strokeWidth="4"/>
 <path d="M15 66Q59 86 105 65" fill="none" stroke="#d7dfea" strokeWidth="5"/>
 <path d="M21 55Q29 46 36 47" stroke="#fff" opacity=".8" strokeWidth="4" strokeLinecap="round"/>
 <path d="M87 31 92 6" stroke="#17304a" strokeWidth="4"/><circle cx="92" cy="6" r="3" fill="#ffd369"/>
 </g>}
 {t==="monster"&&<g fill="#25354a" stroke="#102037" strokeWidth="3">{[20,99].map(x=><g key={x}><ellipse cx={x} cy="73" rx="15" ry="21"/><ellipse cx={x} cy="73" rx="8" ry="12" fill="#a6bac7"/><circle cx={x} cy="73" r="4" fill="#415368"/><path d={`M${x-12} 60h24m-27 11h30m-26 12h23`} stroke="#53697a" strokeWidth="2"/></g>)}</g>}
 <g stroke="#20344a" strokeWidth="1.8" strokeLinejoin="round">
 {t==="flame"&&<path d="M15 65Q28 59 26 51L39 61 46 46Q49 58 61 59L72 49 72 64 91 58 100 65Q53 82 15 65Z" fill="#ffd349"/>}
 {t==="rust"&&<g fill="#6c3b28">{[20,38,72,87].map((x,i)=><path key={x} d={`M${x} ${61+i%2*7}l8-4 5 8-10 3Z`}/>)}<path d="M48 65 66 62 72 74 51 76Z" fill="#afb0a5"/><path d="M52 67 67 71"/></g>}
 {(t==="flower"||t==="tie-dye")&&<g>{[24,43,64,85].map((x,i)=><g key={x} transform={`translate(${x} ${65+i%2*3})`}><circle r="8" fill={["#ffb8dc","#57d5ca","#f7d852","#ba8ee3"][i]} stroke="none"/>{[0,60,120].map(a=><ellipse key={a} rx="3" ry="8" transform={`rotate(${a})`} fill={t==="tie-dye"?["#ffb8dc","#57d5ca","#f7d852","#ba8ee3"][i]:"#fff8d6"} stroke="none"/>)}<circle r="3" fill="#ffd34e"/></g>)}<circle cx="64" cy="66" r="10" fill="#fff3d0"/><path d="M64 57v18m0-9-7 7m7-7 7 7" stroke="#684698"/></g>}
 {t==="ufo"&&<><ellipse cx="61" cy="58" rx="52" ry="18" fill="#9ce1cf"/><path d="M35 54Q37 11 63 12 86 15 89 54Z" fill="#71b7e4" fillOpacity=".75"/>{[21,41,63,85,101].map(x=><circle key={x} cx={x} cy="63" r="4" fill="#ffe967"/>)}</>}
 {t==="popcorn"&&<>{[26,48,70,92].map(x=><path key={x} d={`M${x} 60v13`} stroke="#fff4da" strokeWidth="10"/>)}{[32,44,57,68,79,89].map((x,i)=><circle key={x} cx={x} cy={43-i%2*7} r="9" fill="#fff2ac"/>)}</>}
 {t==="cotton"&&<g stroke="#b55f9b">{[27,44,63,83].map((x,i)=><circle key={x} cx={x} cy={55-i%2*8} r="16" fill={i%2?"#a4dbf1":"#ffc0e2"}/>)}</g>}
 {t==="disco"&&<g stroke="#fff" strokeWidth="2">{[24,36,48,60,72,84,96].map(x=><path key={x} d={`M${x} 59v13`}/>)}<path d="M20 64H101M31 70H93"/><path d="m38 14 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill="#fff" stroke="#eccd55"/></g>}
 {t==="pirate"&&<><path d="M61 54V5" strokeWidth="4"/><path d="M65 8 96 13 91 40 65 36Z" fill="#28364b"/><circle cx="78" cy="23" r="6" fill="#fff7dd"/><path d="m73 31 13-2m-11-2 8 6" stroke="#fff7dd"/><path d="M18 65Q59 89 103 62" stroke="#ffc950" strokeWidth="6"/></>}
 {t==="shark"&&<><path d="M52 42 64 9 78 44" fill="#5c9cb7"/><path d="M17 67Q52 59 79 67L61 77 30 75Z" fill="#fff8db"/><path d="m25 67 4 7 6-8 5 9 7-9 5 9 7-8" fill="#fff"/><circle cx="23" cy="56" r="3"/></>}
 {t==="dragon"&&<><path d="M27 50 10 25 43 39M78 45 109 23 97 59" fill="#afd267"/><path d="m36 37 4-12 9 11 6-13 7 12 8-13 6 15" fill="#f5c75c"/><circle cx="24" cy="58" r="4" fill="#fff5b1"/><circle cx="24" cy="58" r="1.5"/></>}
 {t==="ladybug"&&<g fill="#20344a">{[25,43,68,88].map((x,i)=><circle key={x} cx={x} cy={63+i%2*5} r="6"/>)}<path d="M60 57v20"/></g>}
 {(t==="bee"||t==="candycorn")&&<g>{[30,53,76].map((x,i)=><path key={x} d={`M${x} 56v20`} stroke={t==="bee"?"#26374b":["#fff7da","#ed8030","#f7d844"][i]} strokeWidth="12"/>)}{t==="bee"&&<><ellipse cx="36" cy="38" rx="12" ry="8" fill="#e8faff"/><ellipse cx="81" cy="38" rx="12" ry="8" fill="#e8faff"/></>}</g>}
 {t==="watermelon"&&<><path d="M17 61Q62 84 103 59L90 73Q58 91 22 73Z" fill="#68ce81"/><path d="M21 59Q62 77 98 57L87 69Q58 81 27 69Z" fill="#ed627c"/>{[35,50,67,82].map(x=><ellipse key={x} cx={x} cy="67" rx="1.5" ry="3"/>)}</>}
 {t==="lightning"&&<path d="m69 48-25 17 16 1-12 14 32-21-16 1Z" fill="#ffe16a"/>}
 {t==="steampunk"&&<><path d="M30 48V24h12v28" fill="#b78452"/><ellipse cx="36" cy="24" rx="8" ry="4" fill="#556476"/>{[49,75,91].map((x,i)=><g key={x}><circle cx={x} cy={65+i%2*4} r="8" fill="#d5a255"/><circle cx={x} cy={65+i%2*4} r="3" fill="#33465a"/></g>)}</>}
 {t==="space"&&<g fill="#fff0b0" stroke="none">{[25,35,52,68,83,94].map((x,i)=><path key={x} d={`m${x} ${59+i%3*5} 2-4 2 4 4 1-4 2-2 4-2-4-4-2Z`}/>)}</g>}
 {t==="glow"&&<><path d="M16 65Q62 85 107 63" fill="none" stroke="#5ef6ea" strokeWidth="5"/><path d="M24 54h18m41-2h15" stroke="#ff79d5" strokeWidth="4"/></>}
 {t==="checker"&&<>{[28,40,52,64,76,88].map((x,i)=><rect key={x} x={x} y={62+i%2*5} width="7" height="6" fill="#20344a" stroke="none"/>)}<circle cx="56" cy="61" r="10" fill="#e85343"/><text x="56" y="65" fontSize="12" textAnchor="middle" fill="#fff" stroke="none">1</text></>}
 {t==="unicorn"&&<><path d="M33 40 46 12 49 42" fill="#ffe3a0"/><path d="M43 45Q62 15 85 33" fill="none" stroke="#f2afd7" strokeWidth="10"/><path d="M44 48Q67 28 85 39" fill="none" stroke="#91d4e9" strokeWidth="6"/></>}
 {t==="gold"&&<><circle cx="60" cy="63" r="10" fill="#397eb9"/><path d="m54 69-3 13 9-5 8 5-3-13" fill="#397eb9"/><path d="m60 56 2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1Z" fill="#ffe48b"/></>}
 </g></svg>;
}
export function MascotArt({id,...props}:{id:string}&React.SVGProps<SVGSVGElement>){
 const m=cosmetic(id),c=m?.color||"#efb24f";
 return <svg viewBox="0 0 64 64" role="img" aria-label={m?.name||"Passenger"} {...props}><g stroke="#23364d" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
 {id==="goldfish"?<><path d="M16 14h32l-3 8q18 31-13 34Q2 53 19 22Z" fill="#caedfa" fillOpacity=".8"/><path d="M13 36q19-7 38 0" fill="none" stroke="#75c9e4"/><ellipse cx="30" cy="38" rx="12" ry="7" fill="#ffb44d"/><path d="m39 38 10-7v14Z" fill="#f48b3e"/><circle cx="25" cy="36" r="1.5" fill="#24374b"/><circle cx="40" cy="23" r="2" fill="#fff"/></>:id==="balloon-dog"?<g fill={c}><ellipse cx="31" cy="34" rx="16" ry="7"/><ellipse cx="18" cy="43" rx="5" ry="12" transform="rotate(15 18 43)"/><ellipse cx="43" cy="43" rx="5" ry="12" transform="rotate(-12 43 43)"/><ellipse cx="17" cy="26" rx="5" ry="13"/><ellipse cx="11" cy="15" rx="10" ry="6"/><ellipse cx="20" cy="11" rx="4" ry="9"/><path d="M46 32q13-16 10-20" fill="none" stroke={c} strokeWidth="7"/><path d="M9 13h6M27 32h10" stroke="#fff2f7" strokeWidth="2"/></g>:id==="robot"?<><rect x="17" y="29" width="31" height="28" rx="5" fill={c}/><rect x="13" y="10" width="38" height="25" rx="7" fill="#cee1e5"/><circle cx="24" cy="21" r="4" fill="#81d7d5"/><circle cx="40" cy="21" r="4" fill="#81d7d5"/><path d="M26 29h12M32 10V4m-18 36-8 9m43-9 8 9"/><path d="m32 48-7-7q3-8 7-2 6-6 8 2Z" fill="#eb6973"/></>:<>
 {id==="duck"?<path d="M42 25q16 12 6 25Q8 65 10 38L22 41" fill={c}/>:<><ellipse cx="32" cy="45" rx={id==="teddy"?21:17} ry="17" fill={c}/><ellipse cx="13" cy="43" rx="7" ry="12" fill={c}/><ellipse cx="51" cy="43" rx="7" ry="12" fill={c}/></>}
 {id==="alien"?<ellipse cx="32" cy="23" rx="20" ry="23" fill={c}/>:<><circle cx="17" cy="15" r="9" fill={c}/><circle cx="47" cy="15" r="9" fill={c}/><ellipse cx="32" cy="26" rx="21" ry="19" fill={c}/></>}
 {id==="dino"&&<path d="m16 14 4-10 7 7 6-10 5 10 9-6 1 12" fill="#f0ad67"/>}
 {id==="unicorn-pal"&&<path d="M27 13 33 0 38 14" fill="#ffdc82"/>}
 {(id==="penguin"||id==="monkey"||id==="teddy")&&<ellipse cx="32" cy="32" rx="15" ry="13" fill={id==="penguin"?"#fff7df":"#e4c59d"}/>}
 {id==="bee-pal"&&<><path d="M18 42h28m-28 9h28" strokeWidth="5"/><ellipse cx="10" cy="32" rx="8" ry="12" fill="#d9f4ff"/><ellipse cx="54" cy="32" rx="8" ry="12" fill="#d9f4ff"/></>}
 <ellipse cx="24" cy="25" rx={id==="alien"?5:2.5} ry={id==="alien"?8:3.5} fill="#23364d"/><ellipse cx="40" cy="25" rx={id==="alien"?5:2.5} ry={id==="alien"?8:3.5} fill="#23364d"/>
 {id==="duck"||id==="penguin"?<path d="m26 32 6 7 8-7Z" fill="#f4a84c"/>:<path d="M25 35q7 7 14-1" fill="none"/>}
 <path d="M24 48h16" stroke="#fff" strokeOpacity=".4"/>
 </>}
 </g></svg>;
}
