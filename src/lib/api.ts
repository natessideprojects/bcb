import {auth} from "./auth/server";
import {HttpError,type User} from "./rooms";
import {readGuest} from "./guest";
/** The signed-in account, or the guest driver from this browser's guest cookie. */
export async function currentUser():Promise<User|null>{
  let data:Awaited<ReturnType<typeof auth.getSession>>["data"]=null;
  try{({data}=await auth.getSession());}catch(e){console.error("Account session check failed; continuing as guest",(e as Error)?.message);}
  if(data?.user)return {id:data.user.id,name:data.user.name||"Driver",isTest:!!data.user.email?.endsWith("@example.invalid")};
  return readGuest();
}
export async function requireUser():Promise<User>{const u=await currentUser();if(!u)throw new HttpError(401,"Sign in or play as a guest to enter the fairground.");return u;}
export function sameOrigin(request:Request){
  const supplied=request.headers.get("origin"),url=new URL(request.url);
  // Next's dev listener may normalize request.url to 0.0.0.0. Validate the
  // browser's Origin against the actual HTTP Host, not that internal address.
  const host=request.headers.get("host")||url.host;
  const protocol=(request.headers.get("x-forwarded-proto")||url.protocol.replace(":","")).split(",")[0].trim();
  let origin:URL;try{origin=new URL(supplied||"");}catch{throw new HttpError(403,"Open the game directly to make this request.");}
  if(origin.host!==host||origin.protocol!==protocol+":")throw new HttpError(403,"Open the game directly to make this request.");
}
export const json=(value:unknown)=>Response.json(value,{headers:{"Cache-Control":"private, no-store"}});
