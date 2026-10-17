import {
  Check, Coffee, Desktop, FolderSimple, Gauge, HardDrives, LockKey, MicrosoftOutlookLogo,
  ShieldCheck, SlidersHorizontal, UserCircle, WarningCircle,
} from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { LAUNCH_SETTINGS_KEY, type JavaRuntimeInfo, type LaunchSettings } from './launch-model';

type SettingsSection = 'game' | 'account' | 'general';
type Props = {
  settings: LaunchSettings;
  onSettingsChange: (settings: LaunchSettings) => void;
};

export function SettingsPage({ settings, onSettingsChange }: Props) {
  const [section, setSection] = useState<SettingsSection>('game');
  const [runtime, setRuntime] = useState<JavaRuntimeInfo | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => { localStorage.setItem(LAUNCH_SETTINGS_KEY, JSON.stringify(settings)); }, [settings]);

  const inspectRuntime = async () => {
    setChecking(true);
    try {
      const result = window.flashDesktop?.inspectJava
        ? await window.flashDesktop.inspectJava(settings.customJavaPath)
        : { found: false, path: '', version: '', architecture: navigator.platform, totalMemoryMb: 0, recommendedMemoryMb: 4096, error: 'Java discovery is available in the desktop app.' };
      setRuntime(result);
    } finally {
      setChecking(false);
    }
  };

  return <section className="launch-settings-page">
    <header className="launch-settings-heading"><div><h1>Settings</h1><p>Configure launch behavior and review account readiness.</p></div><span><ShieldCheck size={16} weight="fill" /> Saved locally</span></header>
    <div className="launch-settings-layout">
      <nav aria-label="Settings sections">
        <button className={section === 'game' ? 'active' : ''} onClick={() => setSection('game')}><SlidersHorizontal size={18} /> Game</button>
        <button className={section === 'account' ? 'active' : ''} onClick={() => setSection('account')}><UserCircle size={18} /> Account</button>
        <button className={section === 'general' ? 'active' : ''} onClick={() => setSection('general')}><Gauge size={18} /> General</button>
      </nav>
      <div className="launch-settings-content">
        {section === 'game' && <GameSettings settings={settings} onChange={onSettingsChange} runtime={runtime} checking={checking} inspectRuntime={inspectRuntime} />}
        {section === 'account' && <AccountReadiness />}
        {section === 'general' && <GeneralSettings settings={settings} onChange={onSettingsChange} />}
      </div>
    </div>
  </section>;
}

function GameSettings({ settings, onChange, runtime, checking, inspectRuntime }: { settings: LaunchSettings; onChange: (settings: LaunchSettings) => void; runtime: JavaRuntimeInfo | null; checking: boolean; inspectRuntime: () => void }) {
  const update = <K extends keyof LaunchSettings>(key: K, value: LaunchSettings[K]) => onChange({ ...settings, [key]: value });
  return <>
    <SettingsGroup icon={HardDrives} title="Allocated memory" copy="Memory available to the Minecraft Java process.">
      <div className="memory-control"><strong>{(settings.allocatedMemoryMb / 1024).toFixed(1)} GB</strong><input type="range" min="2048" max="16384" step="512" value={settings.allocatedMemoryMb} onChange={(event) => update('allocatedMemoryMb', Number(event.target.value))} /><span>2 GB</span><span>16 GB</span></div>
    </SettingsGroup>
    <SettingsGroup icon={Desktop} title="Game window" copy="Default resolution used when a profile has no override.">
      <div className="resolution-control"><label>Width<input type="number" min="640" max="7680" value={settings.width} onChange={(event) => update('width', Number(event.target.value))} /></label><b>×</b><label>Height<input type="number" min="480" max="4320" value={settings.height} onChange={(event) => update('height', Number(event.target.value))} /></label></div>
      <label className="settings-check"><input type="checkbox" checked={settings.fullscreen} onChange={(event) => update('fullscreen', event.target.checked)} /><span><strong>Launch in fullscreen</strong><small>The resolution above remains the windowed fallback.</small></span></label>
    </SettingsGroup>
    <SettingsGroup icon={Coffee} title="Java runtime" copy="Astrix checks the custom path, JAVA_HOME and then the system PATH.">
      <label className="path-input"><FolderSimple size={18} /><input value={settings.customJavaPath} onChange={(event) => update('customJavaPath', event.target.value)} placeholder="Automatic Java discovery" /></label>
      <div className="runtime-actions"><button className="secondary-button" onClick={inspectRuntime} disabled={checking}>{checking ? 'Checking…' : 'Check runtime'}</button>{runtime && <div className={`runtime-result ${runtime.found ? 'ready' : 'blocked'}`}>{runtime.found ? <Check size={17} weight="bold" /> : <WarningCircle size={17} />}<span><strong>{runtime.found ? runtime.version : 'Java not found'}</strong><small>{runtime.found ? `${runtime.path} · ${runtime.architecture}` : runtime.error}</small></span></div>}</div>
    </SettingsGroup>
    <SettingsGroup icon={SlidersHorizontal} title="Advanced JVM arguments" copy="Applied after Astrix safety defaults. Use only arguments you understand.">
      <textarea value={settings.customJvmArgs} onChange={(event) => update('customJvmArgs', event.target.value)} placeholder="Example: -XX:+UseG1GC" />
    </SettingsGroup>
  </>;
}

function AccountReadiness() {
  return <div className="account-readiness">
    <div className="account-hero"><MicrosoftOutlookLogo size={31} weight="fill" /><div><span>Microsoft account</span><h2>Connect before launching</h2><p>Minecraft Java Edition requires Microsoft authentication and an owned-game entitlement.</p></div></div>
    <div className="readiness-steps"><div><i>1</i><span><strong>Microsoft OAuth</strong><small>Device-code sign-in is not connected yet.</small></span><b>Pending</b></div><div><i>2</i><span><strong>Xbox profile</strong><small>Required to resolve the Minecraft player identity.</small></span><b>Waiting</b></div><div><i>3</i><span><strong>Java Edition entitlement</strong><small>Astrix will verify ownership before downloading game files.</small></span><b>Waiting</b></div></div>
    <div className="account-security"><LockKey size={19} /><span><strong>Credential boundary</strong><small>Tokens will be stored through the operating system credential vault, not renderer storage.</small></span></div>
    <button className="primary-button" disabled>Connect Microsoft account</button>
    <p className="settings-footnote">The control remains disabled until the OAuth application configuration and secure token vault are implemented.</p>
  </div>;
}

function GeneralSettings({ settings, onChange }: { settings: LaunchSettings; onChange: (settings: LaunchSettings) => void }) {
  return <SettingsGroup icon={Gauge} title="Launcher behavior" copy="Choose what Astrix does after Minecraft starts."><label className="settings-check"><input type="checkbox" checked={settings.keepLauncherOpen} onChange={(event) => onChange({ ...settings, keepLauncherOpen: event.target.checked })} /><span><strong>Keep launcher open</strong><small>Keep Mission Control and launch status available in the background.</small></span></label></SettingsGroup>;
}

function SettingsGroup({ icon: Icon, title, copy, children }: { icon: typeof Gauge; title: string; copy: string; children: React.ReactNode }) {
  return <section className="settings-group"><header><Icon size={19} /><div><h2>{title}</h2><p>{copy}</p></div></header><div className="settings-group-body">{children}</div></section>;
}
