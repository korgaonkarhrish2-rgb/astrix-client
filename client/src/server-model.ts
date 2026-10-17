export type FavoriteServer = {
  id: string;
  name: string;
  address: string;
  createdAt: number;
};

export type ServerStatus = {
  online: boolean;
  playersOnline: number | null;
  playersMax: number | null;
  version: string | null;
  latencyMs: number | null;
  checkedAt: number;
  error?: string;
};

export const FAVORITE_SERVERS_STORAGE_KEY = 'flash:favorite-servers:v1';

export function readBrowserFavoriteServers(): FavoriteServer[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(FAVORITE_SERVERS_STORAGE_KEY) || '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is FavoriteServer =>
      !!item && typeof item === 'object' && typeof item.id === 'string' &&
      typeof item.name === 'string' && typeof item.address === 'string' &&
      typeof item.createdAt === 'number');
  } catch {
    return [];
  }
}

export function normalizeBrowserServerAddress(raw: string): string {
  const address = raw.trim().toLowerCase();
  const match = /^(\[[0-9a-f:]+\]|[a-z0-9.-]+)(?::(\d{1,5}))?$/.exec(address);
  if (!match || address.length > 255) throw new Error('Use a hostname or IP address, optionally followed by :port.');
  const port = match[2] === undefined ? 25565 : Number(match[2]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port must be between 1 and 65535.');
  return port === 25565 ? match[1] : `${match[1]}:${port}`;
}
