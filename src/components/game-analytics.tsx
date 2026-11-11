"use client";

import {Analytics, type BeforeSend} from "@vercel/analytics/next";

const redactPage: BeforeSend = (event) => {
  const url = new URL(event.url, window.location.origin);
  url.search = "";
  url.hash = "";
  if (url.pathname.startsWith("/join/")) url.pathname = "/join";
  if (url.pathname.startsWith("/room/")) url.pathname = "/room";
  return {...event, url: url.toString()};
};

export function GameAnalytics() {
  return <Analytics beforeSend={redactPage}/>;
}
