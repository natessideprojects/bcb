export type EventKind = `M${string}`;
export const EVENTS = {
  M01: {name:"Honey I Shrunk the Car", type:"INSTANT", count:3, icon:"shrink", text:"Take the mini-track. Grow after a bash or one net forward lap."},
  M02: {name:"Lead Foot Bash", type:"INSTANT", count:2, icon:"zap", text:"Move one space past the leader and bash the drivers you pass. If you’re already leading, take a full lap and bash every opponent."},
  M03: {name:"Power Surge", type:"INSTANT", count:3, icon:"zap", text:"Every driver travels forward 3, in flag order. Every car bashed along the way pays you."},
  M04: {name:"Power Outage", type:"INSTANT", count:3, icon:"plug", text:"Every driver exchanges their highest unplayed Speed Card."},
  M05: {name:"Distracted Carnie", type:"BOOST", count:3, icon:"ticket", text:"Add your lowest additional Speed Card to this move. Spend both cards."},
  M06: {name:"Crazy Wheels", type:"INSTANT", count:2, icon:"swirl", text:"Stall, and catch any car that drives into your section in a pile-up. Roll 4–6 at the start of a round to drive free."},
  M07: {name:"Safety Violation", type:"INSTANT", count:2, icon:"flag", text:"Return to your Start Grid bay. No crossings, hazards, or lap tickets."},
  M08: {name:"Disco Bash", type:"INSTANT", count:4, icon:"sparkles", text:"Exchange up to two highest unplayed Speed Cards."},
  M09: {name:"Groundhog Day", type:"BOOST", count:2, icon:"repeat", text:"Play two Speed Cards. Make two separate moves, primary card first."},
  M10: {name:"It’s One Louder", type:"BOOST", count:2, icon:"gauge", text:"Your primary Speed Card moves 11, before the Condition modifier."},
  M11: {name:"Karma Bash", type:"DEFENSE", count:2, icon:"shield", text:"After a bash, take the same knockback forward instead of backward. The hit still counts, so you still hand over the ticket."},
  M12: {name:"Daddy Take the Wheel", type:"DEFENSE", count:1, icon:"shield", text:"Avoid one pile-up, or clear your own stall at the start of a round."},
  M13: {name:"Token Machine Malfunction", type:"INSTANT", count:1, icon:"ticket", text:"Collect 1 race ticket from the bank."},
  M14: {name:"Hungry Seat", type:"INSTANT", count:1, icon:"ticket", text:"Lose 1 race ticket to the bank. Your count can’t go below zero."},
  M15: {name:"Kid Vomit", type:"INSTANT", count:1, icon:"pause", text:"Skip your next Speed Card round. Still draw unless also stalled."},
  M16: {name:"Super Bash", type:"BASH", count:1, icon:"zap", text:"After you bash one opponent, triple their knockback distance before Condition bonuses."},
  M17: {name:"Double Bash", type:"BASH", count:1, icon:"zap", text:"After you bash one opponent, double their knockback distance before Condition bonuses."},
  M18: {name:"Rain Delay", type:"INSTANT", count:1, icon:"drop", text:"Exchange everyone’s unplayed hand. Reset Speed and Midway draw/discard decks; keep held events."},
  M19: {name:"Sauron Bash", type:"INSTANT", count:1, icon:"eye", text:"Cursed for one round per driver in the race: your Speed move only counts if it lands a direct bash. Otherwise stay put and spend the card. Landing a bash breaks the curse early."},
  M20: {name:"Welcome to Oz", type:"INSTANT", count:1, icon:"swirl", text:"Reverse the rink’s driving direction. Leave every car on its current space."},
} as const;
export type EventId = keyof typeof EVENTS;
export const CONDITIONS = {
  surge:{name:"Power Surge Hour",text:"Every Speed Card movement gets +1.",icon:"zap"},
  brownout:{name:"Brownout",text:"Every Speed Card movement gets −1, minimum 1.",icon:"plug"},
  rain:{name:"Rain on the Rink",text:"Grease slides you 4 instead of 2.",icon:"drop"},
  rampage:{name:"Rusty’s Rampage",text:"Rusty takes two moves this round.",icon:"car"},
  overdrive:{name:"Tilt-A-Whirl Overdrive",text:"Tilt spins move 5 instead of 3.",icon:"swirl"},
  judging:{name:"Blue Ribbon Judging",text:"A driver’s bash costs the victim 2 tickets. Rusty still takes 1, and his bounty stays 2.",icon:"award"},
  fireworks:{name:"Fireworks Show",text:"Doubles draw 2 Midway cards per driver.",icon:"sparkles"},
  bumper:{name:"Bumper-to-Bumper",text:"Bash knockback gets +2 spaces.",icon:"car"},
  lights:{name:"Lights Out",text:"No BOOST cards this round. Defenses still work.",icon:"plug"},
  inspector:{name:"Ride Inspector",text:"Dead Zones cost 2 tickets or a skipped round.",icon:"ticket"},
  free:{name:"Free Ride Friday",text:"Dead Zones are switched off. Existing skips remain.",icon:"ticket"},
  prize:{name:"Prize Wheel",text:"When this sign flips up, every driver tied for last place collects 2 tickets.",icon:"award"},
} as const;
export type Condition = keyof typeof CONDITIONS;
export const PAINTS=["#ec4c3e","#2d88c9","#eab53b","#3b9e7b","#ea833c","#a16ab7"];
export const MAPS = {
  day:{name:"Day Fair",grease:[4,18],tilt:[8,22],dead:[12,26]},
  night:{name:"Night Midway",grease:[6,20],tilt:[10,24],dead:[2,16]},
};
export type MapId=keyof typeof MAPS;
export type Policy={dead:"pay"|"skip";karma:"use"|"hold";daddy:"intercept"|"escape"|"hold";bash:"strongest"|"double"|"triple"|"hold"};
export const DEFAULT_POLICY:Policy={dead:"pay",karma:"use",daddy:"intercept",bash:"strongest"};
