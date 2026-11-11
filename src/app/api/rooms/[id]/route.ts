import {z} from "zod";
import {requireUser,sameOrigin,json} from "@/lib/api";
import {readRoom,mutateRoom,apiError,rate,HttpError} from "@/lib/rooms";
const policy=z.object({dead:z.enum(["pay","skip"]),karma:z.enum(["use","hold"]),daddy:z.enum(["intercept","escape","hold"]),bash:z.enum(["strongest","double","triple","hold"])});
const schema=z.discriminatedUnion("action",[
 z.object({action:z.literal("ready"),ready:z.boolean()}),z.object({action:z.literal("bot")}),
 z.object({action:z.literal("remove"),playerId:z.string().min(1).max(100)}),z.object({action:z.literal("start")}),
 z.object({action:z.literal("pick"),round:z.number().int().positive(),pick:z.object({primary:z.string().max(30),extra:z.string().max(30).optional(),boost:z.string().max(30).optional()})}),
 z.object({action:z.literal("drawMidway"),round:z.number().int().positive()}),z.object({action:z.literal("placeMidway"),round:z.number().int().positive(),cardId:z.string().max(40)}),
 z.object({action:z.literal("policy"),policy}),z.object({action:z.literal("close")}),z.object({action:z.literal("leave")})
]);
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
export async function GET(req:Request,context:Context){try{const u=await requireUser();await rate(u.id,"read",60);const {id}=await context.params;if(!z.uuid().safeParse(id).success)throw new HttpError(404,"Room not found.");return json({room:await readRoom(u.id,id)});}catch(e){return apiError(e);}}
export async function POST(req:Request,context:Context){try{sameOrigin(req);const u=await requireUser();await rate(u.id,"command",60);const {id}=await context.params;if(!z.uuid().safeParse(id).success)throw new HttpError(404,"Room not found.");const cmd=schema.safeParse(await req.json());if(!cmd.success)throw new HttpError(400,"That game action is invalid.");return json({room:await mutateRoom(u.id,id,cmd.data)});}catch(e){return apiError(e);}}
