import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist');
const publicPaths = [
    'index.html',
    '_headers',
    'robots.txt',
    'sitemap.xml',
    'assets/css/omid-os.css',
    'assets/data/portfolio.js',
    'assets/js/omid-terminal.js',
    'assets/cv',
    'assets/vendor/xterm'
];

fs.rmSync(dist, { recursive: true, force: true });

for (const relativePath of publicPaths) {
    const source = path.join(root, relativePath);
    const destination = path.join(dist, relativePath);
    if (!fs.existsSync(source)) throw new Error(`Missing public asset: ${relativePath}`);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.cpSync(source, destination, { recursive: true });
}

console.log(`Built ${publicPaths.length} public paths in dist/`);
