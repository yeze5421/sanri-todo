# Three Days

A gentler to-do list. Every task lives for three days, fades with time, and disappears after 72 hours with a simple thought: **Maybe it wasn't that important.**

## Run locally

Requires Node.js 18 or newer. No dependencies to install.

- On Windows, double-click `start.cmd`.
- From this folder, run `npm start` and open <http://localhost:4173>.
- To stop the server, press `Ctrl+C` in its terminal.

## Use your list

- The entire interface is in English, including sample tasks, dates, notifications, and accessibility labels.
- Your first visit opens a separate sample list. Move the time slider to see tasks fade and disappear without changing your personal list.
- Select **Start my list**, or add your first task, to begin your own list.
- Every task gets exactly **72 hours** from creation. Time keeps moving while the page is closed; expired tasks are cleared when you return.
- Completed tasks remain in **Done**. Expired tasks leave only a count, without retaining their titles.
- Completing a task or letting it go offers a brief undo. Undo keeps the original deadline.
- Press `Ctrl+K` on Windows or `Cmd+K` on macOS to focus the task input.

## Local storage

Your list is stored only in this browser's `localStorage`. It is not uploaded or synced across devices. Clearing this site's browser data clears your list.

Existing lists keep their text and original deadlines after the rename to Three Days. The app retains its original storage key for compatibility; old language preferences no longer affect the English interface.

## Checks

```sh
npm test
npm run check
```

Tests cover the 72-hour boundary, offline expiration, completed records, undo deadlines, storage validation, immutable state transitions, and safe text interpolation.
