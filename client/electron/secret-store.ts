import { app, safeStorage } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';

function keyPath() {
  return path.join(app.getPath('userData'), 'credentials', 'curseforge-key.bin');
}

export async function readCurseForgeKey(): Promise<string | undefined> {
  if (process.env.CURSEFORGE_API_KEY) return process.env.CURSEFORGE_API_KEY;
  try {
    if (!safeStorage.isEncryptionAvailable()) return undefined;
    return safeStorage.decryptString(await fs.readFile(keyPath()));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

export async function curseForgeKeyStatus() {
  return { configured: Boolean(await readCurseForgeKey()), secureStorageAvailable: safeStorage.isEncryptionAvailable() };
}

export async function saveCurseForgeKey(value: unknown) {
  if (typeof value !== 'string' || !value.trim() || value.length > 500) throw new Error('Enter a valid CurseForge API key');
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Windows encrypted storage is unavailable');
  const key = value.trim();
  const response = await fetch('https://api.curseforge.com/v1/games?index=0&pageSize=1', {
    headers: { 'x-api-key': key, Accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  });
  if (response.status === 401 || response.status === 403) throw new Error('CurseForge rejected this key');
  if (!response.ok) throw new Error(`CurseForge validation failed (${response.status})`);
  const file = keyPath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, safeStorage.encryptString(key));
  return { configured: true, secureStorageAvailable: true };
}

export async function clearCurseForgeKey() {
  try { await fs.unlink(keyPath()); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  return curseForgeKeyStatus();
}
