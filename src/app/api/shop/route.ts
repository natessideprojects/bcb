import {z} from "zod";
import {requireUser,sameOrigin,json} from "@/lib/api";
import {rate,apiError,HttpError} from "@/lib/rooms";
import {shopState,shopAction} from "@/lib/shop";
export const dynamic="force-dynamic";
export async function GET(){try{const u=await requireUser();await rate(u.id,"shop",40);return json({shop:await shopState(u)});}catch(e){return apiError(e);}}
export async function POST(req:Request){try{sameOrigin(req);const u=await requireUser();await rate(u.id,"shop-edit",40);const p=z.object({action:z.enum(["buy","equip"]),itemId:z.string().max(50)}).strict().safeParse(await req.json());if(!p.success)throw new HttpError(400,"Choose a prize and an action.");return json({shop:await shopAction(u,p.data.action,p.data.itemId)});}catch(e){return apiError(e);}}
