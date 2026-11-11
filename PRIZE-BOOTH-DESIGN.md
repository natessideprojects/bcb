# Player mat and Prize Booth — November 10, 2026

## Midway interaction

New races reserve earned Midway draws in Flag order when Doubles are revealed, preserving the original deck and Fireworks ordering. After Speed movement and Rusty, human drivers click the Midway stack on their turn. The card stays private until they reveal it; they view the artwork and rule text, hear its recorded announcement when Fair sound is enabled, then place it on their mat. Placing an INSTANT resolves it immediately and puts it in the discard. Other cards become available next round and remain inspectable on the mat. The mat also keeps inspectable records of recent resolved cards. Speed replacements remain automatic under the existing Flag 1/stall/final-round rules.

All queued cards must resolve before lap-ticket settlement, Condition changes, replacement dealing and final scoring. Bots draw automatically. Expired draw turns place one card automatically and advance the queue; Quick Race gives the next driver a fresh allowance plus presentation time. Server transactions serialize actions. A placement names the revealed card ID, so retries cannot place a second card. Unrevealed card identities and other players' saved hands remain hidden.

Previously saved games retain their existing automatic Midway rules. New games keep 16 sections and six starting cards. All 20 event effects and 37 Midway cards remain in the deck.

## Rink fit

The functional floor, labels, routes and marquee rim use the same rounded-box outline. The rink was widened and its corners stretched to follow the existing fairground illustration instead of the earlier smaller, squarer inset. The code retains independently calculated 16/18/28-section positions.

## Prize economy

The shop has 30 distinct car skins: six free standard colors and 24 themed prizes. Ticket prices are initial playtest tuning, not money. There are 12 passenger mascots. Players can freely preview any skin/passenger combination. Purchases and equipped selections persist in Postgres; purchasing locks the profile row, charges a catalog-defined price once and creates a unique inventory receipt. Lifetime earned tickets and race stats never decrease when spending. Skin and passenger choices are snapshotted into a newly started race; current races keep their appearance. Seat-number badges still identify drivers regardless of car paint.

All skins and passengers are cosmetic. No car gets movement, bash or scoring advantages. The store has no cash purchases, paid currency, loot boxes or effect upgrades.

## Carnival prize research

The passenger choices draw on prize categories sold for real carnivals and redemption counters: plush long-arm animals, toy fish, rubber ducks, inflatables, novelty toys and large stuffed prizes. Original illustrations were drawn for this game; supplier product photos and branded characters were not copied.

- Fun Express Carnival Prize Kit: long-arm zoo plush, novelty toys and light-up fish. https://www.funexpress.com/bulk-carnival-prize-kit-13955488.html
- Rhode Island Novelty Carnival Prizes: plush, balls, toys and prize assortments. https://rinovelty.com/carnival~c22377546
- Rhode Island Novelty Winner Every Time catalog: plush axolotls, food plush and squishy novelty animals. https://view.publitas.com/rhode-island-novelty/winner-every-time-2025/page/46-47

Passengers: Balloon Dog, Fishbowl Friend, Grand Prize Bear, Inflatable Alien, Lucky Rubber Duck, Long-Arm Frog, Plush Unicorn, Prize Monkey, Pocket Dinosaur, Plush Penguin, Wind-Up Robot and Jumbo Plush Bee.

## Later effects

Sparks, smoke and pretend oil splashes are reserved as future player-triggered cosmetic effects. No effect item is sold now. If oil or smoke should affect movement or visibility, that needs a separate rules and balance decision. Effects must not hide card information, obstruct phone controls or bypass reduced-motion settings.


## Approved starter-card adjustment

Nathan selected one starter card each, usable in round 1, after reviewing 750 Doubles-only simulations. New rooms now reserve one random BOOST, DEFENSE or BASH card per driver from the existing shuffled deck. Drivers claim it through the same stack/reveal/place interaction before the first Speed pick. There is no setup INSTANT effect, extra copy or extra deck. The saved starter becomes usable in round 1; later Doubles-earned saved cards remain available from the following round. Bots claim their starter automatically. The starter phase does not advance the round, deal extra Speed cards, alter initial flags, or create a Doubles statistic. No drought draw was added.

Baseline: with two drivers, 43.6% received no Midway card across an entire game; 44.8% had a Midway card by round 6, and only 16.4% had a saved card usable by then. Four-driver games averaged 12.10 rounds; six-driver games averaged 14.01. Six starting Speed Cards do not cap the match at six rounds. These are seeded random-primary simulations measuring access, not human strategy or full BOOST balance.


The same 750-game simulation with starters gave every driver an available saved card from round 1. Mean match lengths were 8.40 / 12.04 / 13.81 rounds for 2 / 4 / 6 drivers, respectively. Average total Midway cards per driver rose from 0.79 / 2.87 / 4.88 to 1.77 / 3.82 / 5.86. These runs did not select BOOST cards; the results demonstrate access and conservation, not optimal use or final balance. Ticket prices and special-skin clarity also remain playtest tuning.


## Dice wording and music verification

The engine rolls a virtual six-sided die automatically for knockback, Tilt, stall recovery, Rusty's movement and tied Speed-card turn order. Players do not click or roll dice. Double Bash and Super Bash describe the knockback distance they multiply; Karma describes reversing that distance. Numerical behavior stays the same. Doubles is a match of primary Speed Cards.

Fairground Fun is the background loop; its title appears in the sound settings. The live MP3 matched the local production asset byte-for-byte. Both the supplied BCB/Sounds original and the normalized web version decoded to 179.57 seconds, with aligned waveform correlation 0.99838 and zero measured offset. Fair sound remains opt-in.
