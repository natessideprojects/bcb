import Link from "next/link";
export default function NotFound(){return <main className="error-page"><h1>This ride isn’t on the map.</h1><p>Check your invitation, or head back to the fairground.</p><Link className="button red" href="/">Back home</Link></main>;}
