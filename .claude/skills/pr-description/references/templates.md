# PR templates

Pick the one template that matches the PR's main change, and read only that one. A PR that mixes kinds uses the template of its headline change. Each other change gets its own summary bullet, and a section only if one sentence isn't enough for it.

Every template keeps what SKILL.md requires: the summary, the screenshots (or terminal output), the diagram and the collapsed reviewer details. The templates decide the one change section, its budget, the diagram shape, the media and where risk tends to hide. "Budget" is the visible word count, outside `<details>`.

## Contents

1. [New mode or feature](#1-new-mode-or-feature)
2. [UI or layout polish](#2-ui-or-layout-polish)
3. [Gameplay bug fix](#3-gameplay-bug-fix)
4. [Physics or feel tuning](#4-physics-or-feel-tuning)
5. [New pitch or content](#5-new-pitch-or-content)
6. [Accessibility](#6-accessibility)
7. [Performance or refactor](#7-performance-or-refactor)
8. [Docs, tests or tooling](#8-docs-tests-or-tooling)

---

## 1. New mode or feature

**Title:** "Penalty shootout: five kicks, one keeper, beat your best"

**Budget:** about 300 words.

**One section**, named for what the player gains, such as `## 🎯 A goal to chase`. Cover:
- the rules in one bullet: how a round starts, scores and ends;
- how to reach it, as a menu path, plus anything locked compared with free play;
- what's saved, if anything;
- one bullet on what stayed the same.

**Diagram:** `stateDiagram-v2` of the mode's lifecycle, covering entering it, one turn, the end state and restarting.

**Media:**
- A GIF of one complete turn, for example a made shot with the score updating.
- An MP4 of the full loop through to the end state.
- An after PNG of the mode's UI.

**Risks to check:**
- Switching modes mid-action: during a charge, mid-flight, or with a round finished.
- Saved state from older versions, such as old or renamed localStorage values.
- Stats bleeding between modes.

## 2. UI or layout polish

**Title:** "The pitch fills the screen on desktop and phones"

**Budget:** about 150 words.

**Often no section.** The summary bullet plus the before/after table usually say it all. Add `## 📐 Fits every screen` only when the layout differs by width, with one bullet per breakpoint, for example "751–1180px: settings centred, links below".

**Diagram:** a `flowchart` of the layout per width range. When the change is about load order or flicker, use a `sequenceDiagram` of what paints when.

**Media:**
- A before/after table at desktop width, cropped to the changed area.
- A second before/after row at phone width (`[375, 812]`).
- A short MP4/GIF only if the change moves, such as a menu opening or a skeleton clearing.

**Risks to check:** overlap with the shot panel at each breakpoint, popovers clipped at screen edges, horizontal scroll, layout shift while loading, and reduced motion. Give measured gaps when you have them.

## 3. Gameplay bug fix

**Title:** say what the player no longer suffers, for example "Pausing mid-flight no longer drops the ball through the floor".

**Budget:** about 150 words.

**One section**, `## 🐛 What was wrong`, in two or three bullets: the symptom as a player saw it, how to reproduce it, and what happens now. If it was a regression, add a bullet naming the PR or commit that introduced it.

**Diagram:** a `stateDiagram-v2` or `flowchart` showing the corrected path, with the old wrong edge drawn dashed and labelled "before".

**Media:**
- An MP4/GIF of the reproduction on `main` (before) and on the branch (after), staged with the same scenario.
- If the bug can't be staged reliably, show test output that fails on `main` and passes on the branch, in a fenced block.

**Risks to check:** what else reads the state you changed, and whether the fix is at the root or only guards the symptom. Say which, and why.

## 4. Physics or feel tuning

**Title:** "Chips dip faster, so more of them drop under the bar"

**Budget:** about 200 words.

**One section**, `## 🎚️ What feels different`, with the before → after numbers (gravity 14 → 15, chip lift 4.8 → 5.2). Say how they were tuned in one bullet, and put the full sweep output in the reviewer details.

**Diagram:** a `flowchart` of the inputs to the changed value, showing which constants feed it.

**Media:**
- An MP4 of the same staged shot before and after.
- If the change is numeric, a fenced block of the sweep or measurement output, so a reviewer can rerun it. It goes inside the reviewer details.

**Risks to check:** every mode that uses the constant, and whether tests pin the old value and need a deliberate update rather than a blind one.

## 5. New pitch or content

**Title:** "Night pitch: floodlights, long shadows and a buzzing hum"

**Budget:** about 150 words.

**Often no section.** The summary bullet plus the GIF show the pitch. If one is needed, `## 🏞️ The new pitch` gets one bullet each for the look, the motion and the sound, plus the menu path.

**Diagram:** a `flowchart` from the pitch's `COURTS` entry in `dist/courts.js` to what it drives (ground, props, weather, grading).

**Media:**
- An after PNG of the pitch at desktop size.
- A GIF of its ambient motion, such as wind, sea or snow.

**Risks to check:** the pitch menu label width, the scene's drawn height (tall scenery shrinks the desktop zoom, which fits each pitch's drawn bounds), reduced motion, and the shared `?v=` bump.

## 6. Accessibility

**Title:** "The shot meter announces its power to screen readers"

**Budget:** about 200 words.

**One section**, `## ♿ Who this helps`. Name the assistive technology or setting, then say what is announced, focused or reachable now.

**Diagram:** a `sequenceDiagram` of the interaction as a screen-reader or keyboard user experiences it.

**Media:**
- Screenshots with the focus ring visible.
- A fenced block of the accessible names or roles before and after, inside the reviewer details.
- An MP4 of the keyboard flow, if it moves.

**Risks to check:** sighted-user regressions, focus traps, and reduced motion.

## 7. Performance or refactor

**Title:** say what the player or the next engineer gets, for example "Switching pitches is instant: each pitch bakes once, not every time".

**Budget:** about 150 words.

**One section**, `## ⚡ Faster` or `## ♻️ Simpler`. Give the measured numbers (before → after, and how they were measured), and one bullet on what stays the same, which is the point of a refactor.

**Diagram:** a `flowchart` of module ownership before and after, side by side as two subgraphs.

**Media:** a refactor has nothing new to see, so show the gate and the measurement in fenced blocks instead. Say so in one line under Screenshots.

**Risks to check:** behaviour parity (which tests prove it), and whether a measured number explains what limits it.

## 8. Docs, tests or tooling

**Title:** "Physics tests now sweep shots from every spot on the pitch"

**Budget:** about 150 words.

**One section**, `## 🛠️ How to use it`, with the command in a fenced block, and one bullet on what is now documented or covered.

**Diagram:** a `flowchart` of the workflow or the test's reach.

**Media:**
- Terminal output in a fenced block, such as a test run or the tool's output.
- A screenshot only if the tool produces something visual.

**Risks to check:** whether the new tests can fail (show one failing on purpose), and whether anything ships to players (it usually shouldn't).
