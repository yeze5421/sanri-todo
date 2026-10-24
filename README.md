# Three Days

A gentle, offline Windows desktop to-do list. Every task lives for three days, fades with time, and disappears after 72 hours with a simple thought: **Maybe it wasn't that important.**

## Open the desktop app

Double-click `dist/Three Days.exe`, or use `start.cmd` from the project folder after building it. The portable app includes its runtime: no browser, local web server, Node.js installation, account, or internet connection is needed to use it.

The app runs in its own window. Closing the window quits the app; opening it again restores your list and clears tasks whose original 72 hours have passed. Launching it twice focuses the existing window.

## Use your list

- The entire interface is in English, including sample tasks, dates, notifications, and accessibility labels.
- Your first visit opens a separate sample list. Move the time slider to see tasks fade and disappear without changing your personal list.
- Select **Start my list**, or add your first task, to begin your own list.
- Every task gets exactly **72 hours** from creation. Time keeps moving while the app is closed; expired tasks are cleared when you return.
- Completed tasks remain in **Done**. Expired tasks leave only a count, without retaining their titles.
- Completing a task or letting it go offers a brief undo. Undo keeps the original deadline.
- Press `Ctrl+K` to focus the task input.

## Local data

Desktop data is stored under `%APPDATA%\Three Days`, separately from the executable. Moving or replacing the executable does not reset your list. Removing this data folder clears the desktop list.

The desktop app uses its own local profile. Existing data in the earlier browser version remains in that browser and is not automatically copied or synced into the desktop app. The original storage key is retained within each profile for compatibility.

## Development and builds

Requires Node.js 22.14 or newer. Build dependencies are pinned in `package-lock.json`.

```sh
npm ci
npm start
```

Create the portable Windows x64 executable:

```sh
npm run build:win
```

The output is `dist/Three Days.exe`. `dist/win-unpacked/Three Days.exe` is also runnable, but must stay with the other files in that folder. Build output is ignored by Git. The build command never publishes releases.

For the optional browser preview, run `npm run web` and open <http://localhost:4173>. The desktop app does not use this server.

The desktop wrapper uses [Electron](https://www.electronjs.org/docs/latest/tutorial/security) with sandboxed local content, isolated contexts, and a fixed asset allowlist. Packaging uses [electron-builder's portable Windows target](https://www.electron.build/v26/docs/nsis/#portable).

## Checks

```sh
npm test
npm run check
npm run test:desktop
```

Tests cover the 72-hour boundary, offline expiration, completed records, undo deadlines, storage validation, immutable state transitions, safe text interpolation, and desktop asset/navigation boundaries.

The desktop smoke check launches hidden app windows with a disposable profile, then reopens the app in a new process to verify saved tasks and offline expiration. It never reads or changes your real desktop profile.
