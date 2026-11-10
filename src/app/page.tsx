import {auth} from "@/lib/auth/server";
import {Home} from "@/components/home";
export const dynamic="force-dynamic";
export default async function Page(){const {data}=await auth.getSession();return <Home user={data?.user?{id:data.user.id,name:data.user.name||"Driver"}:null}/>;}
