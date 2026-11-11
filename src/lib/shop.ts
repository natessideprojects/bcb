import {db} from "./db";
import {ensureProfile} from "./profiles";
import {COSMETICS,FREE_SKINS} from "./cosmetic-catalog";
import {HttpError,type User} from "./rooms";
export async function shopState(user:User){
 await ensureProfile(user);
 const [p,owned]=await Promise.all([db`SELECT wallet,equipped_skin,equipped_mascot FROM bcb_profiles WHERE user_id=${user.id}`,db`SELECT item_id FROM bcb_inventory WHERE user_id=${user.id}`]);
 return {wallet:p[0].wallet,skin:p[0].equipped_skin as string,mascot:p[0].equipped_mascot as string|null,owned:[...FREE_SKINS,...owned.map(x=>x.item_id as string)]};
}
export async function shopAction(user:User,action:"buy"|"equip",itemId:string){
 const item=COSMETICS.find(x=>x.id===itemId);if(!item&&itemId!=="no-mascot")throw new HttpError(400,"That prize is unavailable.");
 await ensureProfile(user);
 await db.begin(async tx=>{
  const rows=await tx`SELECT wallet FROM bcb_profiles WHERE user_id=${user.id} FOR UPDATE`;
  const owned=item?.price===0||!!(await tx`SELECT item_id FROM bcb_inventory WHERE user_id=${user.id} AND item_id=${itemId}`).length;
  if(action==="buy"){
   if(!item)throw new HttpError(400,"Choose a prize.");
   if(!owned){if(rows[0].wallet<item.price)throw new HttpError(409,"Save a few more tickets for this prize.");await tx`INSERT INTO bcb_inventory(user_id,item_id,price) VALUES (${user.id},${item.id},${item.price})`;await tx`UPDATE bcb_profiles SET wallet=wallet-${item.price} WHERE user_id=${user.id}`;}
  }else{
   if(itemId!=="no-mascot"&&!owned)throw new HttpError(409,"Collect this prize before equipping it.");
   if(item?.category==="skin")await tx`UPDATE bcb_profiles SET equipped_skin=${item.id} WHERE user_id=${user.id}`;
   else await tx`UPDATE bcb_profiles SET equipped_mascot=${itemId==="no-mascot"?null:itemId} WHERE user_id=${user.id}`;
  }
 });
 return shopState(user);
}
export type ShopState=Awaited<ReturnType<typeof shopState>>;
