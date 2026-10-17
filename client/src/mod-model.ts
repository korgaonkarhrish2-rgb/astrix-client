export type ModSource = 'modrinth' | 'curseforge';
export type ContentType = 'mod' | 'modpack' | 'resourcepack' | 'shader' | 'datapack';
export type ModSort = 'relevance' | 'downloads' | 'newest' | 'updated';

export type ModSearchRequest = {
  query: string;
  gameVersion: string;
  loader: string;
  contentType: ContentType;
  sort: ModSort;
  source: 'all' | ModSource;
};

export type ModSearchItem = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  author: string;
  source: ModSource;
  iconUrl?: string;
  downloads: number;
  updated: string;
  categories: string[];
  versions: string[];
  loaders: string[];
  pageUrl: string;
  downloadable: boolean;
  unavailableReason?: string;
};

export type ModSearchResponse = {
  items: ModSearchItem[];
  total: number;
  warnings: string[];
  sourceStatus: Record<ModSource, 'ready' | 'unavailable' | 'error'>;
};

export type InstalledContent = ModSearchItem & {
  profileId: string;
  installedAt: number;
  enabled: boolean;
};

export type ProfileContentFile = {
  id: string; profileId: string; fileName: string; name: string; version?: string; description?: string;
  enabled: boolean; size: number; sha1: string; sha512: string; curseForgeFingerprint: number;
  source?: ModSource | 'local'; projectId?: string; slug?: string;
};

export type ModrinthVersionOption = { id: string; name: string; versionNumber: string; datePublished: string; featured: boolean; fileName: string };

export const INSTALLED_CONTENT_KEY = 'astrix-client.installed-content.v1';

export const previewMods: ModSearchItem[] = [
  {
    id: 'preview-fabric-api', slug: 'fabric-api', name: 'Fabric API',
    summary: 'Core hooks and interoperability APIs used by most Fabric mods.', author: 'FabricMC',
    source: 'modrinth', downloads: 151200000, updated: '2026-09-28T10:00:00Z',
    categories: ['library', 'utility'], versions: ['1.21.8', '1.21.5', '1.21.1', '1.20.1'], loaders: ['fabric'],
    pageUrl: 'https://modrinth.com/mod/fabric-api', downloadable: true,
  },
  {
    id: 'preview-sodium', slug: 'sodium', name: 'Sodium',
    summary: 'A modern rendering engine that improves frame rates and reduces micro-stutter.', author: 'CaffeineMC',
    source: 'modrinth', downloads: 128400000, updated: '2026-09-25T10:00:00Z',
    categories: ['optimization', 'client'], versions: ['1.21.8', '1.21.5', '1.21.1', '1.20.1'], loaders: ['fabric', 'neoforge'],
    pageUrl: 'https://modrinth.com/mod/sodium', downloadable: true,
  },
  {
    id: 'preview-lithium', slug: 'lithium', name: 'Lithium',
    summary: 'General-purpose game logic optimization for faster, smoother worlds and servers.', author: 'CaffeineMC',
    source: 'modrinth', downloads: 93400000, updated: '2026-09-20T10:00:00Z',
    categories: ['optimization'], versions: ['1.21.8', '1.21.5', '1.21.1', '1.20.1'], loaders: ['fabric', 'neoforge'],
    pageUrl: 'https://modrinth.com/mod/lithium', downloadable: true,
  },
  {
    id: 'preview-iris', slug: 'iris', name: 'Iris Shaders',
    summary: 'Shader pack support designed to work with Sodium and modern Minecraft.', author: 'IrisShaders',
    source: 'modrinth', downloads: 78200000, updated: '2026-09-18T10:00:00Z',
    categories: ['shaders', 'optimization'], versions: ['1.21.8', '1.21.5', '1.21.1', '1.20.1'], loaders: ['fabric', 'neoforge'],
    pageUrl: 'https://modrinth.com/mod/iris', downloadable: true,
  },
];

export function readInstalledContent(): InstalledContent[] {
  try {
    const value = localStorage.getItem(INSTALLED_CONTENT_KEY);
    return value ? JSON.parse(value) as InstalledContent[] : [];
  } catch {
    return [];
  }
}
