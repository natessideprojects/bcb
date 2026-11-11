import {SkinBody,MascotArt} from "./cosmetic-art";
import {cosmetic} from "@/lib/cosmetic-catalog";
import Link from "next/link";
export function Brand(){return <Link href="/" className="brand" aria-label="Bumper Car Bash home"><span className="brand-marquee"><span>BUMPER CAR</span><strong>BASH!</strong><i aria-hidden="true">★</i></span></Link>;}
const paints=["ec4c3e","2d88c9","eab53b","3b9e7b","ea833c","a16ab7"];
const rgb=(hex:string)=>[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));
function sprite(color:string){const c=rgb(color.replace("#",""));if(c.reduce((a,b)=>a+b,0)<220)return 6;return paints.map((p,i)=>({i,d:rgb(p).reduce((sum,v,n)=>sum+(v-c[n])**2,0)})).sort((a,b)=>a.d-b.d)[0].i;}
export function Car({color="#ec4c3e",className="",skin,mascot,...props}:{color?:string;className?:string;skin?:string;mascot?:string|null}&React.SVGProps<SVGSVGElement>){const chosen=cosmetic(skin);const i=sprite(chosen?.price===0?chosen.color:color);return <svg className={`${className} vehicle-${skin||"standard"}`} viewBox="0 0 64 70" role="img" aria-label="Bumper car" {...props}>{chosen&&chosen.price>0?<svg x="0" y="8" width="64" height="60" viewBox="0 0 120 100" overflow="visible"><SkinBody skin={chosen.id}/></svg>:<svg x="0" y="3" width="64" height="64" viewBox={`${i%4} ${Math.floor(i/4)} 1 1`} overflow="hidden"><image href="/bumper-cars-v2.png" width="4" height="2" preserveAspectRatio="none"/></svg>}{mascot&&<MascotArt id={mascot} x="8" y="0" width="29" height="34"/>}</svg>;}
