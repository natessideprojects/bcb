import {currentUser} from "@/lib/api";
import {redirect} from "next/navigation";
import {PrizeShop} from "@/components/prize-shop";
export const dynamic="force-dynamic";
export default async function Page(){const u=await currentUser();if(!u)redirect("/auth/sign-in?next=/shop");return <PrizeShop/>;}
