"use client";
import {useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {ArrowRight,Ticket} from "lucide-react";
import {Brand,Car} from "./brand";
import {api} from "@/lib/client-api";
import type {PublicRoom} from "@/lib/rooms";
export function Join({code,name}:{code:string;name:string}){const router=useRouter();const[error,setError]=useState(""),[busy,setBusy]=useState(false);async function join(){setBusy(true);try{const r=await api<{room:PublicRoom}>("/api/rooms/join",{code});router.replace("/room/"+r.room.id);}catch(e){setError((e as Error).message);setBusy(false);}}return <main className="invitation-page"><Brand/><section className="invitation-ticket"><Ticket size={34}/><span className="eyebrow">ADMIT ONE DRIVER</span><h1>You’re invited, {name.split(" ")[0]}.</h1><p>A private race is waiting on the other side of this ticket.</p><Car color="#eab53b"/><div className="invite-code">{code.match(/.{1,4}/g)?.join(" – ")}</div>{error&&<p className="alert" role="alert">{error}</p>}<button className="button red full" onClick={join} disabled={busy}>{busy?"Finding your seat…":"Join this private room"}<ArrowRight size={18}/></button><Link href="/">Back to the fairground</Link></section></main>;}
