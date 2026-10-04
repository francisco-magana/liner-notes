// The Express app: the API, the frontend files and error handling.
import express from 'express';
import path from 'node:path';
import { ROOT_DIR, VENDOR_FILES } from './config.js';
import { apiRoutes } from './routes/index.js';

export function createApp(store, spotify) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '20mb' })); // Room for album art uploaded as data URLs.

  app.use('/api', apiRoutes(store, spotify));

  // Frontend: no build step, so the files are served as they are.
  for (const [url, file] of Object.entries(VENDOR_FILES)) {
    app.get(url, (req, res) => res.type('text/javascript').sendFile(path.join(ROOT_DIR, file)));
  }
  app.use(express.static(path.join(ROOT_DIR, 'public')));

  app.use(handleError);
  return app;
}

/**
 * Sends errors as `{ error: message }`. Errors with a status (HttpError, bad JSON…)
 * show their message; unexpected ones are logged and get a generic message.
 * Express spots error handlers by their four arguments, so `next` stays although unused.
 */
function handleError(error, req, res, next) {
  const status = error.status || error.statusCode || 500;
  const isUnexpected = status >= 500 && !error.status;
  if (status >= 500) console.error(error);
  res.status(status).json({ error: isUnexpected ? 'SOMETHING WENT WRONG' : error.message });
}
