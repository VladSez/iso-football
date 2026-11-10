# Neighborhood Football

A relaxed isometric football practice game: one player, one goalkeeper, all afternoon. Plain browser JavaScript, no dependencies or build step.

Play: [Neighborhood Football on GitHub Pages](https://vladsez.github.io/iso-football/).

Run `pnpm dev` and open http://127.0.0.1:5300. Run `pnpm test` for football physics checks and `pnpm check` for syntax checks.

- WASD / arrows: move relative to the screen; the ball stays close.
- Mouse: aim along the ground. Point at the base of the goal.
- Q / E: turn your aim without a mouse.
- Hold Space or the left mouse button on the pitch, then release: charge and shoot.
- C: switch between chips (the default) and low shots.
- Esc: cancel a charged shot, or pause / resume.
- On a phone or tablet: drag the stick to move, hold ↺ / ↻ to turn, tap the pitch to aim, and hold Shoot to charge; release to kick.

The keeper narrows the angle: it waits on the line between you and the middle of the goal, and steps off its line when you come within 5 m. It reacts after the kick (sooner when you're close), moves across the goal and dives, high enough to reach a chip dropping under the bar. Shots can hit the posts or crossbar, and goals require the whole ball to cross inside the frame. The ball returns after each attempt. Session stats reset on reload.

Pick a mode from the Mode menu:

- **Practice** (the default): walk anywhere and shoot as often as you like.
- **Shootout**: a penalty cup run in four rounds: Round one, Quarter-final, Semi-final and Final. Each round is five kicks against that round's keeper. You shoot from the spot and can only turn. The keeper guesses a side as you strike instead of reading the ball, and its dive reaches high enough that no chip into the corner it picks is a sure goal. When you face the middle it often stays put and jumps for chips. Score three to go through. The round ends as soon as you have three, or can no longer get there.

  After each round a card shows the kick-by-kick sheet and your numbers: goals, saves, misses, and how many chips and low shots went in. Go through and the next round's keeper reads you more often, dives higher and further, and moves faster. Fall short and the run starts over from round one. Get through the final and you take the cup. The scoreboard shows goals toward the three, saves, kicks taken and the round. Your current round, best run and cups won are remembered along with the mode. The keeper for each round is set in the `ROUNDS` table in `dist/shootout.js`.
- **Targets**: an empty net with bullseyes hanging in it. Walk anywhere and put the ball through a target to knock it down. Low targets sit where a low shot rolls in; the high ones need a chip. A ball that clips a target's edge counts, and one touching two knocks down the one nearer its centre. A hit target snaps its cord, tumbles into the net and is gone a moment later. A run is four rounds: Four corners, On the move, Smaller and Top bins. Knock every target down within eight balls to go on; each round moves the targets and makes them smaller and higher. Run out first and you take that round again. Clear the last round to complete the run. A card after each round shows the ball-by-ball sheet, targets down, balls used and misses. The scoreboard shows targets down, balls used, your best (fewest balls) for the round and the round. Your round, best for each round and runs completed are remembered. The rounds are set in the `ROUNDS` table in `dist/targets.js`.
- **Crossbar**: the crossbar challenge. An empty net and ten balls, each kicked from its own spot, further out as the round goes on; you can only turn. Every spot is far enough out that a full-power chip clears the bar, so each ball needs its power judged. Ring the crossbar for three points or a post for one; a ball that clips the corner counts as the bar. A goal earns nothing. A card after the ten balls shows each ball's points, how many hit the bar and the posts, and how many went in for nothing. The scoreboard shows points, balls used, your best and bars hit. Your best and rounds played are remembered. The spots and points are set in `dist/crossbar.js`.
- **Around**: around the world. Seven chalk spots in an arc around the goal, all the same distance from it, from one wing round to the other. You stand on the spot and can only turn, and the keeper is back. Score to move on to the next spot. A miss or a save costs one of three lives, and the third ends the trip. A run is four rounds, 8, 10, 12 and 14 m from the goal: get all the way round to go on to the next. Further back the arc narrows, so every spot stays on the pitch. Run out of lives and the run starts over from round one. Clear the 14 m round to complete the run. A card at the end of each trip shows the kick-by-kick sheet, spots cleared, saves and misses. The scoreboard shows the spot you're on, lives left, your furthest spot in this round and the round. Your round, furthest spot in each round and runs completed are remembered. The rounds and lives are set in `dist/world.js`.
- **Rush**: the 60-second rush. Free practice against the clock: score as many as you can in a minute. The clock starts with your first kick, and the ball comes back in about half a second instead of a second and a half. A ball already struck when time runs out still counts. A card shows each shot, goals, shots and accuracy. The scoreboard shows goals, shots, the time left and your best, which is remembered.

Pick a pitch from the menu beside Sound: Neighborhood, Rooftop cage, Beach at sunset, Snow day or Under the overpass. Every pitch plays the same; the choice is remembered.

## Play offline

Open the game once while online. Everything it needs is saved, and from then on it loads without an internet connection. To keep it a tap away, install it:

- **Chrome or Edge on a computer:** click Install in the address bar, or in the browser menu.
- **Safari on a Mac:** File › Add to Dock.
- **iPhone or iPad:** tap Share, then Add to Home Screen.
- **Android:** open the browser menu and tap Install app or Add to Home screen.

The installed game opens full screen, without the browser bars. The How to play dialog has the same steps.

## Sound

Sound is on by default and starts on the first click or keypress, following browser autoplay rules. An original, quiet eight-bar melody and chord loop is synthesized locally alongside the effects. The Sound button mutes both music and effects. Audio pauses with the game, instructions, or when leaving the tab; resume the game to continue.

Based on [iso-hoops](https://github.com/VladSez/iso-hoops) by VladSez. The original `dist/engine.js` is the isometric software renderer from [Pixel Plays](https://github.com/amirmushichge/pixel-plays) by AmirMushich; its MIT license is in `dist/LICENSE.pixel-plays`. No Pixel Plays music is used. Football physics, goal, pitch, gameplay and music are created for this project.

## Deploy to GitHub Pages

GitHub Pages serves the root of the `gh-pages` branch, and GitHub Actions publishes it:

- **Production:** every push to `main` runs `.github/workflows/deploy.yml`, which copies `dist/` to `gh-pages`.
- **PR previews:** every pull request from this repository runs `.github/workflows/preview.yml`. It deploys the PR's `dist/` to `https://vladsez.github.io/iso-football/pr-preview/pr-<number>/` and comments the link with a QR code once the page is live. Closing or merging the PR removes the preview.
- **Tests:** `.github/workflows/test.yml` runs `node --test` on every PR and on `main`.

GitHub Pages lets browsers cache files for 10 minutes, so every CSS and JS URL carries a shared `?v=` version: the `style.css`, `engine.js` and `game.js` links in `dist/index.html`, and the `physics.js`, `audio.js` and `courts.js` imports in `dist/game.js`. Bump it in all six places whenever any of those files changes, so returning visitors fetch the new code. The offline service worker, `dist/sw.js`, lists the same URLs in `FILES`, so update them there too; `pnpm test` fails when they don't match:

```sh
grep -rn '?v=' dist/index.html dist/game.js dist/sw.js
```

The service worker doesn't register on `localhost` or `127.0.0.1`, so local edits always show up. When `index.html` or an icon changes without its URL changing, bump `VERSION` in `dist/sw.js` so installed copies download it again.

The `.nojekyll` file keeps deployment static. No Sites hosting configuration or build step is required.
