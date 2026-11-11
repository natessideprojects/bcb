import {currentUser} from "@/lib/api";
import {redirect} from "next/navigation";
import {DriverProfile} from "@/components/driver-profile";
export const dynamic="force-dynamic";
export default async function Page(){const u=await currentUser();if(!u)redirect('/auth/sign-in?next=/leaderboard');return <DriverProfile initialTab="ladder"/>;}
