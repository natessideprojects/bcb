import {auth} from "@/lib/auth/server";
import {redirect} from "next/navigation";
import {DriverProfile} from "@/components/driver-profile";
export const dynamic="force-dynamic";
export default async function Page(){const {data}=await auth.getSession();if(!data?.user)redirect('/auth/sign-in?next=/leaderboard');return <DriverProfile initialTab="ladder"/>;}
