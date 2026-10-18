import { it, expect } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { restoreMedia } from '../../tools/restore-media.mjs';
it('reassembles a missing video from tracked parts, verifies SHA-256 and rejects corruption', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'tiraze-media-'));
  try {
    await mkdir(join(folder, 'source-masters'));
    const bytes = Buffer.from('synthetic test MP4 bytes');
    const entry = {
      size: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      parts: ['hero.part01', 'hero.part02'],
    };
    await writeFile(
      join(folder, 'source-masters', 'manifest.json'),
      JSON.stringify({ 'hero.mp4': entry }),
    );
    await writeFile(join(folder, 'source-masters', 'hero.part01'), bytes.subarray(0, 10));
    await writeFile(join(folder, 'source-masters', 'hero.part02'), bytes.subarray(10));
    expect(await restoreMedia(folder)).toEqual({ verified: 1, restored: 1 });
    expect(await readFile(join(folder, 'hero.mp4'))).toEqual(bytes);
    expect(await restoreMedia(folder)).toEqual({ verified: 1, restored: 0 });
    await writeFile(join(folder, 'hero.mp4'), 'corrupt existing');
    await writeFile(join(folder, 'source-masters', 'hero.part01'), 'bad source');
    await expect(restoreMedia(folder)).rejects.toThrow('Media integrity mismatch');
  } finally {
    const actual = await realpath(folder),
      allowed = await realpath(tmpdir());
    if (dirname(actual) !== allowed || !basename(actual).startsWith('tiraze-media-'))
      throw new Error('Unsafe test cleanup');
    await rm(actual, { recursive: true });
  }
});
