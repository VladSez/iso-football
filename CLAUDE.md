# CLAUDE.md

## Testing in a browser

Use the built-in browser (the Browser pane, `mcp__Claude_Browser__*` tools) by default to run and check the game. Use Playwright or Claude in Chrome only when the user asks, or for something the built-in browser can't do, such as emulating a device pixel ratio.

Start the game with `preview_start` and the `iso-football` configuration in `.claude/launch.json`. It serves `dist/` on port 5391, because `pnpm dev` is hard-wired to port 5300, which the iso-hoops dev server often holds.

Test with the sound off. Sound is on by default and starts on the first click or keypress, so it plays on the user's speakers while you test. Before the first click or keypress, run `localStorage.setItem('iso-football:sound', 'off')` with `javascript_tool` and reload, or pick Off from the Sound menu in the footer. The setting is saved, so it stays off across reloads.
