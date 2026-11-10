"use client";
import Link from "next/link";
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="error-page"><h1>A small bump in the road.</h1><p>We couldn’t open the fairground just now. Your saved races stay with your account.</p><button className="button red" onClick={reset}>Try again</button><Link href="/">Back home</Link></main>;}
