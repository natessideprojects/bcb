import {cosmetic} from "@/lib/cosmetic-catalog";

// Prize Booth passengers: glossy cut-out sprites in public/passengers/<id>.webp,
// cut from Nate's Gemini sprite sheet (scripts/art/cut_passengers.py).
const ART = new Set(["balloon-dog", "goldfish", "teddy", "alien", "duck", "frog", "unicorn-pal", "monkey", "dino", "penguin", "robot", "bee-pal"]);

export function MascotArt({id, ...props}: {id: string} & React.SVGProps<SVGSVGElement>) {
  const m = cosmetic(id);
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={m?.name || "Passenger"} {...props}>
      {ART.has(id)
        ? <image href={`/passengers/${id}.webp`} width="64" height="64" preserveAspectRatio="xMidYMax meet"/>
        : <circle cx="32" cy="36" r="20" fill={m?.color || "#efb24f"} stroke="#23364d" strokeWidth="2.3"/>}
    </svg>
  );
}
