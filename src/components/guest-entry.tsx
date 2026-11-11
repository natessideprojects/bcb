"use client";
// "Play as a guest": pick a driver name and go. No email, no password.
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {ArrowRight} from "lucide-react";
import {api} from "@/lib/client-api";

const NAMES=["Corndog Kid","Funnel Cake","Taffy Twister","Ticket Taker","Midway Max","Cotton Candy","Ring Toss Rae","Kettle Korn","Ferris Fran","Bumper Bee"];
export function GuestEntry({next="/",label="Play as a guest"}:{next?:string;label?:string}){
  const router=useRouter();const [name,setName]=useState(""),[hint,setHint]=useState("Corndog Kid"),[busy,setBusy]=useState(false),[error,setError]=useState("");
  useEffect(()=>{setHint(NAMES[Math.floor(Math.random()*NAMES.length)]);},[]);
  async function go(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");try{await api("/api/guest",{name:name.trim()||hint});router.replace(next);router.refresh();}catch(err){setError((err as Error).message);setBusy(false);}}
  return <form className="guest-entry" onSubmit={go}>
    <label htmlFor="guest-name">Driver name</label>
    <div className="guest-row"><input id="guest-name" value={name} onChange={e=>setName(e.target.value)} placeholder={hint} maxLength={24} autoComplete="nickname"/><button className="button yellow" disabled={busy}>{busy?"Opening the gate…":label}<ArrowRight size={17}/></button></div>
    {error&&<p className="alert" role="alert">{error}</p>}
    <p className="fine-print">No email or password. Your races and prizes stay on this device; create an account any time to keep them everywhere.</p>
  </form>;
}
