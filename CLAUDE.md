# CLAUDE.md

## Testing in a browser

Use the built-in browser (the Browser pane, `mcp__Claude_Browser__*` tools) by default to run and check the game. Use Playwright or Claude in Chrome only when the user asks, or for something the built-in browser can't do, such as emulating a device pixel ratio.

Start the game with `preview_start` and the `iso-football` configuration in `.claude/launch.json`. It serves `dist/` on port 5391, because `pnpm dev` is hard-wired to port 5300, which the iso-hoops dev server often holds.
