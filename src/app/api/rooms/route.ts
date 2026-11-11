import {z} from "zod";
import {requireUser,sameOrigin,json} from "@/lib/api";
import {myRooms,createRoom,apiError,rate,HttpError} from "@/lib/rooms";
export const dynamic="force-dynamic";
export async function GET(){try{const u=await requireUser();await rate(u.id,"list",40);return json({rooms:await myRooms(u.id)});}catch(e){return apiError(e);}}
export async function POST(req:Request){try{sameOrigin(req);const u=await requireUser();const body=z.object({map:z.enum(["day","night"]),pace:z.enum(["quick","relaxed"]),open:z.boolean().optional()}).safeParse(await req.json());if(!body.success)throw new HttpError(400,"Choose a rink and race pace.");return json({room:await createRoom(u,body.data.map,body.data.pace,!!body.data.open)});}catch(e){return apiError(e);}}
