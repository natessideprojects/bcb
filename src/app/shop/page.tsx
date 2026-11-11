import {auth} from "@/lib/auth/server";
import {redirect} from "next/navigation";
import {PrizeShop} from "@/components/prize-shop";
export const dynamic="force-dynamic";
export default async function Page(){const {data}=await auth.getSession();if(!data?.user)redirect("/auth/sign-in?next=/shop");return <PrizeShop/>;}
