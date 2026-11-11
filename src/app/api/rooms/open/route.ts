import {z} from "zod";
import {requireUser,sameOrigin,json} from "@/lib/api";
import {openRooms,joinOpen,apiError,rate,HttpError} from "@/lib/rooms";
// Pick-up races: list the open waiting rooms, or take a seat in one.
export const dynamic="force-dynamic";
export async function GET(){try{const u=await requireUser();await rate(u.id,"open-list",40);return json({rooms:await openRooms(u.id)});}catch(e){return apiError(e);}}
export async function POST(req:Request){try{sameOrigin(req);const u=await requireUser();const body=z.object({roomId:z.uuid()}).safeParse(await req.json());if(!body.success)throw new HttpError(400,"Pick a race to join.");return json({room:await joinOpen(u,body.data.roomId)});}catch(e){return apiError(e);}}
