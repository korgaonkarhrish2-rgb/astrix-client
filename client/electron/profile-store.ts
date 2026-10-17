import { app, dialog, shell } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export type StoredProfile = {
  id: string;
  name: string;
  description: string;
  minecraftVersion: string;
  loader: 'fabric' | 'vanilla' | 'forge' | 'quilt' | 'neoforge';
  channel: 'flash' | 'modpacks' | 'vanilla';
  isolated: boolean;
  icon?: string;
  background?: string;
  createdAt: number;
};

const PROFILE_DIRECTORIES = ['mods', 'config', 'resourcepacks', 'shaderpacks', 'saves', 'logs'] as const;
const VALID_ID = /^[a-zA-Z0-9._-]{1,80}$/;

function profilesRoot() {
  return path.join(app.getPath('userData'), 'profiles');
}

function registryPath() {
  return path.join(profilesRoot(), 'profiles.json');
}

function validateProfile(value: unknown): StoredProfile {
  if (!value || typeof value !== 'object') throw new Error('Invalid profile payload');
  const profile = value as Partial<StoredProfile>;
  if (!profile.id || !VALID_ID.test(profile.id)) throw new Error('Invalid profile id');
  if (!profile.name || typeof profile.name !== 'string' || profile.name.length > 64) throw new Error('Invalid profile name');
  if (!profile.minecraftVersion || typeof profile.minecraftVersion !== 'string') throw new Error('Invalid game version');
  if (!['fabric', 'vanilla', 'forge', 'quilt', 'neoforge'].includes(profile.loader || '')) throw new Error('Invalid loader');
  if (!['flash', 'modpacks', 'vanilla'].includes(profile.channel || '')) throw new Error('Invalid profile channel');
  return {
    id: profile.id,
    name: profile.name.trim(),
    description: typeof profile.description === 'string' ? profile.description.slice(0, 1000) : '',
    minecraftVersion: profile.minecraftVersion.slice(0, 40),
    loader: profile.loader!,
    channel: profile.channel!,
    isolated: profile.isolated !== false,
    icon: typeof profile.icon === 'string' && profile.icon.length < 8_000_000 ? profile.icon : undefined,
    background: typeof profile.background === 'string' && profile.background.length < 8_000_000 ? profile.background : undefined,
    createdAt: Number.isFinite(profile.createdAt) ? Number(profile.createdAt) : Date.now(),
  };
}

function validateProfiles(value: unknown): StoredProfile[] {
  if (!Array.isArray(value) || value.length > 200) throw new Error('Invalid profiles payload');
  const profiles = value.map(validateProfile);
  if (new Set(profiles.map((profile) => profile.id)).size !== profiles.length) throw new Error('Duplicate profile ids');
  return profiles;
}

function profilePath(id: string) {
  if (!VALID_ID.test(id)) throw new Error('Invalid profile id');
  const root = path.resolve(profilesRoot());
  const target = path.resolve(root, id);
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error('Unsafe profile path');
  return target;
}

async function atomicJsonWrite(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(value, null, 2), 'utf8');
  await fs.rename(temporaryPath, filePath);
}

export async function ensureProfile(profileValue: unknown) {
  const profile = validateProfile(profileValue);
  const directory = profilePath(profile.id);
  await fs.mkdir(directory, { recursive: true });
  await Promise.all(PROFILE_DIRECTORIES.map((name) => fs.mkdir(path.join(directory, name), { recursive: true })));
  await atomicJsonWrite(path.join(directory, 'profile.json'), profile);
  return { id: profile.id, path: directory };
}

export async function loadProfiles(fallbackValue: unknown): Promise<StoredProfile[]> {
  try {
    const stored = JSON.parse(await fs.readFile(registryPath(), 'utf8')) as unknown;
    const profiles = validateProfiles(stored);
    await Promise.all(profiles.map(ensureProfile));
    return profiles;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    const fallback = validateProfiles(fallbackValue);
    await saveProfiles(fallback);
    return fallback;
  }
}

export async function saveProfiles(value: unknown): Promise<StoredProfile[]> {
  const profiles = validateProfiles(value);
  await Promise.all(profiles.map(ensureProfile));
  await atomicJsonWrite(registryPath(), profiles);
  return profiles;
}

export async function deleteProfile(idValue: unknown) {
  const id = typeof idValue === 'string' ? idValue : '';
  const target = profilePath(id);
  await fs.rm(target, { recursive: true, force: true });
  return { id };
}

export async function duplicateProfile(sourceIdValue: unknown, profileValue: unknown) {
  const sourceId = typeof sourceIdValue === 'string' ? sourceIdValue : '';
  const profile = validateProfile(profileValue);
  const source = profilePath(sourceId);
  const destination = profilePath(profile.id);
  try {
    await fs.cp(source, destination, { recursive: true, errorOnExist: true, force: false });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    await fs.mkdir(destination, { recursive: true });
  }
  return ensureProfile(profile);
}

export async function openProfileFolder(idValue: unknown) {
  const id = typeof idValue === 'string' ? idValue : '';
  const target = profilePath(id);
  await fs.mkdir(target, { recursive: true });
  const result = await shell.openPath(target);
  if (result) throw new Error(result);
}

export async function exportProfile(profileValue: unknown) {
  const profile = validateProfile(profileValue);
  const result = await dialog.showSaveDialog({
    title: 'Export Astrix profile',
    defaultPath: `${profile.name.replace(/[^a-z0-9._-]+/gi, '-')}.flashprofile.json`,
    filters: [{ name: 'Astrix profile', extensions: ['json'] }],
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  await atomicJsonWrite(result.filePath, { format: 'flash-profile', version: 1, profile });
  return { canceled: false, path: result.filePath };
}

export async function importProfile(existingIdsValue: unknown) {
  const result = await dialog.showOpenDialog({
    title: 'Import Astrix profile',
    properties: ['openFile'],
    filters: [{ name: 'Astrix profile', extensions: ['json'] }],
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true as const };
  const payload = JSON.parse(await fs.readFile(result.filePaths[0], 'utf8')) as { format?: string; profile?: unknown };
  if (payload.format !== 'flash-profile') throw new Error('This is not a Astrix profile export');
  const profile = validateProfile(payload.profile);
  const existingIds = Array.isArray(existingIdsValue) ? new Set(existingIdsValue.filter((value): value is string => typeof value === 'string')) : new Set<string>();
  const imported = existingIds.has(profile.id) ? { ...profile, id: `profile-${Date.now()}`, name: `${profile.name} (imported)`, createdAt: Date.now() } : profile;
  await ensureProfile(imported);
  return { canceled: false as const, profile: imported };
}
