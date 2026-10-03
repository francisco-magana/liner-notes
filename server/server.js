// Starts the Liner Notes server: opens the database, then serves the API and the web app.
// Used by both `npm start` (server/index.js) and the desktop app (electron/main.js).
import { createApp } from './app.js';
import { openDatabase } from './database.js';
import { createSpotifyClient } from './spotify.js';
import { createStore } from './store/index.js';

/**
 * Resolves to `{ url, close }` once the server is listening.
 * Pass `port: 0` to let the system pick a free port.
 */
export function startServer({ dbPath, host, port }) {
  const db = openDatabase(dbPath);
  const store = createStore(db);
  const spotify = createSpotifyClient(() => store.settings.get());
  const app = createApp(store, spotify);

  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, error => {
      if (error) {
        db.close();
        reject(error);
        return;
      }
      const displayHost = host === '127.0.0.1' || host === '0.0.0.0' ? 'localhost' : host;
      resolve({
        url: `http://${displayHost}:${server.address().port}`,
        close() {
          server.close();
          server.closeAllConnections();
          db.close();
        }
      });
    });
  });
}
