// `npm run vendor`: copies the frontend's libraries (see the import map in index.html) into
// public/vendor/. The Tauri app serves public/ as plain files, without the server that
// otherwise serves them from node_modules. Runs before `tauri dev` and `tauri build`.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT_DIR, VENDOR_FILES } from '../server/config.js';

for (const [url, file] of Object.entries(VENDOR_FILES)) {
  const target = path.join(ROOT_DIR, 'public', url);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(ROOT_DIR, file), target);
}

console.log(`Copied ${Object.keys(VENDOR_FILES).length} files to public/vendor/`);
