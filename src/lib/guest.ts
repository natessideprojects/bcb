// Guest drivers: play without an account. A guest is a random id plus a driver
// name, kept in a signed, HttpOnly cookie. Guests use the same rooms, profiles and
// Prize Booth as accounts, but their progress lives only in that browser and they
// stay off the public ladder.
import {createHmac,randomUUID,timingSafeEqual} from "node:crypto";
import {cookies} from "next/headers";
import type {User} from "./rooms";

export const GUEST_COOKIE="bcb_guest";
const MAX_AGE=60*60*24*90; // 90 days
const key=()=>{const s=process.env.NEON_AUTH_COOKIE_SECRET;if(!s)throw new Error("Guest play needs NEON_AUTH_COOKIE_SECRET");return s+":bcb-guest-v1";};
const b64=(s:string)=>Buffer.from(s,"utf8").toString("base64url");
const unb64=(s:string)=>Buffer.from(s,"base64url").toString("utf8");
const sign=(body:string)=>createHmac("sha256",key()).update(body).digest("base64url");
export const cleanGuestName=(name:string)=>name.replace(/[\u0000-\u001f<>]/g,"").trim().slice(0,24);
export const isGuestId=(id:string)=>/^guest-[0-9a-f-]{36}$/.test(id);

export function encodeGuest(user:{id:string;name:string}){const body=`${user.id}.${b64(user.name)}`;return `${body}.${sign(body)}`;}
export function decodeGuest(value:string|undefined):User|null{
  if(!value)return null;
  const parts=value.split(".");if(parts.length!==3)return null;
  const [id,name,sig]=parts,body=`${id}.${name}`,want=Buffer.from(sign(body)),got=Buffer.from(sig);
  if(want.length!==got.length||!timingSafeEqual(want,got)||!isGuestId(id))return null;
  try{return {id,name:cleanGuestName(unb64(name))||"Guest",isTest:true,guest:true};}catch{return null;}
}
export async function readGuest():Promise<User|null>{return decodeGuest((await cookies()).get(GUEST_COOKIE)?.value);}
export function newGuestId(){return "guest-"+randomUUID();}
export const guestCookie={httpOnly:true,sameSite:"lax" as const,secure:process.env.NODE_ENV==="production",path:"/",maxAge:MAX_AGE};
