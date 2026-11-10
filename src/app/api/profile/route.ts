import {z} from "zod";
import {requireUser,sameOrigin,json} from "@/lib/api";
import {apiError,rate,HttpError} from "@/lib/rooms";
import {account,renameProfile} from "@/lib/profiles";
export const dynamic="force-dynamic";
export async function GET(){try{const u=await requireUser();await rate(u.id,"profile",30);return json({profile:await account(u)});}catch(e){return apiError(e);}}
export async function POST(req:Request){try{sameOrigin(req);const u=await requireUser();await rate(u.id,"profile-edit",5);const body=z.object({name:z.string().trim().min(1).max(24)}).safeParse(await req.json());if(!body.success)throw new HttpError(400,"Choose a driver name of 1–24 characters.");return json({profile:await renameProfile(u,body.data.name)});}catch(e){return apiError(e);}}
