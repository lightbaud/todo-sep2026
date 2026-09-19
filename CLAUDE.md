# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page to-do app in plain HTML, CSS and JavaScript. `specs.md` sets the constraints: no framework, no build step, tasks saved in the browser's localStorage. Keep it that way.

## Running and checking

- There is no build, lint or test tooling, and no package.json. Open `index.html` in a browser (a file:// URL works). Edit, then refresh.
- `.claude/launch.json` defines a `todo-server` entry that expects a static file server on port 8000; nothing in the repo starts one.
- Node is not installed on this machine, so scripts like `node --check app.js` won't run. Verify changes by loading the page in a browser and using it, in all three themes.

## Architecture

Three files: `index.html` (static markup with fixed element ids), `style.css`, and `app.js` (all logic, one plain script, no modules).

**State and rendering.** `app.js` holds a module-level `tasks` array and re-renders everything from it. Every mutation follows the same path: change `tasks`, call `save()`, then `render()`. `render()` clears both lists and rebuilds them with `createItem()`. Do not patch the DOM by hand.

**View state is separate and not saved:** `editingId`, `searchText`, `priorityFilter`, `lastRemoved` (for Undo). Only three things are persisted in localStorage: tasks (`todo-tasks`), the theme (`todo-theme`) and the wallpaper index (`todo-wallpaper`).

**`load()` whitelists task fields.** It rebuilds each task from `id`, `text`, `done`, `priority` and `due` only. If you add a field to tasks, you must also add it to `load()` or it is silently dropped on the next page load. This is also where old saved data is given defaults.

**Ordering.** `render()` sorts with `compareTasks()` (priority, then earliest due date, undated last, ties in array order) and then splits the result into active and completed lists. The drag-and-drop handlers in `createItem()` reorder the `tasks` array through `swapTasks()`, but the sort overrides that order, so dragging only changes the order of tasks that share the same priority and due date.

**Undo.** `removeTasks(ids)` stores the removed tasks with their array indexes in `lastRemoved` and shows the toast. `hideToast()` clears `lastRemoved`, so Undo is only available while the toast is visible (6 seconds). Both single delete and "Clear completed" go through `removeTasks()`.

**Themes.** `style.css` defines all colors as CSS variables on `:root` (light) and overrides them in `body[data-theme="pastel"]` and `body[data-theme="dark"]`. New colors must be defined in all three blocks. Light is the default and has no `data-theme` attribute. Priority badge colors use the `--high-*`, `--medium-*` and `--low-*` variables.

**Security constraints.** `index.html` has a Content-Security-Policy that allows only same-origin scripts, so inline scripts and inline event handler attributes will not run; put code in `app.js`. Task text is written with `textContent`, never `innerHTML` with user data (`render()` only uses `innerHTML = ""` to clear).

**Wallpaper quirk.** The background gradient is applied through inline styles set from `app.js` (`initWallpaperStyles`, `setWallpaper`) rather than from `style.css` alone, as a workaround for CSS possibly not applying when opened from file://.

**Multiple tabs.** A `storage` event listener reloads `tasks` from localStorage when another tab changes them.

## Project conventions

- `RELEASES.md` is a release log, newest first, with a version and a date and time (24-hour local) for every change. When you change the app, add a new entry at the top with the real time (get it from `date`) and bump the version.
- `specs.md` has the feature list; keep it in step with what the app does.
- `NOTES.md` is the user's personal notes on Claude Code commands and is unrelated to the app.
