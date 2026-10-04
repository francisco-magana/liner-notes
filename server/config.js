// Settings read from environment variables, with defaults for local use.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** The project folder (one level above server/). */
export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const PORT = Number(process.env.PORT) || 4321;
export const HOST = process.env.HOST || '127.0.0.1';
export const DB_PATH = path.resolve(ROOT_DIR, process.env.DB_PATH || 'data/linernotes.db');

/** The ES-module libraries the frontend imports (see the import map in index.html): URL → file. */
export const VENDOR_FILES = {
  '/vendor/preact.mjs': 'node_modules/preact/dist/preact.mjs',
  '/vendor/preact-hooks.mjs': 'node_modules/preact/hooks/dist/hooks.mjs',
  '/vendor/htm.mjs': 'node_modules/htm/dist/htm.mjs'
};
