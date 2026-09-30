# Liner Notes

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

On first run the app creates `data/linernotes.db` and fills it with a small demo library. To start empty instead:

```bash
npm run reset -- --empty
```

## Scripts

| Command                    | What it does                                          |
| -------------------------- | ----------------------------------------------------- |
| `npm start`                | Start the app                                         |
| `npm run dev`              | Start and restart automatically when server files change |
| `npm run reset`            | Delete the database and recreate it with demo songs   |
| `npm run reset -- --empty` | Delete the database and start with an empty library   |

## Configuration

Optional environment variables:

| Variable  | Default              | Meaning                                                            |
| --------- | -------------------- | ------------------------------------------------------------------ |
| `PORT`    | `4321`               | Port to listen on                                                  |
| `HOST`    | `127.0.0.1`          | Interface to bind. Set `0.0.0.0` to allow other devices on your network |
| `DB_PATH` | `data/linernotes.db` | Where the SQLite database lives                                    |
| `SEED`    | `1`                  | Set to `0` to skip the demo songs when a new database is created   |

## Your data

- Everything (songs, lyrics, notes, reflections, album art, settings) is in the single file `data/linernotes.db`. It is ignored by git.
- **Back up:** stop the app and copy that file. **Restore:** put the copy back.
- Album art is stored in the database too, so the file is all you need.

## Spotify (optional)

1. Create an app in the [Spotify developer dashboard](https://developer.spotify.com/dashboard).
2. In Liner Notes, open **Settings**, then paste the app's Client ID and Client secret. Use **Test connection** to check them, then **Save**.
3. On **+ Add song**, search Spotify to fill in the form, or use **Add all** on an album result to import every track.

The credentials are stored in the local database. All Spotify requests go through the local server, never directly from the browser.

## How it's built

A single Node.js process serves both the API and the web app.

```
server/
  index.js      Startup: open the database, start listening
  app.js        Express app: API, frontend files, error handling
  config.js     Environment variables and paths
  database.js   Schema, connection (node:sqlite) and transactions
  errors.js     HttpError: errors shown to the user
  artInput.js   Album art sent by the client: data URLs, downloads, stored-art URLs
  spotify.js    Spotify client-credentials client
  seed.js       Demo library
  reset.js      `npm run reset`
  routes/       REST endpoints under /api (songs and reflections, art, settings, spotify)
  store/        Database access, one file per table, plus input validation
public/
  index.html  Page shell and import map
  app.js      Entry point: mounts <App>
  api.js      Fetch wrapper for the API
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
- **Backend:** [Express 5](https://expressjs.com) plus the built-in `node:sqlite`.
- **Tables:** `songs`, `reflections` (cascade-deleted with their song), `art` (image BLOBs, shared by songs from the same album, and pruned once nothing uses them) and `settings`.
