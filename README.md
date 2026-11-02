# Neighborhood Football

A relaxed isometric football practice game: one player, one goalkeeper, all afternoon. Plain browser JavaScript, no dependencies or build step.

Run `pnpm dev` and open http://127.0.0.1:5300. Run `pnpm test` for football physics checks and `pnpm check` for syntax checks.

- WASD / arrows: move relative to the screen; the ball stays close.
- Mouse: aim along the ground. Point at the base of the goal.
- Q / E: turn your aim without a mouse.
- Hold Space, then release: charge and shoot.
- C: switch between low shots and chips.
- Esc: cancel a charged shot, or pause / resume.

The keeper reacts after the kick, moves across the goal and dives. Shots can hit the posts or crossbar, and goals require the whole ball to cross inside the frame. The ball returns after each attempt. Session stats reset on reload.

Sound is on by default and starts on the first click or keypress, following browser autoplay rules. An original, quiet eight-bar melody and chord loop is synthesized locally alongside the effects. The Sound button mutes both music and effects. Audio pauses with the game, instructions, or when leaving the tab; resume the game to continue.

Based on [iso-hoops](https://github.com/VladSez/iso-hoops) by VladSez. The original `dist/engine.js` is the isometric software renderer from [Pixel Plays](https://github.com/amirmushichge/pixel-plays) by AmirMushich; its MIT license is in `dist/LICENSE.pixel-plays`. No Pixel Plays music is used. Football physics, goal, pitch, gameplay and music are created for this project.
