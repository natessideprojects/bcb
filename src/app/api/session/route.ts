import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth/server";
import {REFRESHED_COOKIE} from "@/lib/api";
export const dynamic="force-dynamic";

// Renews the Neon Auth session cookies (allowed here, unlike during a page
// render), then returns to the page the player was opening.
const safeNext=(s:string|null)=>s&&/^\/(?!\/)[A-Za-z0-9\-_/]*$/.test(s)?s:"/";
export async function GET(req:Request){
  const next=safeNext(new URL(req.url).searchParams.get("next"));
  try{await auth.getSession({query:{disableCookieCache:"true"}});}catch(e){console.error("Session renewal failed",(e as Error)?.message);}
  (await cookies()).set(REFRESHED_COOKIE,"1",{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:20});
  redirect(next);
}
