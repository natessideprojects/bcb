export async function api<T>(url:string,body?:unknown):Promise<T>{
  const res=await fetch(url,{method:body===undefined?"GET":"POST",cache:"no-store",headers:body===undefined?{}:{"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await res.json();if(!res.ok)throw new Error(data.error||"Please try again in a moment.");return data as T;
}
