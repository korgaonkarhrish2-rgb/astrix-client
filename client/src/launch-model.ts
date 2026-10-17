export type LaunchSettings = {
  allocatedMemoryMb: number;
  width: number;
  height: number;
  fullscreen: boolean;
  customJavaPath: string;
  customJvmArgs: string;
  keepLauncherOpen: boolean;
};

export type JavaRuntimeInfo = {
  found: boolean;
  path: string;
  version: string;
  architecture: string;
  totalMemoryMb: number;
  recommendedMemoryMb: number;
  error?: string;
};

export const LAUNCH_SETTINGS_KEY = 'astrix-client.launch-settings.v1';

export const defaultLaunchSettings: LaunchSettings = {
  allocatedMemoryMb: 4096,
  width: 1280,
  height: 720,
  fullscreen: false,
  customJavaPath: '',
  customJvmArgs: '',
  keepLauncherOpen: true,
};

export function readLaunchSettings(): LaunchSettings {
  try {
    const raw = localStorage.getItem(LAUNCH_SETTINGS_KEY);
    return raw ? { ...defaultLaunchSettings, ...JSON.parse(raw) as Partial<LaunchSettings> } : defaultLaunchSettings;
  } catch {
    return defaultLaunchSettings;
  }
}
