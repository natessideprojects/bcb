import {auth} from "./auth/server";
import {HttpError,type User} from "./rooms";
export async function requireUser():Promise<User>{const {data}=await auth.getSession();if(!data?.user)throw new HttpError(401,"Sign in to enter the fairground.");return {id:data.user.id,name:data.user.name||"Driver",isTest:!!data.user.email?.endsWith("@example.invalid")};}
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
