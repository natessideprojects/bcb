import {cookies,headers} from "next/headers";
import {z} from "zod";
import {currentUser,sameOrigin,json} from "@/lib/api";
import {apiError,rate,HttpError} from "@/lib/rooms";
import {ensureProfile,renameProfile} from "@/lib/profiles";
import {GUEST_COOKIE,cleanGuestName,encodeGuest,guestCookie,newGuestId,readGuest} from "@/lib/guest";
export const dynamic="force-dynamic";

// Start (or rename) a guest driver for this browser.
export async function POST(req:Request){try{
  sameOrigin(req);
  const body=z.object({name:z.string().trim().min(1).max(24)}).parse(await req.json().catch(()=>({})));
  const name=cleanGuestName(body.name);if(!name)throw new HttpError(400,"Pick a driver name.");
  const h=await headers(),ip=(h.get("x-forwarded-for")||h.get("x-real-ip")||"local").split(",")[0].trim();
  const signedIn=await currentUser();if(signedIn&&!signedIn.guest)throw new HttpError(409,"You’re already signed in.");
  const existing=await readGuest();
  if(!existing)await rate("ip:"+ip,"guest",12,3600);
  const user={id:existing?.id||newGuestId(),name,isTest:true,guest:true};
  await ensureProfile(user);if(existing)await renameProfile(user,name);
  (await cookies()).set(GUEST_COOKIE,encodeGuest(user),guestCookie);
  return json({user:{id:user.id,name:user.name,guest:true}});
}catch(e){if(e instanceof z.ZodError)return apiError(new HttpError(400,"Pick a driver name up to 24 characters."));return apiError(e);}}

// Leave guest mode on this browser.
export async function DELETE(req:Request){try{sameOrigin(req);(await cookies()).delete(GUEST_COOKIE);return json({ok:true});}catch(e){return apiError(e);}}
