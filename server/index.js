// Starts Liner Notes: opens the database, then serves the API and the web app.
import { createApp } from './app.js';
import { DB_PATH, HOST, PORT, SEED_DEMO_SONGS } from './config.js';
import { openDatabase } from './database.js';
import { seedDemoSongs } from './seed.js';
import { createSpotifyClient } from './spotify.js';
import { createStore } from './store/index.js';

const { db, isNew } = openDatabase(DB_PATH);
const store = createStore(db);
if (isNew && SEED_DEMO_SONGS) seedDemoSongs(store);

const spotify = createSpotifyClient(() => store.settings.get());
const app = createApp(store, spotify);

app.listen(PORT, HOST, () => {
  const displayHost = HOST === '127.0.0.1' || HOST === '0.0.0.0' ? 'localhost' : HOST;
  console.log(`\n  Liner Notes is running at http://${displayHost}:${PORT}`);
  console.log(`  Database: ${DB_PATH}\n`);
});
