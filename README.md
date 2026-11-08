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

The keeper reacts after the kick, moves across the goal and dives. Shots can hit the posts or crossbar, and goals require the whole ball to cross inside the frame. The ball returns after each attempt. Session stats reset on reload.

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
