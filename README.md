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

Rooms require a signed-in member; a secret invitation admits another signed-in player while the lobby is open. Hidden cards and pending picks are filtered on the server. Round commands are serialized in database transactions. A host can add bots, remove waiting guests, and start after everyone is ready.

Free Vercel Hobby and Neon plans were selected; free-tier quotas still apply. Deadlines catch up on the next member request. There are no push notifications, public matchmaking or paid upgrades. Bots make basic choices; human balance and usability testing remain necessary.


## Rules 3.4 update

New races use a 16-section rink (hidden per-colour car routes plus the mini-track) and six starting Speed Cards in both paces, as Nathan confirmed. Everyone eligible except Flag 1 still draws one replacement at cleanup; a last-card play latches the final round. Stalled drivers do not draw. Previously saved races retain their original track and hand size. Rusty starts at 8 and a Rusty bounty jumps him half of the 16-section rink. The shorter maps are declared in `gameMap`.

Quick races have a 60-second pick allowance plus an automatically calculated presentation buffer for the preceding server-resolved replay. Friends races retain 24 hours. The client can speed up or skip the show; animations never decide the game result. Structured replay events contain only public card reveals, actual travel paths, bashes, card actions and draw counts.

Profiles and result receipts live in Postgres. Final scores, wallet awards, statistics and standings are credited in the same transaction as a finished race, with a unique room/player receipt preventing duplicate awards. Only completed 3.4 races count. Synthetic QA accounts are excluded from standings. The current ladder is a playtest points table; private bot practice counts and this is not skill matchmaking. The Prize Booth is a future cosmetic preview with no spending or payments.

Audio is hosted with the game: Nathan-supplied Fairground Fun music, crowd recordings and ElevenLabs announcer clips, with trimmed FilmCow effects. Sound effects source: https://filmcow.itch.io/filmcow-sfx. No paid generator or recurring audio API is required. Sound begins only after the player's explicit enable gesture. Music, effects, voice and animation speed are separately adjustable; hiding the tab pauses the sound and skips the visual replay. Reduced motion defaults to no animation.
