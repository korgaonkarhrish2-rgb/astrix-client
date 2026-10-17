import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { execFile } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { deleteProfile, duplicateProfile, exportProfile, importProfile, loadProfiles, openProfileFolder, saveProfiles } from './profile-store';
import { chooseModFiles, importModFiles, installModrinthVersion, listModrinthVersions, listProfileMods, setModEnabled } from './content-store';
import { clearCurseForgeKey, curseForgeKeyStatus, readCurseForgeKey, saveCurseForgeKey } from './secret-store';
import { addFavoriteServer, loadFavoriteServers, removeFavoriteServer } from './server-store';
import { queryServerStatus } from './server-status';

const isDev = !app.isPackaged && !process.argv.includes('--production');
const execFileAsync = promisify(execFile);

type SearchRequest = {
  query?: string;
  gameVersion?: string;
  loader?: string;
  contentType?: 'mod' | 'modpack' | 'resourcepack' | 'shader' | 'datapack';
  sort?: 'relevance' | 'downloads' | 'newest' | 'updated';
  source?: 'all' | 'modrinth' | 'curseforge';
};

type CatalogItem = {
  id: string; slug: string; name: string; summary: string; author: string;
  source: 'modrinth' | 'curseforge'; iconUrl?: string; downloads: number;
  updated: string; categories: string[]; versions: string[]; loaders: string[];
  pageUrl: string; downloadable: boolean; unavailableReason?: string;
};

function clean(value: unknown, limit = 80) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

async function searchModrinth(request: SearchRequest): Promise<{ items: CatalogItem[]; total: number }> {
  const contentType = request.contentType || 'mod';
  const facets: string[][] = [];
  if (contentType === 'datapack') facets.push(['categories:datapack']);
  else facets.push([`project_type:${contentType}`]);
  if (request.gameVersion) facets.push([`versions:${clean(request.gameVersion, 20)}`]);
  if (request.loader && contentType !== 'resourcepack' && contentType !== 'shader') facets.push([`categories:${clean(request.loader, 20)}`]);
  const url = new URL('https://api.modrinth.com/v2/search');
  url.searchParams.set('query', clean(request.query, 120));
  url.searchParams.set('limit', '30');
  url.searchParams.set('index', request.sort || 'downloads');
  url.searchParams.set('facets', JSON.stringify(facets));
  const response = await fetch(url, { headers: { 'User-Agent': 'AstrixClient/0.1.0 (desktop prototype)' }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Modrinth returned ${response.status}`);
  const data = await response.json() as { total_hits?: number; hits?: Array<Record<string, unknown>> };
  const items = (data.hits || []).map((hit): CatalogItem => ({
    id: String(hit.project_id || hit.slug || ''), slug: String(hit.slug || ''), name: String(hit.title || 'Untitled project'),
    summary: String(hit.description || ''), author: String(hit.author || 'Unknown creator'), source: 'modrinth',
    iconUrl: typeof hit.icon_url === 'string' ? hit.icon_url : undefined, downloads: Number(hit.downloads || 0),
    updated: String(hit.date_modified || ''), categories: Array.isArray(hit.categories) ? hit.categories.map(String) : [],
    versions: Array.isArray(hit.versions) ? hit.versions.map(String) : [], loaders: Array.isArray(hit.display_categories) ? hit.display_categories.map(String) : Array.isArray(hit.categories) ? hit.categories.map(String) : [],
    pageUrl: `https://modrinth.com/${contentType === 'modpack' ? 'modpack' : contentType === 'resourcepack' ? 'resourcepack' : contentType === 'shader' ? 'shader' : 'mod'}/${String(hit.slug || '')}`,
    downloadable: true,
  }));
  return { items, total: Number(data.total_hits || items.length) };
}

async function searchCurseForge(request: SearchRequest): Promise<{ items: CatalogItem[]; total: number }> {
  const apiKey = await readCurseForgeKey();
  if (!apiKey) throw new Error('CURSEFORGE_API_KEY is not configured');
  const url = new URL('https://api.curseforge.com/v1/mods/search');
  url.searchParams.set('gameId', process.env.CURSEFORGE_GAME_ID || '432');
  url.searchParams.set('pageSize', '30');
  if (request.query) url.searchParams.set('searchFilter', clean(request.query, 120));
  if (request.gameVersion) url.searchParams.set('gameVersion', clean(request.gameVersion, 20));
  url.searchParams.set('sortOrder', 'desc');
  const response = await fetch(url, { headers: { 'x-api-key': apiKey, Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`CurseForge returned ${response.status}`);
  const payload = await response.json() as { data?: Array<Record<string, unknown>>; pagination?: { totalCount?: number } };
  const items = (payload.data || []).map((mod): CatalogItem => {
    const logo = mod.logo as { thumbnailUrl?: string } | undefined;
    const authors = Array.isArray(mod.authors) ? mod.authors as Array<{ name?: string }> : [];
    const categories = Array.isArray(mod.categories) ? mod.categories as Array<{ name?: string }> : [];
    const links = mod.links as { websiteUrl?: string } | undefined;
    const slug = String(mod.slug || mod.id || '');
    const allowed = mod.allowModDistribution !== false;
    return {
      id: String(mod.id || slug), slug, name: String(mod.name || 'Untitled project'), summary: String(mod.summary || ''),
      author: authors[0]?.name || 'Unknown creator', source: 'curseforge', iconUrl: logo?.thumbnailUrl,
      downloads: Number(mod.downloadCount || 0), updated: String(mod.dateModified || ''),
      categories: categories.map((category) => category.name || '').filter(Boolean), versions: request.gameVersion ? [request.gameVersion] : [],
      loaders: request.loader ? [request.loader] : [], pageUrl: links?.websiteUrl || `https://www.curseforge.com/minecraft/mc-mods/${slug}`,
      downloadable: allowed, unavailableReason: allowed ? undefined : 'The creator requires downloads from CurseForge.',
    };
  });
  return { items, total: Number(payload.pagination?.totalCount || items.length) };
}

ipcMain.handle('mods:search', async (_event, rawRequest: SearchRequest) => {
  const request: SearchRequest = rawRequest && typeof rawRequest === 'object' ? rawRequest : {};
  const sources: Array<'modrinth' | 'curseforge'> = request.source === 'modrinth' ? ['modrinth'] : request.source === 'curseforge' ? ['curseforge'] : ['modrinth', 'curseforge'];
  const warnings: string[] = [];
  const sourceStatus: Record<'modrinth' | 'curseforge', 'ready' | 'unavailable' | 'error'> = { modrinth: 'unavailable', curseforge: 'unavailable' };
  const jobs = sources.map(async (source) => {
    try {
      const result = source === 'modrinth' ? await searchModrinth(request) : await searchCurseForge(request);
      sourceStatus[source] = 'ready';
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : `${source} is unavailable`;
      sourceStatus[source] = message.includes('not configured') ? 'unavailable' : 'error';
      warnings.push(source === 'curseforge' && message.includes('not configured') ? 'CurseForge search is ready for an API key. Modrinth results remain available.' : `${source === 'modrinth' ? 'Modrinth' : 'CurseForge'}: ${message}`);
      return { items: [] as CatalogItem[], total: 0 };
    }
  });
  const results = await Promise.all(jobs);
  const items = results.flatMap((result) => result.items).sort((a, b) => request.sort === 'newest' || request.sort === 'updated' ? Date.parse(b.updated) - Date.parse(a.updated) : b.downloads - a.downloads);
  return { items, total: results.reduce((sum, result) => sum + result.total, 0), warnings, sourceStatus };
});

ipcMain.handle('system:inspect-java', async (_event, rawCustomPath: unknown) => {
  const totalMemoryMb = Math.round(os.totalmem() / 1024 / 1024);
  const recommendedMemoryMb = Math.min(8192, Math.max(4096, Math.floor(totalMemoryMb * 0.4 / 512) * 512));
  const customPath = clean(rawCustomPath, 500);
  const candidates: string[] = [];
  if (customPath && path.isAbsolute(customPath) && ['java', 'java.exe'].includes(path.basename(customPath).toLowerCase())) candidates.push(customPath);
  if (process.env.JAVA_HOME) candidates.push(path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java'));
  try {
    const { stdout } = await execFileAsync(process.platform === 'win32' ? 'where.exe' : 'which', ['java'], { windowsHide: true, timeout: 3000 });
    const discovered = stdout.split(/\r?\n/).map((entry) => entry.trim()).find(Boolean);
    if (discovered) candidates.push(discovered);
  } catch {
    candidates.push('java');
  }
  for (const candidate of [...new Set(candidates)]) {
    try {
      const { stdout, stderr } = await execFileAsync(candidate, ['-version'], { windowsHide: true, timeout: 5000 });
      const output = `${stderr}\n${stdout}`.trim();
      const version = output.match(/version\s+"([^"]+)"/i)?.[1] || output.split(/\r?\n/)[0] || 'Java runtime';
      return { found: true, path: candidate, version, architecture: process.arch, totalMemoryMb, recommendedMemoryMb };
    } catch {
      continue;
    }
  }
  return { found: false, path: '', version: '', architecture: process.arch, totalMemoryMb, recommendedMemoryMb, error: customPath && !candidates.includes(customPath) ? 'Custom path must be an absolute path to java.exe.' : 'No Java runtime was found in the custom path, JAVA_HOME or system PATH.' };
});

ipcMain.handle('profiles:load', (_event, fallback: unknown) => loadProfiles(fallback));
ipcMain.handle('profiles:save', (_event, profiles: unknown) => saveProfiles(profiles));
ipcMain.handle('profiles:delete', (_event, id: unknown) => deleteProfile(id));
ipcMain.handle('profiles:duplicate', (_event, sourceId: unknown, profile: unknown) => duplicateProfile(sourceId, profile));
ipcMain.handle('profiles:open-folder', (_event, id: unknown) => openProfileFolder(id));
ipcMain.handle('profiles:export', (_event, profile: unknown) => exportProfile(profile));
ipcMain.handle('profiles:import', (_event, existingIds: unknown) => importProfile(existingIds));
ipcMain.handle('content:list-mods', (_event, profileId: unknown) => listProfileMods(profileId));
ipcMain.handle('content:choose-mods', (_event, profileId: unknown) => chooseModFiles(profileId));
ipcMain.handle('content:import-mods', (_event, profileId: unknown, paths: unknown) => importModFiles(profileId, paths));
ipcMain.handle('content:set-enabled', (_event, profileId: unknown, fileName: unknown, enabled: unknown) => setModEnabled(profileId, fileName, enabled));
ipcMain.handle('content:modrinth-versions', (_event, projectId: unknown, gameVersion: unknown, loader: unknown) => listModrinthVersions(projectId, gameVersion, loader));
ipcMain.handle('content:install-modrinth', (_event, profileId: unknown, versionId: unknown, gameVersion: unknown, loader: unknown) => installModrinthVersion(profileId, versionId, gameVersion, loader));
ipcMain.handle('curseforge:key-status', () => curseForgeKeyStatus());
ipcMain.handle('curseforge:save-key', (_event, key: unknown) => saveCurseForgeKey(key));
ipcMain.handle('curseforge:clear-key', () => clearCurseForgeKey());
ipcMain.handle('servers:load-favorites', () => loadFavoriteServers());
ipcMain.handle('servers:add-favorite', (_event, name: unknown, address: unknown) => addFavoriteServer(name, address));
ipcMain.handle('servers:remove-favorite', (_event, id: unknown) => removeFavoriteServer(id));
ipcMain.handle('servers:status', async (_event, id: unknown) => {
  const favorite = (await loadFavoriteServers()).find((server) => server.id === id);
  if (!favorite) throw new Error('Favorite server was not found.');
  return queryServerStatus(favorite.address);
});

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0B0B0D',
    frame: false,
    show: false,
    icon: path.join(__dirname, '..', 'src', 'assets', 'astrix-logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once('ready-to-show', () => window.show());
  void (isDev
    ? window.loadURL('http://localhost:5173')
    : window.loadFile(path.join(__dirname, '..', 'dist', 'index.html')));

}

ipcMain.on('window:minimize', (event) => BrowserWindow.fromWebContents(event.sender)?.minimize());
ipcMain.on('window:maximize', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) window.isMaximized() ? window.unmaximize() : window.maximize();
});
ipcMain.on('window:close', (event) => BrowserWindow.fromWebContents(event.sender)?.close());

ipcMain.handle('open-external', (_event, rawUrl: string) => {
  const url = new URL(rawUrl);
  const allowedHosts = new Set(['modrinth.com', 'www.curseforge.com', 'curseforge.com']);
  if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname)) throw new Error('External URL is not allowed');
  return shell.openExternal(url.toString());
});

void app.whenReady().then(() => {
  if (process.platform === 'win32') app.setAppUserModelId('com.astrixclient.launcher');
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
