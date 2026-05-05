import { cp, mkdir, rm, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDirectory = path.join(rootDirectory, 'dist');

await rm(distDirectory, { force: true, recursive: true });
await mkdir(distDirectory, { recursive: true });
await copyFile(path.join(rootDirectory, 'index.html'), path.join(distDirectory, 'index.html'));
await cp(path.join(rootDirectory, 'src'), path.join(distDirectory, 'src'), { recursive: true });

console.log('Built static bundle in dist/.');
