import { AnimatePresence, motion } from 'motion/react';
import { Check, Coffee, GearSix, LockKey, Package, RocketLaunch, SpinnerGap, WarningCircle, X } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import type { JavaRuntimeInfo, LaunchSettings } from './launch-model';
import type { VersionProfile } from './version-model';

export function LaunchPreflight({ profile, settings, onClose, onOpenSettings }: { profile: VersionProfile | null; settings: LaunchSettings; onClose: () => void; onOpenSettings: () => void }) {
  const [runtime, setRuntime] = useState<JavaRuntimeInfo | null>(null);
  useEffect(() => {
    if (!profile) return;
    let active = true;
    const inspect = async () => {
      const info = window.flashDesktop?.inspectJava
        ? await window.flashDesktop.inspectJava(settings.customJavaPath)
        : { found: false, path: '', version: '', architecture: navigator.platform, totalMemoryMb: 0, recommendedMemoryMb: 4096, error: 'Open the desktop app to inspect Java.' };
      if (active) setRuntime(info);
    };
    void inspect();
    return () => { active = false; };
  }, [profile, settings.customJavaPath]);

  return <AnimatePresence>{profile && <motion.div className="launch-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}><motion.div className="launch-preflight" initial={{ y: 14, scale: .985 }} animate={{ y: 0, scale: 1 }} exit={{ y: 10, scale: .985 }} onMouseDown={(event) => event.stopPropagation()}><header><div className="launch-preflight-mark"><RocketLaunch size={24} weight="fill" /></div><div><span>Launch preflight</span><h2>{profile.name}</h2><p>{profile.minecraftVersion} · {profile.loader}</p></div><button className="icon-action" onClick={onClose} aria-label="Close launch preflight"><X size={20} /></button></header><div className="preflight-list"><PreflightRow icon={Package} status="ready" title="Profile configuration" copy="Isolated content and profile metadata are ready." /><PreflightRow icon={Coffee} status={!runtime ? 'checking' : runtime.found ? 'ready' : 'blocked'} title="Java runtime" copy={!runtime ? 'Checking the configured runtime…' : runtime.found ? `${runtime.version} · ${runtime.path}` : runtime.error || 'No supported Java runtime was found.'} /><PreflightRow icon={LockKey} status="blocked" title="Microsoft account" copy="OAuth and Minecraft entitlement verification are not connected yet." /><PreflightRow icon={Package} status="blocked" title="Game files" copy="Version manifests, assets and libraries are queued for the next launch-core slice." /></div><div className="preflight-summary"><WarningCircle size={19} /><span><strong>Launch is not available yet</strong><small>This screen reports real blockers instead of starting a simulated game process.</small></span></div><footer><button className="secondary-button" onClick={onOpenSettings}><GearSix size={16} /> Open settings</button><button className="primary-button" disabled><RocketLaunch size={16} weight="fill" /> Launch game</button></footer></motion.div></motion.div>}</AnimatePresence>;
}

function PreflightRow({ icon: Icon, status, title, copy }: { icon: typeof Package; status: 'ready' | 'blocked' | 'checking'; title: string; copy: string }) {
  return <div className="preflight-row"><span><Icon size={19} /></span><div><strong>{title}</strong><small>{copy}</small></div><b className={status}>{status === 'ready' ? <Check size={17} weight="bold" /> : status === 'checking' ? <SpinnerGap size={17} className="spin" /> : <WarningCircle size={17} />}{status}</b></div>;
}
