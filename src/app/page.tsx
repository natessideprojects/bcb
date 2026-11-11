import {currentUser} from "@/lib/api";
import {Home} from "@/components/home";
export const dynamic="force-dynamic";
export default async function Page(){const u=await currentUser();return <Home user={u?{id:u.id,name:u.name,guest:!!u.guest}:null}/>;}
