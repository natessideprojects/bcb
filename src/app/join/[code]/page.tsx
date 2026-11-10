import {auth} from "@/lib/auth/server";
import {redirect,notFound} from "next/navigation";
import {Join} from "@/components/join";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{code:string}>}){const {code}=await params;if(!/^[A-Fa-f0-9]{16}$/.test(code))notFound();const {data}=await auth.getSession();if(!data?.user)redirect("/auth/sign-in?next="+encodeURIComponent("/join/"+code));return <Join code={code.toUpperCase()} name={data.user.name||"Driver"}/>;}
