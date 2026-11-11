"use client";
// Pick-up races: open waiting rooms anyone can join, plus Quick Match.
import {useCallback, useEffect, useRef, useState} from "react";
import {useRouter} from "next/navigation";
import {ArrowRight, Moon, Sun, Users, Zap} from "lucide-react";
import {api} from "@/lib/client-api";
import {MAPS, type MapId} from "@/lib/game/catalog";
import type {PublicRoom} from "@/lib/rooms";

type OpenRace = {id: string; map: MapId; pace: "quick" | "relaxed"; title: string; host: string; drivers: number; people: number; startsAt: number | null; now: number; mine: boolean};

export function OpenRaces() {
  const router = useRouter();
  const [rooms, setRooms] = useState<OpenRace[] | null>(null), [busy, setBusy] = useState(""), [error, setError] = useState(""), [, setTick] = useState(0);
  const skew = useRef(0);
  const load = useCallback(async () => {
    try {
      const r = await api<{rooms: OpenRace[]}>("/api/rooms/open");
      if (r.rooms[0]) skew.current = r.rooms[0].now - Date.now();
      setRooms(r.rooms);
    } catch (e) { setError((e as Error).message); setRooms(old => old ?? []); }
  }, []);
  useEffect(() => {
    const pull = () => { if (document.visibilityState === "visible") void load(); };
    pull();
    const list = setInterval(pull, 8000), clock = setInterval(() => setTick(n => n + 1), 1000);
    document.addEventListener("visibilitychange", pull);
    return () => { clearInterval(list); clearInterval(clock); document.removeEventListener("visibilitychange", pull); };
  }, [load]);

  async function go(kind: string, path: string, body: object) {
    setBusy(kind); setError("");
    try { const r = await api<{room: PublicRoom}>(path, body); router.push("/room/" + r.room.id); }
    catch (e) { setError((e as Error).message); setBusy(""); void load(); }
  }
  const status = (r: OpenRace) => {
    if (!r.startsAt) return r.people < 2 ? "Waiting for drivers" : "Getting ready";
    const left = Math.max(0, Math.ceil((r.startsAt - (Date.now() + skew.current)) / 1000));
    return left ? `Starts in ${left}s` : "Starting…";
  };

  return (
    <section className="open-races" aria-labelledby="open-races-title">
      <div className="section-heading races-heading">
        <div><span className="eyebrow">PICK-UP RACES</span><h2 id="open-races-title">Race with anyone</h2></div>
        <button className="button yellow" disabled={!!busy} onClick={() => void go("quick", "/api/rooms/quick", {})}><Zap size={18}/> {busy === "quick" ? "Finding a seat…" : "Quick Match"}</button>
      </div>
      <p className="subtle open-note">Quick Match drops you into the fullest open race, or opens a new Quick race for others to join. Open races start by themselves 60 seconds after a second driver joins.</p>
      {error && <p className="alert" role="alert">{error}</p>}
      {rooms === null ? <div className="empty-state">Looking for open races…</div>
        : rooms.length ? <div className="race-list">{rooms.map(r => (
          <article key={r.id} className="race-link open-race">
            <span className={`race-map-icon ${r.map}`}>{r.map === "day" ? <Sun/> : <Moon/>}</span>
            <span className="race-title"><strong>{r.title} · {MAPS[r.map].name}</strong><span>Hosted by {r.host} · {r.drivers} of 6 drivers</span></span>
            <span className={`status-pill lobby ${r.startsAt ? "counting" : ""}`}>{status(r)}</span>
            <button className="button small navy" disabled={!!busy} onClick={() => r.mine ? router.push("/room/" + r.id) : void go(r.id, "/api/rooms/open", {roomId: r.id})}>
              {r.mine ? "Back to it" : busy === r.id ? "Joining…" : "Join"} <ArrowRight size={15}/>
            </button>
          </article>
        ))}</div>
        : <div className="empty-state"><Users size={30}/><strong>No open races right now.</strong><p>Press Quick Match to open one. Anyone who comes along will find it here.</p></div>}
    </section>
  );
}
