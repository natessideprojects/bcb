import {Suspense} from "react";
import {notFound} from "next/navigation";
import {AuthForm,type AuthMode} from "@/components/auth-form";
export default async function Page({params}:{params:Promise<{mode:string}>}){const {mode}=await params;if(!["sign-in","sign-up","forgot-password","reset-password"].includes(mode))notFound();return <Suspense fallback={<p className="loading-page">Opening the ticket booth…</p>}><AuthForm mode={mode as AuthMode}/></Suspense>;}
