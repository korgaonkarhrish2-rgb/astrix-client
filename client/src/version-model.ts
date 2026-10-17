export type LoaderId = 'fabric' | 'vanilla' | 'forge' | 'quilt' | 'neoforge';
export type VersionChannel = 'flash' | 'modpacks' | 'vanilla';

export type VersionProfile = {
  id: string;
  name: string;
  description: string;
  minecraftVersion: string;
  loader: LoaderId;
  channel: VersionChannel;
  isolated: boolean;
  icon?: string;
  background?: string;
  createdAt: number;
};

export const supportedVersions = [
  '1.21.8',
  '1.21.5',
  '1.21.1',
  '1.20.6',
  '1.20.1',
  '1.19.4',
  '1.18.2',
  '1.17.1',
  '1.16.5',
] as const;

export const defaultProfiles: VersionProfile[] = [
  {
    id: 'flash-1-21-8',
    name: 'Astrix 1.21.8',
    description: 'Current Fabric profile with Astrix performance defaults.',
    minecraftVersion: '1.21.8',
    loader: 'fabric',
    channel: 'flash',
    isolated: true,
    createdAt: 3,
  },
  {
    id: 'flash-1-20-1',
    name: 'Astrix 1.20.1',
    description: 'A stable Fabric profile for established mod collections.',
    minecraftVersion: '1.20.1',
    loader: 'fabric',
    channel: 'flash',
    isolated: true,
    createdAt: 2,
  },
  {
    id: 'vanilla-1-21-5',
    name: 'Minecraft 1.21.5',
    description: 'A clean, unmodified Minecraft profile.',
    minecraftVersion: '1.21.5',
    loader: 'vanilla',
    channel: 'vanilla',
    isolated: true,
    createdAt: 1,
  },
];

export const PROFILE_STORAGE_KEY = 'astrix-client.profiles.v1';
export const ACTIVE_PROFILE_STORAGE_KEY = 'astrix-client.active-profile.v1';

export function readStoredProfiles(): VersionProfile[] {
  try {
    const value = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!value) return defaultProfiles;
    const parsed = JSON.parse(value) as VersionProfile[];
    return Array.isArray(parsed) && parsed.length ? parsed : defaultProfiles;
  } catch {
    return defaultProfiles;
  }
}

export function readActiveProfileId(profiles: VersionProfile[]): string {
  const stored = localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);
  return profiles.some((profile) => profile.id === stored) ? stored! : profiles[0].id;
}
