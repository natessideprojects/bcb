import {cosmetic} from "@/lib/cosmetic-catalog";
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
