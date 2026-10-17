/// <reference types="vite/client" />

import type { ModSearchRequest, ModSearchResponse, ModrinthVersionOption, ProfileContentFile } from './mod-model';
import type { JavaRuntimeInfo } from './launch-model';
import type { VersionProfile } from './version-model';
import type { FavoriteServer, ServerStatus } from './server-model';

declare global {
  interface Window {
    flashDesktop?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      openExternal: (url: string) => Promise<void>;
      searchMods: (request: ModSearchRequest) => Promise<ModSearchResponse>;
      inspectJava: (customPath: string) => Promise<JavaRuntimeInfo>;
      loadProfiles: (fallback: VersionProfile[]) => Promise<VersionProfile[]>;
      saveProfiles: (profiles: VersionProfile[]) => Promise<VersionProfile[]>;
      deleteProfile: (id: string) => Promise<{ id: string }>;
      duplicateProfile: (sourceId: string, profile: VersionProfile) => Promise<{ id: string; path: string }>;
      openProfileFolder: (id: string) => Promise<void>;
      exportProfile: (profile: VersionProfile) => Promise<{ canceled: boolean; path?: string }>;
      importProfile: (existingIds: string[]) => Promise<{ canceled: true } | { canceled: false; profile: VersionProfile }>;
      listProfileMods: (profileId: string) => Promise<ProfileContentFile[]>;
      chooseModFiles: (profileId: string) => Promise<ProfileContentFile[]>;
      importModFiles: (profileId: string, paths: string[]) => Promise<ProfileContentFile[]>;
      setModEnabled: (profileId: string, fileName: string, enabled: boolean) => Promise<ProfileContentFile[]>;
      getPathForFile: (file: File) => string;
      listModrinthVersions: (projectId: string, gameVersion: string, loader: string) => Promise<ModrinthVersionOption[]>;
      installModrinthVersion: (profileId: string, versionId: string, gameVersion: string, loader: string) => Promise<ProfileContentFile[]>;
      curseForgeKeyStatus: () => Promise<{ configured: boolean; secureStorageAvailable: boolean }>;
      saveCurseForgeKey: (key: string) => Promise<{ configured: boolean; secureStorageAvailable: boolean }>;
      clearCurseForgeKey: () => Promise<{ configured: boolean; secureStorageAvailable: boolean }>;
      loadFavoriteServers: () => Promise<FavoriteServer[]>;
      addFavoriteServer: (name: string, address: string) => Promise<FavoriteServer[]>;
      removeFavoriteServer: (id: string) => Promise<FavoriteServer[]>;
      serverStatus: (id: string) => Promise<ServerStatus>;
    };
  }
}

export {};
