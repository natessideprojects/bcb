// Small JSON client. Every request gives up after 15 s so a stalled connection
// can never leave the game's controls stuck in a busy state.
export async function api<T>(url:string,body?:unknown,timeoutMs=15000):Promise<T>{
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeoutMs);
  try{
    const res=await fetch(url,{method:body===undefined?"GET":"POST",cache:"no-store",signal:ctrl.signal,headers:body===undefined?{}:{"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
    const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||"Please try again in a moment.");return data as T;
  }catch(e){if((e as Error).name==="AbortError")throw new Error("The fairground is slow to answer. Check your connection and try again.");throw e;}
  finally{clearTimeout(timer);}
}
