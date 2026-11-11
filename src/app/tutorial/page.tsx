import {currentUser} from "@/lib/api";
import {Tutorial} from "@/components/tutorial";
export const dynamic="force-dynamic";
export const metadata={title:"Tutorial · Bumper Car Bash"};
export default async function Page(){const u=await currentUser("/tutorial");return <Tutorial signedIn={!!u}/>;}
