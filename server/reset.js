// Deletes the database. Pass --empty to start with no demo songs.
//   npm run reset             -> fresh database with the demo library
//   npm run reset -- --empty  -> fresh, empty database
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { createStore } from './store.js';
import { seedSongs } from './seed.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DB_PATH = path.resolve(root, process.env.DB_PATH || 'data/linernotes.db');

for (const suffix of ['', '-wal', '-shm']) fs.rmSync(DB_PATH + suffix, { force: true });

const { db } = openDb(DB_PATH);
if (!process.argv.includes('--empty')) seedSongs(createStore(db));
db.close();

console.log(`Reset ${path.relative(process.cwd(), DB_PATH)}${process.argv.includes('--empty') ? ' (empty)' : ' (with demo songs)'}`);
