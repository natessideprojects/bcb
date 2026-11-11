import {currentUser} from "@/lib/api";
import {redirect,notFound} from "next/navigation";
import {Race} from "@/components/race";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!/^[0-9a-f-]{36}$/.test(id))notFound();const u=await currentUser();if(!u)redirect("/auth/sign-in?next="+encodeURIComponent("/room/"+id));return <Race key={id} id={id} user={{id:u.id,name:u.name}}/>;}
