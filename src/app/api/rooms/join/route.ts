import {z} from "zod";
import {requireUser,sameOrigin,json} from "@/lib/api";
import {joinRoom,apiError,HttpError} from "@/lib/rooms";
export async function POST(req:Request){try{sameOrigin(req);const u=await requireUser();const body=await req.json();const code=z.string().transform(s=>s.replace(/[\s-]/g,"").toUpperCase()).pipe(z.string().regex(/^[A-F0-9]{16}$/)).safeParse(body.code);if(!code.success)throw new HttpError(400,"Enter the complete 16-character room code.");return json({room:await joinRoom(u,code.data)});}catch(e){return apiError(e);}}
