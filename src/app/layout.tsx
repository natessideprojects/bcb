import {GameAnalytics} from "@/components/game-analytics";
import {FairgroundSound} from "@/components/fairground-sound";
import type {Metadata,Viewport} from "next";
import "./globals.css";
import "./fairground.css";
import "./arena.css";
import "./prizes.css";
import localFont from "next/font/local";
const bungee=localFont({src:"../../public/fonts/Bungee-Regular.ttf",variable:"--font-carnival",display:"swap"});
const fredoka=localFont({src:"../../public/fonts/Fredoka.ttf",variable:"--font-friendly",display:"swap"});
export const metadata:Metadata={title:"Bumper Car Bash — Your private fairground",description:"Pick a card. Bump your friends. Play Bumper Car Bash in private rooms.",applicationName:"Bumper Car Bash",manifest:"/manifest.webmanifest",robots:{index:false,follow:false}};
export const viewport:Viewport={width:"device-width",initialScale:1,themeColor:"#13263d"};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en" className={`${bungee.variable} ${fredoka.variable}`}><body>{children}<FairgroundSound/><GameAnalytics/></body></html>;}
