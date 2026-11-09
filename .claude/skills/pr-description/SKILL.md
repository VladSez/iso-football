---
name: pr-description
description: Open or update a pull request for iso-football with a title and description in the house style. That means a summary up top, a clickable table of contents, benefit-grouped sections a reader can scan, before/after screenshots and an MP4 + GIF of the change captured from headless Chrome, a mermaid diagram, a risk read and a technical overview. Media is uploaded with gh --attach and then deleted locally. Use this whenever the user says "open a PR", "create a PR", "make a pull request", "write the PR description", "draft the PR", "describe this PR", "PR title", "pr body", "update the PR description", "ship this as a PR", or asks what a PR for this branch should look like, even if they don't mention screenshots.
user-invocable: true
---

# PR description

A PR description is read three times:
- by the reviewer deciding whether to open the diff;
- by the person six weeks later asking why the game behaves like this;
- by whoever searches merged PRs for the reason behind a change.

Write for all three. Put the high-level view first and a picture before a paragraph. Leave the mechanism at the bottom, where only the reviewer scrolls.

iso-football is a browser game: plain ES modules in `dist/`, no build step, tests run with `node --test`. Nearly every change is visible, so a description without a picture or clip is a claim the reader has to take on trust. This skill makes the evidence.

## Workflow

1. **Read the change against `origin/main`.**
   - Run `git fetch origin` first. A local `main` can sit commits behind, and comparing against it lists already-merged work and photographs an old "before".
   - `git log --oneline origin/main..HEAD` and `git diff origin/main...HEAD` show committed work.
   - `git diff HEAD` shows uncommitted edits. When HEAD equals `origin/main`, this is the whole change.
   - `git status --short` lists untracked files (`??`), which no diff shows. Read new files directly.
   - Read any linked issue, and the conversation, for the why.
   - Decide which template from `references/templates.md` fits. Read only that one.
2. **Check the branch is shippable.**
   - Not on `main`. If you are, branch first: `git switch -c <short-kebab-name>`.
   - `node --test` passes.
   - The shared `?v=` version is bumped in all six places, and in `dist/sw.js`, when any of those files changed: the `style.css`, `engine.js` and `game.js` links in `dist/index.html`, and the `physics.js`, `audio.js` and `courts.js` imports in `dist/game.js`. This is the README's deploy rule, and stale query strings ship old code to players. The service worker's `FILES` list must carry the same strings; `pnpm test` fails when it doesn't. Check with `grep -rn '?v=' dist/index.html dist/game.js dist/sw.js`.
   - Uncommitted work is either committed with a message in the repo's style (see `git log`) or deliberately left out. Ask if unclear.
   - Agent tooling (`.claude/` skills and `launch.json`, `.github/` workflows, `CLAUDE.md`) is not part of a game change. Leave it out of the commit unless the user says it belongs in this PR. If it does, give it its own PR or its own 🛠️ section.
3. **Capture media.** Follow [Capturing media](#capturing-media): before/after PNGs, plus one MP4 + GIF for anything that moves.
4. **Write the title and body.** Follow [Title](#title) and [What every body carries](#what-every-body-carries). Write the body to `<media dir>/body.md`, next to the media. gh resolves relative image paths from the body file's folder.
5. **Show the user before pushing.** Give them the title, the body path and the media list. Pushing and opening a PR are visible to others, so get a yes first, unless the user has already said to open it.
   - Also tell them anything the captures revealed that the PR didn't intend, such as a wrapped separator, an overlap or a console error. Say it in your message, not only under Risks, so they can fix it first.
6. **Push and open (or update).**
   ```bash
   git push -u origin HEAD
   gh pr create --base main --title "<title>" --body-file "$MEDIA/body.md" \
     --attach "$MEDIA/after.png" --attach "$MEDIA/before.png" \
     --attach "$MEDIA/<clip>.mp4" --attach "$MEDIA/<clip>.gif"
   ```
   - If the branch already has a PR (`gh pr view --json number,url`), use `gh pr edit <number> --title … --body-file … --attach …` instead.
   - Pass every referenced file once, and nothing else: no scenario JSONs, no check frames. gh rewrites each local reference to the uploaded URL. Any file you attach but don't reference is appended to the end of the body.
   - The alt text written in the Markdown is kept, so a plain `--attach "$MEDIA/after.png"` is enough. Skip the `#alt` suffix and its quoting.
7. **Verify, then clean up.**
   - Run `gh pr view --json body -q .body | grep -c 'user-attachments'`. It should count one URL per attached file.
   - Also check that no `](./` local paths remain.
   - Only then run `rm -rf "$MEDIA"`. If any upload failed, keep the folder, say which file failed, and retry with `gh pr edit --attach`.
8. **Report** the PR URL, and what the reviewer should look at first. `.github/workflows/preview.yml` comments a preview link (`https://vladsez.github.io/iso-football/pr-preview/pr-<number>/`) once GitHub Pages has deployed it, usually within a couple of minutes. Mention it so the user knows where to try the change.

## Title

A title says what a player now gets, not what the diff did. Use plain sentence case, no `feat:` prefix, under about 70 characters.

- ✅ "Night pitch: play under floodlights, with a buzzing hum"
- ✅ "Pausing mid-flight no longer drops the ball through the floor"
- ❌ "feat(game): add night pitch"
- ❌ "Update game.js and style.css"

## What every body carries

The body has two layers. **Above the fold** is what everyone reads: the summary, a few change sections, the screenshots and the diagram. **Collapsed below** is what only the reviewer needs: risks and the technical overview. A long description isn't more thorough, it's harder to review. So keep the visible part within the budget below, and move detail into the collapsed block instead of deleting it.

**Size the body to the PR.** Count the words outside `<details>`:
- **A small fix or polish:** about 150 words. Often there are no change sections at all, just the summary, a screenshot and the reviewer block.
- **One feature:** about 300 words.
- **Several features in one PR:** about 500 words at most.

If you're over, cut in this order: a fact that appears twice, then sub-bullets, then whole sections.

**A summary first, before anything else.** It's the whole PR for someone who reads nothing further: a reviewer triaging their queue, or someone scanning merged PRs months later.
- Use a bold **Summary** label and two to four bullets. Give one bullet per headline change, the fixes and tooling included, so nothing in the PR is a surprise further down.
- Each bullet is one plain sentence about what a player or maintainer now gets. Put no file paths, test counts or mechanism here.
- If the PR needs one thing from the reviewer, such as "check the phone layout" or "decide on the default", make it the last bullet.
- Put the GIF, if there is one, straight under the bullets with no heading of its own. It autoplays, so a skimmer sees the change without clicking anything.

```markdown
**Summary**

- A new night pitch, with floodlights, long shadows and a low buzzing hum.
- Pausing mid-flight no longer drops the ball through the floor.
- Please check the floodlight glare on a phone; it's the part I'm least sure of.

![The night pitch: floodlights flicker on as the ball hits the net](./night-pitch.gif)
```

**A contents list, only when there are five or more `##` sections.** A short body doesn't need one.
- GitHub gives headings in a PR body no anchors you can rely on. So end every linked heading with `<a id="slug"></a>`, and link to `#user-content-slug`. GitHub prefixes user ids with `user-content-`.
- A dead link is worse than none, so give every listed section an id.
- Write it as a bulleted list under a bold **Contents** label, one link per line, in section order. The last item points at the reviewer block, through the anchor placed just above `<details>`.

```markdown
**Contents**

- [Night pitch](#user-content-pitch)
- [Screenshots](#user-content-shots)
- [How it works](#user-content-diagram)
- [Details for reviewers](#user-content-reviewers)
```

**Change sections: at most one per summary bullet, and at most four.**
- A summary bullet that is complete on its own gets no section. Write a section only when a reader needs more than the one sentence, such as how to reach the feature or what it saves.
- Give each section one emoji and a benefit heading, such as `## 🌙 Play under the lights`. For housekeeping PRs, use a change class instead: ✨ Feature · 🐛 Fix · 💄 Polish · ♿ Accessibility · ⚡ Performance · 📝 Docs · 🧪 Tests · ♻️ Refactor.
- Don't open by repeating the summary sentence. Start with what the summary left out.
- Each bullet is one line: a bold hook, a dash, the fact. Add an indented sub-bullet only for something a reader will use, such as a key (`Space`), a menu path (Footer › Pitch › Snow day) or a number. Use two at most.
- Fold small related changes into one bullet instead of giving each its own.
- When the change touches something players like, add one bullet saying what stayed the same. Check that claim against the diff: "untouched" is the line reviewers catch.
- Credit contributors inline: "Thanks @handle (#NN)".
- Use no file paths, function names or line numbers outside the reviewer block.

**Screenshots, in one section.**
- Include at least one PNG of the screen after the change.
- Add a before/after pair when the change replaces something, laid out as a two-column table so they sit side by side.
- Crop to the part that changed. A footer change shows the footer, not the whole pitch.
- Keep crops under about 4:1. For a full-width bar, crop an inner element (`.credits`, not `.footer`) or take that shot at a narrower viewport. A 5000×200 strip renders as a sliver on GitHub.
- Keep alt text to about ten words that say what the picture shows.
- The MP4, if there is one, goes here too. Video is covered under [Capturing media](#capturing-media).
- A change with nothing to see, such as a test-only or tooling PR, shows terminal output in a fenced block instead and says why there is no screenshot.

```markdown
| Before | After |
| --- | --- |
| ![Loose footer links](./before-footer.png) | ![Grouped footer settings](./after-footer.png) |
```

**A mermaid diagram of the change**, in a ` ```mermaid ` fence under `## How it works`, which GitHub renders inline. It stays above the fold, because a picture of the flow is quicker to read than the paragraph it replaces.
- Draw the change, not the whole game: the new flow, the state that moved, the modules touched. Aim for a dozen nodes or fewer.
- Shapes that fit most PRs here:
  - `stateDiagram-v2` for game flow, such as a round's lifecycle or a shot's outcome.
  - `flowchart` for UI and data flow, or which module now owns what.
  - `sequenceDiagram` for timing, such as load order, a skeleton clearing or audio unlocking.

**Details for reviewers, collapsed.** Risks and the technical overview go last, inside `<details>`, so they cost nothing for a reader who doesn't open them.
- Put `<a id="reviewers"></a>` on its own line just above `<details>`, so the contents list can link to it.
- Leave a blank line after `<summary>…</summary>`, or GitHub won't render the Markdown inside.
- Use `###` headings inside. They don't go in the contents list.
- Screenshots beyond the main before/after pair, such as phone layouts or close-ups, can go here under `### More screenshots`. That keeps the visible section to the pictures everyone needs.

**Risks**, inside the block.
- Lead with what is **not** checked, or what needs the reviewer's eye. Those are the bullets that matter.
- Then give one line per area that was checked, with the check: "Layout: measured at 375, 820, 1000 and 1440px wide."
- Cover the areas in the order a reviewer worries:
  1. Can this break the game for players: a crash, a stuck state, a wrong score?
  2. Can it break the deploy: stale `?v=`, missing files in `dist/`?
  3. Layout on phone and tablet widths.
  4. Accessibility: focus, labels, reduced motion.
  5. Saved state: localStorage keys added, renamed or reinterpreted.
- Six bullets at most. Skip an area the PR can't touch.

**Technical overview**, inside the block, last.
- Explain the mechanism in three sentences at most.
- List only the files a reviewer should read closely, with a clause each. The diff already lists every file.
- Name the approach you rejected that they would ask about.
- Give the gate, for example "`node --test`: 22 pass, 0 fail".

**Attribution.** End with any attribution line your environment asks for, after `</details>`.

## Capturing media

`scripts/capture.mjs` drives headless Chrome over the DevTools protocol, with no npm install. It needs Node 22+, Google Chrome (or `CHROME=/path`) and ffmpeg.
- It serves the folder you pass on its own free port, so it never clashes with a dev server that's already running.
- It writes PNGs at 2x, and turns each recording into an MP4 and a GIF.

**Set up a media folder** outside the repo, so nothing gets committed by accident:

```bash
MEDIA=$(mktemp -d)/pr-media && mkdir -p "$MEDIA/scenarios" "$MEDIA/checks"
```

Scenarios go in `$MEDIA/scenarios/`, and frames you extract to check a clip go in `$MEDIA/checks/`. Only media the body references sits at the top level, which keeps the attach list obvious.

**After** shots come from the working tree:

```bash
node .claude/skills/pr-description/scripts/capture.mjs --dir dist --scenario "$MEDIA/scenarios/after.json" --out "$MEDIA"
```

**Before** shots come from `origin/main` (fetched in step 1), checked out to a throwaway worktree:

```bash
BASE=$(mktemp -d)/base && git worktree add --detach "$BASE" origin/main
node .claude/skills/pr-description/scripts/capture.mjs --dir "$BASE/dist" --scenario "$MEDIA/scenarios/before.json" --out "$MEDIA"
git worktree remove --force "$BASE"
```

A before scenario runs against the old code, so it can't wait for selectors or storage keys the PR adds. Use a plain `{ "wait": 800 }`, or an element that already existed.

**The scenario** is a JSON file you write for each PR. It drives the page to the state worth showing:

```json
{
  "viewport": [1440, 900],
  "scale": 2,
  "storage": { "iso-football:pitch": "snow", "iso-football:sound": "off" },
  "steps": [
    { "wait": 800 },
    { "screenshot": "after.png" },
    { "screenshot": "after-footer.png", "selector": ".credits", "pad": 24 },
    { "record": "chip-goal", "steps": [
      { "wait": 300 },
      { "key": "Space", "hold": 700 },
      { "wait": 2600 }
    ] }
  ]
}
```

**Steps:**

| Step | Fields |
| --- | --- |
| Wait | `wait` (ms), or `waitFor` (a JS expression) with an optional `timeout` |
| Interact | `click` (a CSS selector), `key` (`Space`, `Escape`, `KeyC`, `KeyW`, arrows…) with `hold` (ms), or `eval` (any JS) |
| Screenshot | `screenshot` (a file name); add `selector` and `pad` to crop |
| Record | `record` (a base name) with nested `steps`; writes `<name>.mp4` and `<name>.gif` |

**Scenario notes:**
- `storage` sets localStorage before the page loads. That's how to open straight into a pitch (`neighborhood`, `rooftop`, `beach`, `snow`, `overpass`) or a sound setting (`all`, `effects`, `off`). The keys live in `dist/game.js`; grep for `iso-football:`. Session stats aren't saved, so stage a few shots if the header should show more than 00.
- Turn sound off. It's muted anyway, and it skips the audio-unlock path.
- Wait for the page to be ready before shooting, at least `{ "wait": 800 }` so the pitch has baked and drawn, so no blank frame lands in the PR.
- The viewport is set once per scenario, so a phone shot needs its own scenario file with `"viewport": [375, 812]`, which also switches on mobile emulation and touch, so the page shows the stick and Shoot buttons. Add one whenever layout changed.
- Shots: the player starts aimed at the goal with a chip selected. Holding `Space` for about 700ms (roughly 60% power) from the starting spot chipped the keeper and scored when last checked; press `KeyC` first for a low shot. Check the frames, since keeper and aim changes move these numbers.
- Keep clips to 3–6 seconds of the one action that matters. The script prints each file's size and warns over GitHub's 10 MB limit. If you get the warning, shorten the clip, or lower `gifWidth` and `gifFps` on the record step (defaults 720 and 12).

**Look at every image before using it.** Open the PNGs, and pull a few frames from each MP4 into `$MEDIA/checks/`, for example `ffmpeg -ss 1 -i "$MEDIA/clip.mp4" -frames:v 1 "$MEDIA/checks/clip-1s.png"`. A screenshot of the wrong state is worse than none. Anything odd you spot is a finding for the user (step 5).

**Where video goes:**
- The GIF goes straight under the summary bullets, because it autoplays.
- The MP4 goes in **Screenshots**, under its own small bold label, as `![](./clip.mp4)` alone on its own line, with a blank line above and below. That's what makes GitHub render a player rather than a link. Video takes no alt text.
- Images take alt text in the Markdown. Describe what the picture shows, not that it is a screenshot.

## Body skeleton

This is the largest shape: a multi-feature PR. Drop what the PR doesn't need, and check the visible word count against the budget.

~~~markdown
**Summary**

- <Headline change, as what a player now gets.>
- <Next change, or the one thing you need from the reviewer.>

![<what the clip shows>](./<clip>.gif)

**Contents**

- [<Benefit 1>](#user-content-b1)
- [Screenshots](#user-content-shots)
- [How it works](#user-content-diagram)
- [Details for reviewers](#user-content-reviewers)

## 🎯 <Benefit 1> <a id="b1"></a>

- **<Hook>** – <the fact the summary left out>
- **<Hook>** – <fact>
  - <key, menu path or number, only if the reader will use it>

## Screenshots <a id="shots"></a>

| Before | After |
| --- | --- |
| ![<alt>](./before.png) | ![<alt>](./after.png) |

**<Clip name>**

![](./<clip>.mp4)

## How it works <a id="diagram"></a>

```mermaid
stateDiagram-v2
  ...
```

<a id="reviewers"></a>
<details>
<summary><b>Details for reviewers</b>: risks and technical overview</summary>

### Risks

- **Not checked:** <what wasn't verified, or needs the reviewer's eye>
- **<Area>** – <the check that covers it>

### Technical overview

<Mechanism in three sentences at most.>

- `dist/<file>` – <why a reviewer should read it closely>
- **Rejected:** <the approach a reviewer would ask about, and why not>
- **Gate:** `node --test` – <N> pass, 0 fail

</details>
~~~

Always keep the summary, the screenshots (or their terminal-output stand-in), the diagram and the reviewer block. Everything else is earned by the PR's size.
