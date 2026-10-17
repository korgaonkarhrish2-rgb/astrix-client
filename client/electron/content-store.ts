import { app, dialog } from 'electron';
import { createHash } from 'node:crypto';
import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { unzipSync } from 'fflate';
import { readCurseForgeKey } from './secret-store';

const VALID_ID = /^[a-zA-Z0-9._-]{1,80}$/;

export type ProfileContentFile = {
  id: string;
  profileId: string;
  fileName: string;
  name: string;
  version?: string;
  description?: string;
  enabled: boolean;
  size: number;
  sha1: string;
  sha512: string;
  curseForgeFingerprint: number;
  source?: 'modrinth' | 'curseforge' | 'local';
  projectId?: string;
  slug?: string;
};

export type ModrinthVersionOption = { id: string; name: string; versionNumber: string; datePublished: string; featured: boolean; fileName: string };
type ModrinthVersion = { id: string; project_id: string; name: string; version_number: string; date_published: string; featured: boolean; dependencies?: Array<{ version_id?: string | null; project_id?: string | null; dependency_type?: string }>; files?: Array<{ url: string; filename: string; primary?: boolean; hashes?: { sha1?: string; sha512?: string } }> };

function profileDirectory(profileId: unknown) {
  if (typeof profileId !== 'string' || !VALID_ID.test(profileId)) throw new Error('Invalid profile id');
  return path.join(app.getPath('userData'), 'profiles', profileId);
}

async function hashes(filePath: string) {
  const sha1 = createHash('sha1');
  const sha512 = createHash('sha512');
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of createReadStream(filePath)) {
    const buffer = Buffer.from(chunk as Buffer);
    sha1.update(buffer); sha512.update(buffer);
    if (total <= 16 * 1024 * 1024) chunks.push(buffer);
    total += buffer.length;
  }
  return { sha1: sha1.digest('hex'), sha512: sha512.digest('hex'), bytes: total <= 16 * 1024 * 1024 ? Buffer.concat(chunks) : undefined };
}

function murmurHash2(input: Uint8Array) {
  const data = input.filter((byte) => ![9, 10, 13, 32].includes(byte));
  let hash = 1 ^ data.length;
  let offset = 0;
  while (data.length - offset >= 4) {
    let value = (data[offset] | data[offset + 1] << 8 | data[offset + 2] << 16 | data[offset + 3] << 24) >>> 0;
    value = Math.imul(value, 0x5bd1e995) >>> 0; value ^= value >>> 24; value = Math.imul(value, 0x5bd1e995) >>> 0;
    hash = Math.imul(hash, 0x5bd1e995) >>> 0 ^ value; offset += 4;
  }
  if (data.length - offset === 3) hash ^= data[offset + 2] << 16;
  if (data.length - offset >= 2) hash ^= data[offset + 1] << 8;
  if (data.length - offset >= 1) { hash ^= data[offset]; hash = Math.imul(hash, 0x5bd1e995) >>> 0; }
  hash ^= hash >>> 13; hash = Math.imul(hash, 0x5bd1e995) >>> 0; hash ^= hash >>> 15;
  return hash >>> 0;
}

function readJarMetadata(bytes: Buffer | undefined, fallback: string) {
  if (!bytes) return { name: fallback };
  try {
    const files = unzipSync(bytes, { filter: (file) => ['fabric.mod.json', 'quilt.mod.json'].includes(file.name) });
    const metadataBytes = files['fabric.mod.json'] || files['quilt.mod.json'];
    if (!metadataBytes) return { name: fallback };
    const metadata = JSON.parse(Buffer.from(metadataBytes).toString('utf8')) as Record<string, unknown>;
    const quilt = metadata.quilt_loader as { metadata?: Record<string, unknown>; version?: string } | undefined;
    const source = quilt?.metadata || metadata;
    return {
      name: typeof source.name === 'string' ? source.name : fallback,
      version: typeof metadata.version === 'string' ? metadata.version : quilt?.version,
      description: typeof source.description === 'string' ? source.description.slice(0, 500) : undefined,
    };
  } catch { return { name: fallback }; }
}

async function inspectFile(profileId: string, filePath: string): Promise<ProfileContentFile> {
  const stat = await fs.stat(filePath);
  const digest = await hashes(filePath);
  const rawName = path.basename(filePath).replace(/\.disabled$/i, '').replace(/\.jar$/i, '');
  const metadata = readJarMetadata(digest.bytes, rawName);
  return {
    id: digest.sha1, profileId, fileName: path.basename(filePath), enabled: !filePath.endsWith('.disabled'), size: stat.size,
    sha1: digest.sha1, sha512: digest.sha512, curseForgeFingerprint: digest.bytes ? murmurHash2(digest.bytes) : 0,
    source: 'local', ...metadata,
  };
}

async function identifyFiles(files: ProfileContentFile[]) {
  if (!files.length) return files;
  try {
    const response = await fetch('https://api.modrinth.com/v2/version_files', {
      method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'AstrixClient/0.1.0' },
      body: JSON.stringify({ hashes: files.map((file) => file.sha1), algorithm: 'sha1' }), signal: AbortSignal.timeout(8000),
    });
    if (response.ok) {
      const matches = await response.json() as Record<string, { project_id?: string; name?: string; version_number?: string }>;
      files = files.map((file) => matches[file.sha1] ? { ...file, source: 'modrinth', projectId: matches[file.sha1].project_id, name: matches[file.sha1].name || file.name, version: matches[file.sha1].version_number || file.version } : file);
    }
  } catch { /* Offline identification is non-fatal. */ }
  const apiKey = await readCurseForgeKey();
  if (apiKey) {
    try {
      const response = await fetch('https://api.curseforge.com/v1/fingerprints/432', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': apiKey }, body: JSON.stringify({ fingerprints: files.map((file) => file.curseForgeFingerprint).filter(Boolean) }), signal: AbortSignal.timeout(8000) });
      if (response.ok) {
        const payload = await response.json() as { data?: { exactMatches?: Array<{ id?: number; file?: { fileName?: string } }> } };
        const byName = new Map((payload.data?.exactMatches || []).map((match) => [match.file?.fileName?.toLowerCase(), match]));
        files = files.map((file) => byName.has(file.fileName.replace(/\.disabled$/i, '').toLowerCase()) ? { ...file, source: 'curseforge', projectId: String(byName.get(file.fileName.replace(/\.disabled$/i, '').toLowerCase())?.id || '') } : file);
      }
    } catch { /* Optional provider. */ }
  }
  return files;
}

export async function listProfileMods(profileIdValue: unknown) {
  const profileId = typeof profileIdValue === 'string' ? profileIdValue : '';
  const directory = path.join(profileDirectory(profileId), 'mods');
  await fs.mkdir(directory, { recursive: true });
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const paths = entries.filter((entry) => entry.isFile() && (/\.jar$/i.test(entry.name) || /\.jar\.disabled$/i.test(entry.name))).map((entry) => path.join(directory, entry.name));
  return identifyFiles(await Promise.all(paths.map((filePath) => inspectFile(profileId, filePath))));
}

export async function chooseModFiles(profileId: unknown) {
  const result = await dialog.showOpenDialog({ title: 'Import mod JAR files', properties: ['openFile', 'multiSelections'], filters: [{ name: 'Minecraft mods', extensions: ['jar'] }] });
  if (result.canceled) return listProfileMods(profileId);
  return importModFiles(profileId, result.filePaths);
}

export async function importModFiles(profileIdValue: unknown, filePathsValue: unknown) {
  const profileId = typeof profileIdValue === 'string' ? profileIdValue : '';
  const destination = path.join(profileDirectory(profileId), 'mods');
  await fs.mkdir(destination, { recursive: true });
  const paths = Array.isArray(filePathsValue) ? filePathsValue.filter((value): value is string => typeof value === 'string' && /\.jar$/i.test(value)).slice(0, 50) : [];
  for (const source of paths) {
    const stat = await fs.stat(source);
    if (!stat.isFile() || stat.size > 512 * 1024 * 1024) throw new Error('Mod file is too large or invalid');
    const digest = await hashes(source);
    const cachePath = path.join(app.getPath('userData'), 'content-cache', `${digest.sha512}.jar`);
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    try { await fs.copyFile(source, cachePath, fs.constants.COPYFILE_EXCL); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
    let target = path.join(destination, path.basename(source));
    try { await fs.access(target); target = path.join(destination, `${path.parse(source).name}-${digest.sha1.slice(0, 8)}.jar`); } catch { /* available */ }
    try { await fs.link(cachePath, target); } catch { await fs.copyFile(cachePath, target); }
    const installedDigest = await hashes(target);
    if (installedDigest.sha512 !== digest.sha512) { await fs.rm(target, { force: true }); throw new Error('Hash verification failed after import'); }
  }
  return listProfileMods(profileId);
}

export async function setModEnabled(profileIdValue: unknown, fileNameValue: unknown, enabledValue: unknown) {
  const profileId = typeof profileIdValue === 'string' ? profileIdValue : '';
  const fileName = typeof fileNameValue === 'string' ? path.basename(fileNameValue) : '';
  if (!/\.jar(\.disabled)?$/i.test(fileName)) throw new Error('Invalid mod filename');
  const enabled = enabledValue === true;
  const directory = path.join(profileDirectory(profileId), 'mods');
  const source = path.join(directory, fileName);
  const targetName = enabled ? fileName.replace(/\.disabled$/i, '') : fileName.endsWith('.disabled') ? fileName : `${fileName}.disabled`;
  if (targetName !== fileName) await fs.rename(source, path.join(directory, targetName));
  return listProfileMods(profileId);
}

function safeCatalogId(value: unknown) {
  const id = typeof value === 'string' ? value : '';
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) throw new Error('Invalid catalog id');
  return id;
}

async function modrinthJson<T>(url: URL | string): Promise<T> {
  const response = await fetch(url, { headers: { 'user-agent': 'AstrixClient/0.1.0' }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Modrinth returned ${response.status}`);
  return response.json() as Promise<T>;
}

export async function listModrinthVersions(projectIdValue: unknown, gameVersionValue: unknown, loaderValue: unknown): Promise<ModrinthVersionOption[]> {
  const projectId = safeCatalogId(projectIdValue);
  const gameVersion = typeof gameVersionValue === 'string' ? gameVersionValue.slice(0, 30) : '';
  const loader = typeof loaderValue === 'string' ? loaderValue.slice(0, 30) : '';
  const url = new URL(`https://api.modrinth.com/v2/project/${projectId}/version`);
  url.searchParams.set('game_versions', JSON.stringify([gameVersion]));
  url.searchParams.set('loaders', JSON.stringify([loader]));
  const versions = await modrinthJson<ModrinthVersion[]>(url);
  return versions.slice(0, 50).map((version) => ({ id: version.id, name: version.name, versionNumber: version.version_number, datePublished: version.date_published, featured: version.featured, fileName: (version.files?.find((file) => file.primary) || version.files?.[0])?.filename || '' }));
}

async function installRemoteFile(profileId: string, file: NonNullable<ModrinthVersion['files']>[number]) {
  const expectedSha512 = file.hashes?.sha512;
  const expectedSha1 = file.hashes?.sha1;
  if (!expectedSha512 && !expectedSha1) throw new Error(`No trusted hash was supplied for ${file.filename}`);
  const response = await fetch(file.url, { headers: { 'user-agent': 'AstrixClient/0.1.0' }, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Download failed with ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 512 * 1024 * 1024) throw new Error('Downloaded artifact is too large');
  const actualSha512 = createHash('sha512').update(bytes).digest('hex');
  const actualSha1 = createHash('sha1').update(bytes).digest('hex');
  if ((expectedSha512 && actualSha512 !== expectedSha512) || (expectedSha1 && actualSha1 !== expectedSha1)) throw new Error(`Hash verification failed for ${file.filename}`);
  const cachePath = path.join(app.getPath('userData'), 'content-cache', `${actualSha512}.jar`);
  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  try { await fs.writeFile(cachePath, bytes, { flag: 'wx' }); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
  const modsDirectory = path.join(profileDirectory(profileId), 'mods');
  await fs.mkdir(modsDirectory, { recursive: true });
  const safeName = path.basename(file.filename).replace(/[^a-zA-Z0-9._+()-]/g, '-');
  const target = path.join(modsDirectory, safeName.endsWith('.jar') ? safeName : `${safeName}.jar`);
  try { await fs.link(cachePath, target); } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') await fs.copyFile(cachePath, target);
  }
}

export async function installModrinthVersion(profileIdValue: unknown, versionIdValue: unknown, gameVersionValue: unknown, loaderValue: unknown) {
  const profileId = typeof profileIdValue === 'string' ? profileIdValue : '';
  profileDirectory(profileId);
  const gameVersion = typeof gameVersionValue === 'string' ? gameVersionValue.slice(0, 30) : '';
  const loader = typeof loaderValue === 'string' ? loaderValue.slice(0, 30) : '';
  const queue = [safeCatalogId(versionIdValue)];
  const visited = new Set<string>();
  while (queue.length) {
    const versionId = queue.shift()!;
    if (visited.has(versionId)) continue;
    visited.add(versionId);
    const version = await modrinthJson<ModrinthVersion>(`https://api.modrinth.com/v2/version/${versionId}`);
    const primary = version.files?.find((file) => file.primary) || version.files?.[0];
    if (!primary) throw new Error(`No downloadable file exists for ${version.name}`);
    await installRemoteFile(profileId, primary);
    for (const dependency of version.dependencies || []) {
      if (dependency.dependency_type !== 'required') continue;
      if (dependency.version_id) queue.push(safeCatalogId(dependency.version_id));
      else if (dependency.project_id) {
        const options = await listModrinthVersions(dependency.project_id, gameVersion, loader);
        if (!options[0]) throw new Error(`Required dependency ${dependency.project_id} has no compatible version`);
        queue.push(options[0].id);
      }
    }
  }
  return listProfileMods(profileId);
}
