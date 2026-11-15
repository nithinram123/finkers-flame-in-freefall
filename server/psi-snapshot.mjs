import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

let pending;

export function loadPsiSnapshot() {
  pending ??= readFile(resolve(process.cwd(), 'public/data/combustion.json'), 'utf8')
    .then(JSON.parse)
    .catch((error) => {
      pending = undefined;
      throw error;
    });
  return pending;
}
