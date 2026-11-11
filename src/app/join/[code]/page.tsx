import {currentUser} from "@/lib/api";
import {redirect,notFound} from "next/navigation";
import {Join} from "@/components/join";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{code:string}>}){const {code}=await params;if(!/^[A-Fa-f0-9]{16}$/.test(code))notFound();const u=await currentUser("/join/"+code);if(!u)redirect("/auth/sign-in?next="+encodeURIComponent("/join/"+code));return <Join code={code.toUpperCase()} name={u.name}/>;}
