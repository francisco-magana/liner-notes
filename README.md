<p align="center">
  <img src="build/icon.png" alt="Liner Notes icon" width="128" height="128">
</p>

<h1 align="center">Liner Notes</h1>

A personal song journal that runs on your own computer. Keep a library of songs, annotate lyrics line by line, write dated reflections, and browse a monthly listening diary.

- **Library:** songs, artists and albums, with search, filters and sorting.
- **Song page:** lyrics with per-line notes, rating, moods and details.
- **Reflections:** dated writing about a song, with one-click lyric quotes.
- **Diary:** a monthly calendar of activity, with stats plus rating and mood breakdowns.
- **Spotify lookup (optional):** fill in song, album or artist details, or import a whole album in one go.
- **Light and dark themes.**

Everything is stored in a local SQLite database file. Nothing goes to the cloud. The only outside calls are optional Spotify lookups and Google Fonts.

## Requirements

- [Node.js](https://nodejs.org) **22.13 or newer** (24 LTS recommended). Nothing else is needed. The database is Node's built-in SQLite, so there are no native modules to compile.

## Getting started

```bash
git clone <this repo> liner-notes
cd liner-notes
npm install
npm start
```

Then open **http://localhost:4321**.

On first run the app creates an empty library in `data/linernotes.db`.

## Desktop app

Liner Notes can also be installed as a desktop app, built with [Tauri](https://tauri.app): a 4 MB download and 8 MB installed. It uses the system's own webview and a Rust backend (`src-tauri/`) in place of the Node server, with the same database format. Installers aren't published yet, so you build one on your own computer. Each system builds its own installer: build on a Mac for macOS, on Windows for Windows.

So far it has only been built and tested on macOS.

### Requirements

- [Node.js](https://nodejs.org) **22.13 or newer**, as for the browser version.
- [Rust](https://rustup.rs), installed with rustup:

  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```

  Open a new terminal afterwards so `cargo` is on your PATH.
- Your system's build tools:

  | System  | Install                                                                                  |
  | ------- | ---------------------------------------------------------------------------------------- |
  | macOS   | Xcode Command Line Tools: `xcode-select --install`                                       |
  | Windows | [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/), with **Desktop development with C++**. WebView2 already comes with Windows 10 and 11. |
  | Linux   | On Debian or Ubuntu: `sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev` |

  For other Linux distributions, see [Tauri's prerequisites](https://tauri.app/start/prerequisites/).

### Build

```bash
npm install
npm run tauri:build
```

The first build takes a few minutes. Cargo downloads and compiles the Rust dependencies, which needs an internet connection and about 2 GB of disk space in `src-tauri/target/`. Later builds are much faster.

Each system builds its own installer into `src-tauri/target/release/bundle/`:

- **macOS:** `dmg/Liner Notes_<version>_aarch64.dmg` (or `x64` on Intel Macs), plus the app itself in `macos/`. A build you made yourself opens normally. If you copied the `.dmg` from another computer, macOS may say the app is damaged; run `xattr -cr "/Applications/Liner Notes.app"` once to fix it.
- **Windows:** an `.msi` in `msi/` and a setup `.exe` in `nsis/`.
- **Linux:** a `.deb`, an `.rpm` and an `.AppImage`.

To try the app without building an installer, run `npm run tauri:dev`. It opens a window with the developer tools available (right-click, then **Inspect Element**), and Rust errors print in the terminal.

### Your data

The desktop app keeps its own library, separate from the browser version's `data/linernotes.db`:

| System  | Database file                                                               |
| ------- | --------------------------------------------------------------------------- |
| macOS   | `~/Library/Application Support/com.franciscomagana.linernotes/linernotes.db` |
| Windows | `%APPDATA%\com.franciscomagana.linernotes\linernotes.db`                     |
| Linux   | `~/.local/share/com.franciscomagana.linernotes/linernotes.db`                |

The file format is the same, so to move your library from one to the other, quit both and copy the file across. To open a different file without copying, set `DB_PATH`, for example to try the app on a copy of your library:

```bash
cp data/linernotes.db /tmp/linernotes-test.db
DB_PATH=/tmp/linernotes-test.db npm run tauri:dev
```

## Scripts

| Command                    | What it does                                          |
| -------------------------- | ----------------------------------------------------- |
| `npm start`                | Start the app                                         |
| `npm run dev`              | Start and restart automatically when server files change |
| `npm run tauri:dev`        | Open the desktop app without installing it            |
| `npm run tauri:build`      | Build the desktop installer into `src-tauri/target/release/bundle/` |
| `npm run vendor`           | Copy Preact and htm into `public/vendor/` (runs automatically before the desktop commands) |
| `npm run icon`             | Render `build/icon.svg` to the app icon `build/icon.png` |

## Configuration

Optional environment variables:

| Variable  | Default              | Meaning                                                            |
| --------- | -------------------- | ------------------------------------------------------------------ |
| `PORT`    | `4321`               | Port to listen on                                                  |
| `HOST`    | `127.0.0.1`          | Interface to bind. Set `0.0.0.0` to allow other devices on your network |
| `DB_PATH` | `data/linernotes.db` | Where the SQLite database lives                                    |

## Your data

- Everything (songs, lyrics, notes, reflections, album art, settings) is in a single file: `data/linernotes.db` for the browser version (ignored by git), or the file listed under [Desktop app](#desktop-app).
- **Back up:** quit the app and copy that file. **Restore:** put the copy back.
- **Start over:** quit the app and delete the file (plus any `-wal`/`-shm` files next to it). An empty library is created on the next start.
- Album art is stored in the database too, so the file is all you need.

## Spotify (optional)

1. Create an app in the [Spotify developer dashboard](https://developer.spotify.com/dashboard).
2. In Liner Notes, open **Settings**, then paste the app's Client ID and Client secret. Use **Test connection** to check them, then **Save**.
3. On **+ Add song**, search Spotify to fill in the form, or use **Add all** on an album result to import every track.

The credentials are stored in the local database. All Spotify requests go through the local server (or the Rust backend in the desktop app), never directly from the browser.

## How it's built

In the browser version, a single Node.js process serves both the API and the web app. The desktop app shows the same frontend in the system webview, and its Rust backend answers the same API calls as Tauri commands instead of HTTP requests (see `public/api.js`).

```
build/
  icon.svg      Desktop app icon (source)
  icon.png      Rendered by `npm run icon`; `npx tauri icon build/icon.png -o src-tauri/icons` makes the app icons from it
scripts/
  render-icon.js
  copy-vendor.js  `npm run vendor`: copies Preact and htm into public/vendor/
src-tauri/
  tauri.conf.json  Desktop app settings: window, bundle, identifier
  src/lib.rs       Desktop app: database, commands, the art:// protocol for album art
  src/commands.rs  The commands api.js calls, one per /api endpoint
  src/store/       Database access and validation, ported from server/store/
server/
  index.js      `npm start`: starts the server from environment settings
  server.js     startServer(): database, store and Express app, listening
  app.js        Express app: API, frontend files, error handling
  config.js     Environment variables and paths
  database.js   Schema, connection (node:sqlite) and transactions
  errors.js     HttpError: errors shown to the user
  artInput.js   Album art sent by the client: data URLs, downloads, stored-art URLs
  spotify.js    Spotify client-credentials client
  routes/       REST endpoints under /api (songs and reflections, art, settings, spotify)
  store/        Database access, one file per table, plus input validation
public/
  index.html  Page shell and import map
  app.js      Entry point: mounts <App>
  api.js      API calls: fetch to the server, or Tauri commands in the desktop app
  styles.css  Theme tokens and shared utility classes
  components/
    App.js        Top-level state, navigation and actions
    common.css    Styles for the shared components (nav, toast, stars…)
    library/      Library view: song, artist and album lists
    song-form/    Add and edit a song, plus the Spotify search panel
    song-detail/  Song page: lyrics with notes, and reflections
    reflection/   Reflection editor
    diary/        Monthly diary and stats
    settings/     Settings modal
  hooks/      Shared state: songs, settings, toast, system theme
  lib/        Pure helpers: formatting, songs, Spotify results, theme values
```

- **Frontend:** [Preact](https://preactjs.com) with [htm](https://github.com/developit/htm) tagged templates, loaded as native ES modules from `node_modules`. There is no bundler or build step.
- **Styles:** each component folder has its own stylesheet, such as `library/library.css`, using `block__element--modifier` class names. States like `is-active` are modifier classes. Only runtime values (album art images and bar-chart widths) are set inline. New stylesheets must be linked in `index.html` after `styles.css`.
- **Backend (browser version):** [Express 5](https://expressjs.com) plus the built-in `node:sqlite`.
- **Backend (desktop app):** [Tauri 2](https://tauri.app) with [rusqlite](https://github.com/rusqlite/rusqlite) and [reqwest](https://github.com/seanmonstar/reqwest), in `src-tauri/`. Changes to the API or the database go in both backends.
- **Tables:** `songs`, `reflections` (cascade-deleted with their song), `art` (image BLOBs, shared by songs from the same album, and pruned once nothing uses them) and `settings`.

## Screenshots

**Library:** songs with album art, ratings and filters.

![Library](docs/screenshots/library.png)

**Song page:** lyrics with notes on individual lines.

![Song page with lyrics and notes](docs/screenshots/lyrics.png)

**Diary:** days with entries, stats, and rating and mood breakdowns for the month.

![Diary](docs/screenshots/diary.png)
