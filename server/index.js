// `npm start`: runs Liner Notes as a local web app.
import { DB_PATH, HOST, PORT } from './config.js';
import { startServer } from './server.js';

const { url } = await startServer({ dbPath: DB_PATH, host: HOST, port: PORT });

console.log(`\n  Liner Notes is running at ${url}`);
console.log(`  Database: ${DB_PATH}\n`);
