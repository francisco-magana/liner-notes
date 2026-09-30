import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { createStore } from './store.js';
import { createSpotify } from './spotify.js';
import { seedSongs } from './seed.js';
import { apiRouter } from './routes.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 4321;
const HOST = process.env.HOST || '127.0.0.1';
const DB_PATH = path.resolve(root, process.env.DB_PATH || 'data/linernotes.db');

const { db, fresh } = openDb(DB_PATH);
const store = createStore(db);
if (fresh && process.env.SEED !== '0') seedSongs(store);
const spotify = createSpotify(() => store.getSettings());

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '20mb' }));
app.use('/api', apiRouter(store, spotify));

// Frontend: static files plus the two ES-module libraries it imports (no build step).
const vendor = {
  '/vendor/preact.mjs': 'node_modules/preact/dist/preact.mjs',
  '/vendor/htm.mjs': 'node_modules/htm/dist/htm.mjs'
};
for (const [url, file] of Object.entries(vendor)) {
  app.get(url, (req, res) => res.type('text/javascript').sendFile(path.join(root, file)));
}
app.use(express.static(path.join(root, 'public')));

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 && !err.status ? 'SOMETHING WENT WRONG' : err.message });
});

app.listen(PORT, HOST, () => {
  const shown = HOST === '127.0.0.1' || HOST === '0.0.0.0' ? 'localhost' : HOST;
  console.log(`\n  Liner Notes is running at http://${shown}:${PORT}`);
  console.log(`  Database: ${DB_PATH}\n`);
});
