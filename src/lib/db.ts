import postgres from "postgres";
const globalDb=globalThis as unknown as {bcbDb?:ReturnType<typeof postgres>};
export const db=globalDb.bcbDb??postgres(process.env.DATABASE_URL!,{ssl:process.env.PGSSLMODE==="disable"?false:{rejectUnauthorized:true},max:3,idle_timeout:5,connect_timeout:15,prepare:false});
if(process.env.NODE_ENV!=="production")globalDb.bcbDb=db;
