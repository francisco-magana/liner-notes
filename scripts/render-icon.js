// `npm run icon`: renders build/icon.svg to build/icon.png (1024×1024).
// electron-builder makes the macOS .icns and Windows .ico from that PNG.
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ICON_SIZE = 1024;
const buildDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../build');

const svg = fs.readFileSync(path.join(buildDir, 'icon.svg'));
const png = new Resvg(svg, { fitTo: { mode: 'width', value: ICON_SIZE } }).render().asPng();
fs.writeFileSync(path.join(buildDir, 'icon.png'), png);

console.log(`Rendered build/icon.png (${ICON_SIZE}×${ICON_SIZE})`);
