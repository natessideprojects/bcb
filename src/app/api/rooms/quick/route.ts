import {requireUser,sameOrigin,json} from "@/lib/api";
import {quickMatch,apiError} from "@/lib/rooms";
// Quick Match: the fullest open race with a free seat, or a new open Quick race.
export const dynamic="force-dynamic";
export async function POST(req:Request){try{sameOrigin(req);const u=await requireUser();return json({room:await quickMatch(u)});}catch(e){return apiError(e);}}
