import {requireUser,json} from "@/lib/api";
import {apiError,rate} from "@/lib/rooms";
import {rankings} from "@/lib/profiles";
export const dynamic="force-dynamic";
export async function GET(){try{const u=await requireUser();await rate(u.id,"leaderboard",20);return json({drivers:await rankings(u.id)});}catch(e){return apiError(e);}}
