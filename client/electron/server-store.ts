import { app } from 'electron';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import net from 'node:net';
import path from 'node:path';

export type FavoriteServer = {
  id: string;
  name: string;
  address: string;
  createdAt: number;
};

const MAX_SERVERS = 100;

function registryPath() {
  // This registry belongs to the local launcher user until Microsoft accounts are wired in.
  return path.join(app.getPath('userData'), 'favorite-servers.json');
}

export function normalizeAddress(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Enter a server address.');
  const input = value.trim().toLowerCase();
  if (!input || input.length > 255 || /[\s/@?#\\]/.test(input)) throw new Error('Enter a valid server hostname and optional port.');

  const match = /^(\[[0-9a-f:]+\]|[^:]+)(?::(\d{1,5}))?$/.exec(input);
  if (!match) throw new Error('Use a hostname or IP address, optionally followed by :port.');
  const host = match[1];
  const port = match[2] === undefined ? 25565 : Number(match[2]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port must be between 1 and 65535.');

  if (host.startsWith('[')) {
    if (net.isIP(host.slice(1, -1)) !== 6) throw new Error('Invalid IPv6 server address.');
  } else if (!net.isIP(host)) {
    if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(host)) {
      throw new Error('Invalid server hostname.');
    }
  }
  return port === 25565 ? host : `${host}:${port}`;
}

function validateStoredServer(value: unknown): FavoriteServer {
  if (!value || typeof value !== 'object') throw new Error('Invalid favorite server entry.');
  const server = value as Partial<FavoriteServer>;
  if (typeof server.id !== 'string' || !/^[a-f0-9-]{36}$/.test(server.id)) throw new Error('Invalid favorite server ID.');
  if (typeof server.name !== 'string' || !server.name.trim() || server.name.length > 48) throw new Error('Invalid favorite server name.');
  return {
    id: server.id,
    name: server.name.trim(),
    address: normalizeAddress(server.address),
    createdAt: typeof server.createdAt === 'number' && Number.isFinite(server.createdAt) ? server.createdAt : Date.now(),
  };
}

export async function loadFavoriteServers(): Promise<FavoriteServer[]> {
  try {
    const stored: unknown = JSON.parse(await fs.readFile(registryPath(), 'utf8'));
    if (!Array.isArray(stored) || stored.length > MAX_SERVERS) throw new Error('Invalid favorite server registry.');
    const servers = stored.map(validateStoredServer);
    if (new Set(servers.map((server) => server.id)).size !== servers.length) throw new Error('Duplicate favorite server IDs.');
    return servers;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

async function writeFavoriteServers(servers: FavoriteServer[]): Promise<void> {
  const filePath = registryPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(servers, null, 2), 'utf8');
  await fs.rename(temporaryPath, filePath);
}

export async function addFavoriteServer(nameValue: unknown, addressValue: unknown): Promise<FavoriteServer[]> {
  const name = typeof nameValue === 'string' ? nameValue.trim() : '';
  if (!name || name.length > 48) throw new Error('Server name must be 1–48 characters.');
  const address = normalizeAddress(addressValue);
  const servers = await loadFavoriteServers();
  if (servers.length >= MAX_SERVERS) throw new Error('You can save up to 100 servers.');
  if (servers.some((server) => server.address === address)) throw new Error('That server is already in your favorites.');
  servers.push({ id: randomUUID(), name, address, createdAt: Date.now() });
  await writeFavoriteServers(servers);
  return servers;
}

export async function removeFavoriteServer(idValue: unknown): Promise<FavoriteServer[]> {
  if (typeof idValue !== 'string' || !/^[a-f0-9-]{36}$/.test(idValue)) throw new Error('Invalid favorite server ID.');
  const servers = await loadFavoriteServers();
  if (!servers.some((server) => server.id === idValue)) throw new Error('Favorite server was not found.');
  const remaining = servers.filter((server) => server.id !== idValue);
  await writeFavoriteServers(remaining);
  return remaining;
}
