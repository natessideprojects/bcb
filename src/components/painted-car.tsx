import {useId} from "react";

type Wrap = {
  colors: [string, string, string];
  motif: "stripe" | "tread" | "flame" | "rust" | "flower" | "swirl" | "dot" | "tile" | "scale" | "star" | "wave" | "panel";
  badge?: string;
};

const wraps: Record<string, Wrap> = {
  rocket: {colors: ["#cad8e4", "#d54641", "#e9faff"], motif: "panel", badge: "porthole"},
  monster: {colors: ["#72c932", "#263b20", "#e1fc87"], motif: "tread"},
  flame: {colors: ["#ad182f", "#ff9a23", "#fff078"], motif: "flame"},
  rust: {colors: ["#683e2e", "#c47b3e", "#b7c0bf"], motif: "rust"},
  flower: {colors: ["#7849b4", "#fff1cf", "#ffcb35"], motif: "flower", badge: "peace"},
  "tie-dye": {colors: ["#f071b5", "#46d4cd", "#ffdc68"], motif: "swirl", badge: "peace"},
  ufo: {colors: ["#403b83", "#68ddcf", "#dafdf5"], motif: "panel", badge: "orbit"},
  popcorn: {colors: ["#da3a46", "#fff1c3", "#ffd55d"], motif: "stripe", badge: "popcorn"},
  cotton: {colors: ["#e977ae", "#82d6f5", "#fff0f8"], motif: "wave"},
  disco: {colors: ["#7588af", "#c6daf5", "#f4fbff"], motif: "tile"},
  pirate: {colors: ["#342948", "#c99c47", "#f4e7bf"], motif: "panel", badge: "skull"},
  shark: {colors: ["#316a92", "#8dc6db", "#f4f6ed"], motif: "wave", badge: "shark"},
  dragon: {colors: ["#237f53", "#83bc59", "#f2cd69"], motif: "scale"},
  ladybug: {colors: ["#d62c47", "#262332", "#ff8590"], motif: "dot"},
  bee: {colors: ["#ffcb41", "#2c2833", "#ffe98f"], motif: "stripe"},
  watermelon: {colors: ["#ec5871", "#65c070", "#244030"], motif: "wave", badge: "seeds"},
  lightning: {colors: ["#234cb7", "#5abff9", "#fff17c"], motif: "panel", badge: "bolt"},
  steampunk: {colors: ["#9b552c", "#e3ab61", "#ffd48c"], motif: "panel", badge: "gear"},
  space: {colors: ["#32236f", "#8054cb", "#e5e9ff"], motif: "star"},
  glow: {colors: ["#26284e", "#32dbd6", "#ff78dc"], motif: "panel"},
  candycorn: {colors: ["#ffb72e", "#f47928", "#fff3d0"], motif: "stripe"},
  checker: {colors: ["#eee8d8", "#293246", "#d63e43"], motif: "tile", badge: "number"},
  unicorn: {colors: ["#e9b9ef", "#8bd8f2", "#ffeda8"], motif: "wave"},
  gold: {colors: ["#cf9329", "#fce18c", "#fff6c7"], motif: "panel", badge: "ribbon"},
};

function WrapPattern({wrap}: {wrap: Wrap}) {
  const [base, accent, detail] = wrap.colors;
  switch (wrap.motif) {
    case "stripe":
      return <><path d="M0 0H8V20H0Z" fill={accent}/><path d="M8 0H10V20H8Z" fill={detail}/></>;
    case "tread":
      return <path d="M2 1L8 5L2 9M2 11L8 15L2 19M12 1L18 5L12 9M12 11L18 15L12 19" fill="none" stroke={accent} strokeWidth="3"/>;
    case "flame":
      return <><path d="M0 20V4C5 10 5 1 8 0C7 10 14 7 14 14C16 13 18 8 20 7V20Z" fill={accent}/><path d="M1 20V13Q7 17 8 8Q11 17 15 17L20 14V20Z" fill={detail}/></>;
    case "rust":
      return <><path d="M0 2L6 0L9 4L6 8L0 6M12 12L20 9V18L15 20L11 17" fill={accent}/><path d="M8 10L15 7L16 11L10 14Z" fill={detail} opacity=".66"/><circle cx="9" cy="11" r=".8" fill={base}/></>;
    case "flower":
      return <g transform="translate(10 10)">{[0, 60, 120].map(angle => <ellipse key={angle} rx="2.3" ry="7" transform={`rotate(${angle})`} fill={accent}/>)}<circle r="2.4" fill={detail}/></g>;
    case "swirl":
      return <><path d="M-5 17C4 -4 18 -5 22 6S13 22 7 17S7 5 14 6" fill="none" stroke={accent} strokeWidth="5"/><path d="M-4 15C4 1 18 0 19 7S13 18 9 15" fill="none" stroke={detail} strokeWidth="2.5"/></>;
    case "dot":
      return <><circle cx="6" cy="6" r="3.5" fill={accent}/><circle cx="15" cy="15" r="3.5" fill={accent}/></>;
    case "tile":
      return <><path d="M0 0H10V10H0ZM10 10H20V20H10Z" fill={accent}/>{base !== "#eee8d8" && <path d="M0 0H20M0 0V20M10 0V20M0 10H20" fill="none" stroke={detail} strokeWidth=".7"/>}</>;
    case "scale":
      return <path d="M0 0Q0 8 5 10Q10 8 10 0Q10 8 15 10Q20 8 20 0M0 10Q5 13 5 20Q10 18 10 10Q10 18 15 20Q20 18 20 10" fill="none" stroke={accent} strokeWidth="1.5"/>;
    case "star":
      return <><path d="M1 13Q9 -1 20 6" fill="none" stroke={accent} strokeWidth="6"/><path d="M9 3L10 6L13 7L10 8L9 11L8 8L5 7L8 6Z" fill={detail}/><circle cx="17" cy="15" r="1" fill={detail}/></>;
    case "wave":
      return <><path d="M-2 8Q4 1 10 8T22 8M-2 17Q4 10 10 17T22 17" fill="none" stroke={accent} strokeWidth="6"/><path d="M-2 9Q4 2 10 9T22 9" fill="none" stroke={detail} strokeWidth="1.4" opacity=".8"/></>;
    case "panel":
      return <><path d="M1 0V20M0 16H20" fill="none" stroke={accent} strokeWidth="1.4"/><path d="M4 0V20" stroke={detail} strokeWidth=".7"/><circle cx="3.2" cy="13.5" r="1" fill={accent}/><circle cx="17.4" cy="13.5" r="1" fill={accent}/></>;
  }
}

function HoodBadge({badge}: {badge: string}) {
  return <g transform="translate(42 53) rotate(-15) skewX(-13)" strokeLinejoin="round">
    {badge === "peace" && <g fill="none" stroke="#fff6da" strokeWidth="1.25"><circle r="5.5"/><path d="M0-5.5V5.5M0 0L-4 3.7M0 0L4 3.7"/></g>}
    {badge === "porthole" && <><ellipse rx="6.5" ry="4.8" fill="#243f60" stroke="#ebf5fb" strokeWidth="1.1"/><ellipse rx="4.5" ry="3" fill="#56bdde"/><path d="M-3 0Q-2-2 1-2" stroke="#d8faff" fill="none"/></>}
    {badge === "orbit" && <g fill="none" stroke="#d6ffef"><ellipse rx="7" ry="2.8" transform="rotate(-20)"/><circle r="3.5"/></g>}
    {badge === "popcorn" && <g fill="#ffe380" stroke="#a95529" strokeWidth=".65"><circle cx="-3" cy="1" r="2.8"/><circle cy="-2" r="3.5"/><circle cx="3" cy="1" r="2.8"/></g>}
    {badge === "skull" && <><path d="M-4 4L4-4M4 4L-4-4" stroke="#ffe9b0" strokeWidth="2"/><path d="M-4 0A4 4 0 1 1 4 0L2 2V4H-2V2Z" fill="#fff0cb"/><path d="M-2-1H-1M1-1H2" stroke="#352a48"/></>}
    {badge === "shark" && <path d="M-7 2Q0-6 6-2L4 0L6 2Q0 6-7 2L-9 4L-9-2Z" fill="#f4fbff" stroke="#315570" strokeWidth=".7"/>}
    {badge === "seeds" && <path d="M-5-2Q-1 3-4 4Q-7 4-5-2M0-4Q4 1 1 2Q-2 2 0-4M5-1Q9 4 6 5Q3 5 5-1" fill="#253c2b"/>}
    {badge === "bolt" && <path d="M2-7L-6 1H-1L-3 7L7-2H2Z" fill="#fff38b" stroke="#355586" strokeWidth=".8"/>}
    {badge === "gear" && <g fill="none" stroke="#ffe0a0" strokeWidth="1.5"><circle r="4"/><circle r="1.5"/>{[0,45,90,135].map(angle => <path key={angle} d="M-6 0H-4M4 0H6" transform={`rotate(${angle})`}/>)}</g>}
    {badge === "number" && <><circle r="5.5" fill="#bc2837"/><path d="M-1.5-2L0-3V3M-2 3H2" fill="none" stroke="#fff3d4" strokeWidth="1.25"/></>}
    {badge === "ribbon" && <><path d="M-3 1L-5 6L0 4L5 6L3 1" fill="#1747a7"/><circle r="4.8" fill="#285ac5" stroke="#fff0ac"/><path d="M0-2.7L.8-.8L3-.5L1.3.8L1.8 2.8L0 1.7L-1.8 2.8L-1.3.8L-3-.5L-.8-.8Z" fill="#fff0ac"/></>}
  </g>;
}

const sprite = "/bumper-cars-v2.png";
const blueSprite = {href: sprite, x: -100, width: 400, height: 200, preserveAspectRatio: "none"} as const;
const filterRegion = {x: 0, y: 0, width: 100, height: 100, filterUnits: "userSpaceOnUse", colorInterpolationFilters: "sRGB"} as const;

export function PaintedCar({theme, color}: {theme: string; color: string}) {
  const id = useId();
  const wrap = wraps[theme] ?? {colors: [color, color, color], motif: "panel"};
  const region = `${id}-body`;
  const paint = `${id}-paint`;
  const shadow = `${id}-shadow`;
  const shine = `${id}-shine`;
  const mask = `${id}-mask`;
  const pattern = `${id}-wrap`;

  return <svg x="0" y="3" width="64" height="64" viewBox="0 0 100 100" overflow="hidden" aria-hidden="true">
    <defs>
      {/* Limit the paint to the original hood and side panels. The sprite's blue
          paint then supplies a second mask around lamps, trim, and upholstery. */}
      <clipPath id={region}>
        <path d="M12 67Q12 47 29 42L42 41Q46 25 59 25Q77 23 84 35Q91 47 90 61Q89 68 82 71Q70 79 57 80L25 79Q14 77 12 67Z"/>
      </clipPath>
      <filter id={paint} {...filterRegion}>
        <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -12 0 12 0 -.55" result="blueOverRed"/>
        <feColorMatrix in="SourceGraphic" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 -11 11 0 -.20" result="blueOverGreen"/>
        <feComposite in="blueOverRed" in2="blueOverGreen" operator="in"/>
        <feComposite in2="SourceAlpha" operator="in"/>
      </filter>
      <filter id={shadow} {...filterRegion}>
        <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -.09 -.27 -.57 0 .94"/>
      </filter>
      <filter id={shine} {...filterRegion}>
        <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  .65 .48 .09 0 -.60"/>
      </filter>
      <mask id={mask} x="0" y="0" width="100" height="100" maskUnits="userSpaceOnUse" style={{maskType: "alpha"}}>
        <image {...blueSprite} filter={`url(#${paint})`}/>
      </mask>
      <pattern id={pattern} width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(-17 45 56) skewX(-18)">
        <rect width="20" height="20" fill={wrap.colors[0]}/>
        <WrapPattern wrap={wrap}/>
      </pattern>
    </defs>
    <image {...blueSprite}/>
    <g clipPath={`url(#${region})`} mask={`url(#${mask})`}>
      <rect width="100" height="100" fill={`url(#${pattern})`}/>
      {wrap.badge && <HoodBadge badge={wrap.badge}/>}
      <image {...blueSprite} filter={`url(#${shadow})`}/>
      <image {...blueSprite} filter={`url(#${shine})`}/>
    </g>
  </svg>;
}
