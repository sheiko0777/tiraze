import { readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { join, basename } from 'node:path';
const hash = (data) => createHash('sha256').update(data).digest('hex');
export async function restoreMedia(assets) {
  const parts = join(assets, 'source-masters'),
    manifest = JSON.parse(await readFile(join(parts, 'manifest.json'), 'utf8'));
  let restored = 0;
  for (const [name, info] of Object.entries(manifest)) {
    if (
      basename(name) !== name ||
      !Number.isSafeInteger(info.size) ||
      info.size < 1 ||
      info.size > 25 * 1024 * 1024 ||
      !/^[0-9a-f]{64}$/.test(info.sha256) ||
      !Array.isArray(info.parts) ||
      info.parts.some((p) => typeof p !== 'string' || basename(p) !== p)
    )
      throw new Error('Invalid media manifest');
    const target = join(assets, name);
    let existing;
    try {
      existing = await readFile(target);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (existing?.length === info.size && hash(existing) === info.sha256) continue;
    const data = Buffer.concat(await Promise.all(info.parts.map((p) => readFile(join(parts, p)))));
    if (data.length !== info.size || hash(data) !== info.sha256)
      throw new Error('Media integrity mismatch: ' + name);
    const temporary = target + '.restore-' + randomUUID();
    try {
      await writeFile(temporary, data, { flag: 'wx' });
      await rename(temporary, target);
    } finally {
      await unlink(temporary).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
    restored++;
  }
  return { verified: Object.keys(manifest).length, restored };
}
