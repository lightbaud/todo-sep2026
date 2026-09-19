# To Do app: release log

Every change to the app is recorded here, newest first. Each entry shows the version and the date and time it was implemented (24-hour local time).

The first four releases were written up after the fact and no exact time was kept for them, so they show the date only.

## v1.6 - 2026-09-19 16:42
- The crystal heading is now pink (pink gradient face with rose and deep-pink refracted layers).
- Files: style.css, RELEASES.md

## v1.5 - 2026-09-19 16:35
- The "To Do" heading is now a 3D crystal: a prismatic gradient face with cyan and magenta refracted layers behind it, slowly turning, with a sweeping glint. The animation stops for users who prefer reduced motion.
- Files: index.html, style.css, RELEASES.md

## v1.4 - 2026-09-19 12:29
- Added this release log (RELEASES.md).

## v1.3 - 2026-09-19 (time not recorded)
- Edit a task's text and due date with a pencil button (Enter or Save to keep, Escape or Cancel to discard).
- "Clear completed" button in the Completed section.
- Undo toast after deleting a task or clearing completed tasks; tasks return to their old positions.
- Empty-state messages: "Nothing to do yet.", "All done!" and "No tasks match."
- Optional due date per task. Overdue active tasks are highlighted in red. Sort order is now priority, then due date.
- Search box and priority filter chips (All, High, Medium, Low).
- Card widened from 480px to 560px.
- Files: index.html, style.css, app.js, specs.md

## v1.2 - 2026-09-19 (time not recorded)
- Light, pastel and dark themes, chosen with icon buttons (replaces the text "Pastel mode" button). The choice is remembered.
- Completed tasks moved to a separate "Completed (n)" section below the active list.
- Files: index.html, style.css, app.js, specs.md

## v1.1 - 2026-09-19 (time not recorded)
- Priority (High, Medium, Low) for each task, shown as a colored badge. Click the badge to change it. Tasks are sorted high first.
- Pastel mode toggle, remembered between visits.
- Colors moved to CSS variables so themes share one set of rules.
- Files: index.html, style.css, app.js, specs.md

## v1.0 - 2026-09-19 (time not recorded)
- Original app: add a task, mark it done, delete it, and see how many are remaining. Tasks saved in the browser's localStorage.
- Files: index.html, style.css, app.js, specs.md
