import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
// Offline operations module. Never import into the storefront worker.
export function backupKey(value: string): Buffer {
  if (!/^[0-9a-f]{64}$/i.test(value)) throw new Error('A 32-byte backup key in hex is required');
  return Buffer.from(value, 'hex');
}
export function encryptBackup(plaintext: Uint8Array, key: Buffer): string {
  const metadata = { version: 1, algorithm: 'AES-256-GCM', createdAt: new Date().toISOString() };
  const aad = Buffer.from(JSON.stringify(metadata)),
    iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(aad);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return JSON.stringify({
    ...metadata,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: encrypted.toString('base64'),
  });
}
export function decryptBackup(source: string, key: Buffer): Buffer {
  const blob = JSON.parse(source);
  if (blob.version !== 1 || blob.algorithm !== 'AES-256-GCM' || typeof blob.createdAt !== 'string')
    throw new Error('Unsupported backup format');
  const iv = Buffer.from(blob.iv, 'base64'),
    tag = Buffer.from(blob.tag, 'base64');
  if (iv.length !== 12 || tag.length !== 16) throw new Error('Invalid backup envelope');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAAD(
    Buffer.from(
      JSON.stringify({
        version: blob.version,
        algorithm: blob.algorithm,
        createdAt: blob.createdAt,
      }),
    ),
  );
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(Buffer.from(blob.data, 'base64')), decipher.final()]);
}
