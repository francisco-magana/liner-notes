// Deletes the database and creates a new one.
//   npm run reset             -> fresh database with the demo library
//   npm run reset -- --empty  -> fresh, empty database
import fs from 'node:fs';
import path from 'node:path';
import { DB_PATH } from './config.js';
import { openDatabase } from './database.js';
import { seedDemoSongs } from './seed.js';
import { createStore } from './store/index.js';

const startEmpty = process.argv.includes('--empty');

// SQLite in WAL mode keeps two extra files next to the database.
for (const suffix of ['', '-wal', '-shm']) fs.rmSync(DB_PATH + suffix, { force: true });

const { db } = openDatabase(DB_PATH);
if (!startEmpty) seedDemoSongs(createStore(db));
db.close();

console.log(`Reset ${path.relative(process.cwd(), DB_PATH)} ${startEmpty ? '(empty)' : '(with demo songs)'}`);
