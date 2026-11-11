# Bumper Car Bash — private web playtest

Live game: https://bumper-car-bash.vercel.app

A responsive Next.js app with managed Neon email/password login, invitation-only rooms, saved multiplayer races, optional bot drivers, and server-resolved rules 3.4. The deck contains 37 cards representing 20 effects, including the newly supplied PDF page 4. Double Bash doubles the opponent's knockback die before Condition bonuses.

## Local use

Use Node 24 or later. Install with `npm install`, link the existing Vercel project, and pull its environment into `.env.local`. Required values are `DATABASE_URL`, `NEON_AUTH_BASE_URL`, and `NEON_AUTH_COOKIE_SECRET`. Keep environment files out of source control. Run `npm run db:setup` only against the intended linked database, then `npm run dev`.

Checks: `npm run typecheck`, `npm test`, `npm run build`. `scripts/smoke-api.mjs` exercises genuine managed authentication and a complete private multiplayer game using synthetic QA accounts; it creates test records and stores its account details in ignored `work/`. Do not publish that folder.

## Artwork

The interface follows the design guide and tabletop concept: Bungee display lettering, Fredoka body text, popcorn cream, candy red, midway blue, yellow, mint and purple; county-fair lighting, glossy bumper car sprites, illustrated hazards, cream cards and marquee signs. Both fonts are self-hosted and their OFL licenses are in `public/fonts/`.

`public/tabletop-concept.png` is the concept illustration. `fairground-board-v2.png` and `bumper-cars-v2.png` are generated game assets based on that concept. The functional track, numbers, hazards, statuses, deck counts and card text are drawn by the app from actual game state. The concept illustration's printed numbers are illustrative.

## Playtest limits

Rooms require a driver: either a signed-in account or a guest. Guest play needs no sign-up: a visitor picks a driver name and gets a random `guest-…` id in a signed, HttpOnly cookie (HMAC keyed from `NEON_AUTH_COOKIE_SECRET`, 90 days). Guests can host, join invitations and use the Prize Booth; their progress stays in that browser and they are kept off the public ladder. A secret invitation admits another driver while the lobby is open. Hidden cards and pending picks are filtered on the server. Round commands are serialized in database transactions. A host can add bots, remove waiting guests, and start after everyone is ready.

`/tutorial` is a two-minute scripted race on the real rink and replay engine. Each bubble waits for Next (or Enter/Space/→); Auto-play moves on by itself after a generous reading time. Speech bubbles explain picking, flags and the Flag 1 no-draw rule, bashes and the ticket swap, knockback, tickets, all three hazards, Rusty, Doubles, Midway boosts and instants, laps, the Rusty bounty and Rink Conditions. Sauron Bash lasts one round per driver in the race (2 rounds with 2 drivers, 3 with 3, and so on); landing a direct bash breaks it early.

Free Vercel Hobby and Neon plans were selected; free-tier quotas still apply. Deadlines catch up on the next member request. There are no push notifications, public matchmaking or paid upgrades. Bots make basic choices; human balance and usability testing remain necessary.


## Rules 3.4 update

New races use a 16-section rink (hidden per-colour car routes plus the mini-track) and six starting Speed Cards in both paces, as Nathan confirmed. Everyone eligible except Flag 1 still draws one replacement at cleanup; a last-card play latches the final round. Stalled drivers do not draw. Previously saved races retain their original track and hand size. Rusty starts at 8 and a Rusty bounty jumps him half of the 16-section rink. The shorter maps are declared in `gameMap`.

Tickets (Nov 2026 audit): a bash is a ticket swap. The bashed car hands 1 ticket (2 under Blue Ribbon Judging) to the driver whose move caused the hit; in a chain reaction every car hit pays that driver, and the bank covers a victim with no tickets. Rusty takes 1 ticket from anyone he hits and keeps it. A Speed Card landing on Rusty pays a 2-ticket bounty from the bank. Only the moving driver spends Bash cards or breaks Sauron's curse; a car knocked into someone never does. Every ticket event in the replay carries the new total, and `tests/engine.test.ts` replays 120 random races to check that each round's events account for every ticket change.

No hostages: when a pick timer runs out, every driver who hasn't locked in gets their lowest Speed Card played and the round resolves. Any seated driver's page load or 4-second poll enforces it (`readRoom` ticks expired rooms), and Midway draws place themselves the same way. Auto-picked cards show a ⏱ on the reveal tray.

Driver numbers: every driver gets a number from 1 to 6 when the race starts (their seat) and keeps it all game. Players are identified by that number, never by colour, because a Prize Booth skin can change a car's colour. The number is on the car badge, the reveal tray, the lineup ("Driver 2"), the hand panel ("DRIVER 3"), the waiting room and the play-by-play. Playback names who each thing happens to: a play-by-play line in the rink's centre island (in the hand panel on phones), Flag 1, 2, 3… tags on the reveal tray, each car's last-round flag in the lineup, and live ticket counts as tickets change hands. The announcer calls drivers by number too: "Driver two!" + "BASH!", "Driver three!" + "Pay up!", "We've got a new leader!" + "Driver one!", "Driver two!" + "You win the Blue Ribbon!". The 7 clips (`who_1`–`who_6`, `pay_up`) were cut from Nate's ElevenLabs take of `scripts/audio/driver-callouts-elevenlabs.txt`. The old colour lines ("Red takes the lead!", "Red wins the Blue Ribbon!") were retired because a skin can change a car's colour.

Quick races have a 60-second pick allowance plus an automatically calculated presentation buffer for the preceding server-resolved replay. Friends races retain 24 hours. The client can speed up or skip the show; animations never decide the game result. Structured replay events contain only public card reveals, actual travel paths, bashes, card actions and draw counts.

Profiles and result receipts live in Postgres. Final scores, wallet awards, statistics and standings are credited in the same transaction as a finished race, with a unique room/player receipt preventing duplicate awards. Only completed 3.4 races count. Synthetic QA accounts are excluded from standings. The current ladder is a playtest points table; private bot practice counts and this is not skill matchmaking. The Prize Booth exchanges earned tickets for cosmetic skins and passengers; there are no money payments.

Audio is hosted with the game: Nathan-supplied Fairground Fun music, crowd recordings and ElevenLabs announcer clips, with trimmed FilmCow effects. Sound effects source: https://filmcow.itch.io/filmcow-sfx. No paid generator or recurring audio API is required. Sound begins only after the player's explicit enable gesture. Music, effects, voice and animation speed are separately adjustable; hiding the tab pauses the sound and skips the visual replay. Reduced motion defaults to no animation.


## Player mat and Prize Booth release

Every driver in a new room first claims one saved starter card, usable in round 1. Additional interactive Midway draws happen after movement: click the stack, reveal and hear the card, then place it on the mat. Instant cards resolve on placement; saved cards can be opened to inspect or selected for a BOOST. All pending draws settle before final scoring. Bots and expired turns place cards automatically. Existing saved races retain their prior automatic-draw behavior.

The store at /shop has 30 skins (six free colors plus 24 ticket prizes) and 12 passengers. Preview combinations before spending. Purchases are server-priced, serialized under a profile lock and recorded once. Equipped looks appear in newly started races. Run db:setup for the additive inventory/equipment migration when setting up another environment. See PRIZE-BOOTH-DESIGN.md for card ordering, source research and future cosmetic effects.

Validation includes 100 legacy and 100 interactive complete-game simulations, all 20 event actions, genuine multiplayer authentication/privacy/scoring, free equipment and purchase rejection checks. scripts/smoke-shop.mjs additionally funds ONLY an existing synthetic QA account, then tests concurrent paid-ticket purchases and race loadouts. Never run that test with a real user account.
