import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowSquareOut, Check, DownloadSimple, FadersHorizontal, FileArrowUp, MagnifyingGlass,
  Package, PuzzlePiece, SpinnerGap, ToggleLeft, ToggleRight, WarningCircle, X,
} from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import {
  INSTALLED_CONTENT_KEY, previewMods, readInstalledContent,
  type ContentType, type InstalledContent, type ModrinthVersionOption, type ModSearchItem, type ModSearchResponse, type ModSort, type ModSource, type ProfileContentFile,
} from './mod-model';
import type { VersionProfile } from './version-model';

type Props = { profiles: VersionProfile[]; activeProfile: VersionProfile };
type View = 'installed' | 'browse' | 'modpacks';

const typeLabels: Record<ContentType, string> = {
  mod: 'Mods', modpack: 'Modpacks', resourcepack: 'Resource packs', shader: 'Shaders', datapack: 'Data packs',
};

const compactNumber = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

function fallbackSearch(query: string, activeProfile: VersionProfile): ModSearchResponse {
  const needle = query.trim().toLowerCase();
  const items = previewMods.filter((item) => !needle || `${item.name} ${item.summary} ${item.author}`.toLowerCase().includes(needle));
  return {
    items: items.filter((item) => item.versions.includes(activeProfile.minecraftVersion) && item.loaders.includes(activeProfile.loader)),
    total: items.length,
    warnings: ['Desktop catalog service is unavailable. Showing a small offline preview.'],
    sourceStatus: { modrinth: 'unavailable', curseforge: 'unavailable' },
  };
}

export function ModsPage({ profiles, activeProfile }: Props) {
  const [view, setView] = useState<View>('browse');
  const [query, setQuery] = useState('');
  const [contentType, setContentType] = useState<ContentType>('mod');
  const [sort, setSort] = useState<ModSort>('downloads');
  const [source, setSource] = useState<'all' | ModSource>('all');
  const [result, setResult] = useState<ModSearchResponse>(() => fallbackSearch('', activeProfile));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<ModSearchItem | null>(null);
  const [installTarget, setInstallTarget] = useState<ModSearchItem | null>(null);
  const [targetProfileId, setTargetProfileId] = useState(activeProfile.id);
  const [installed, setInstalled] = useState<InstalledContent[]>(readInstalledContent);
  const [profileFiles, setProfileFiles] = useState<ProfileContentFile[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [versionOptions, setVersionOptions] = useState<ModrinthVersionOption[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState('');
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [curseForgeKeyConfigured, setCurseForgeKeyConfigured] = useState(false);

  useEffect(() => { localStorage.setItem(INSTALLED_CONTENT_KEY, JSON.stringify(installed)); }, [installed]);
  useEffect(() => { setTargetProfileId(activeProfile.id); }, [activeProfile.id]);
  useEffect(() => {
    void window.flashDesktop?.curseForgeKeyStatus().then((status) => setCurseForgeKeyConfigured(status.configured));
  }, []);
  useEffect(() => {
    if (!window.flashDesktop) return;
    setInventoryLoading(true);
    void window.flashDesktop.listProfileMods(activeProfile.id).then(setProfileFiles).finally(() => setInventoryLoading(false));
  }, [activeProfile.id]);
  useEffect(() => {
    setVersionOptions([]); setSelectedVersionId(''); setInstallError('');
    if (!installTarget || installTarget.source !== 'modrinth' || !window.flashDesktop) return;
    const profile = profiles.find((item) => item.id === targetProfileId) || activeProfile;
    void window.flashDesktop.listModrinthVersions(installTarget.id, profile.minecraftVersion, profile.loader).then((versions) => { setVersionOptions(versions); setSelectedVersionId(versions[0]?.id || ''); }).catch((reason) => setInstallError(reason instanceof Error ? reason.message : 'Could not load compatible files.'));
  }, [installTarget, targetProfileId, profiles, activeProfile]);
  useEffect(() => {
    if (view === 'installed') return;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const request = { query, gameVersion: activeProfile.minecraftVersion, loader: activeProfile.loader, contentType: view === 'modpacks' ? 'modpack' as const : contentType, sort, source };
        const response = window.flashDesktop?.searchMods
          ? await window.flashDesktop.searchMods(request)
          : fallbackSearch(query, activeProfile);
        setResult(response);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'The catalog could not be reached.');
        setResult(fallbackSearch(query, activeProfile));
      } finally {
        setLoading(false);
      }
    }, 320);
    return () => window.clearTimeout(timer);
  }, [query, contentType, sort, source, view, activeProfile.minecraftVersion, activeProfile.loader, curseForgeKeyConfigured]);

  const compatibleProfiles = useMemo(() => installTarget
    ? profiles.filter((profile) => installTarget.versions.includes(profile.minecraftVersion) && installTarget.loaders.includes(profile.loader))
    : [], [installTarget, profiles]);
  const visibleInstalled = profileFiles;

  const chooseFiles = async () => {
    if (!window.flashDesktop) return;
    setInventoryLoading(true);
    try { setProfileFiles(await window.flashDesktop.chooseModFiles(activeProfile.id)); }
    finally { setInventoryLoading(false); }
  };
  const dropFiles = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); setDropActive(false);
    if (!window.flashDesktop) return;
    const paths = Array.from(event.dataTransfer.files).filter((file) => file.name.toLowerCase().endsWith('.jar')).map((file) => window.flashDesktop!.getPathForFile(file)).filter(Boolean);
    if (!paths.length) return;
    setInventoryLoading(true);
    try { setProfileFiles(await window.flashDesktop.importModFiles(activeProfile.id, paths)); }
    finally { setInventoryLoading(false); }
  };
  const toggleFile = async (file: ProfileContentFile) => {
    if (!window.flashDesktop) return;
    setProfileFiles(await window.flashDesktop.setModEnabled(activeProfile.id, file.fileName, !file.enabled));
  };

  const confirmInstall = async () => {
    if (!installTarget) return;
    const profile = profiles.find((item) => item.id === targetProfileId);
    if (installTarget.source === 'modrinth' && profile && window.flashDesktop) {
      if (!selectedVersionId) return;
      setInstalling(true); setInstallError('');
      try {
        const files = await window.flashDesktop.installModrinthVersion(profile.id, selectedVersionId, profile.minecraftVersion, profile.loader);
        if (profile.id === activeProfile.id) setProfileFiles(files);
        setInstallTarget(null);
      } catch (reason) { setInstallError(reason instanceof Error ? reason.message : 'Install failed.'); }
      finally { setInstalling(false); }
      return;
    }
    setInstalled((current) => {
      const key = `${installTarget.source}:${installTarget.id}:${targetProfileId}`;
      if (current.some((item) => `${item.source}:${item.id}:${item.profileId}` === key)) return current;
      return [{ ...installTarget, profileId: targetProfileId, installedAt: Date.now(), enabled: true }, ...current];
    });
    setInstallTarget(null);
  };

  return (
    <section className="mods-page">
      <header className="mods-heading">
        <div><h1>Explore</h1><p>Find compatible Minecraft content across trusted public catalogs.</p></div>
        <div className="mods-tabs" role="tablist">
          {(['installed', 'browse', 'modpacks'] as View[]).map((tab) => <button key={tab} className={view === tab ? 'active' : ''} onClick={() => setView(tab)}>{tab[0].toUpperCase() + tab.slice(1)}{tab === 'installed' && <span>{visibleInstalled.length}</span>}</button>)}
        </div>
      </header>

      {view === 'installed' ? (
        <div className="installed-panel">
          <div className="installed-summary"><div><strong>{activeProfile.name}</strong><span>{activeProfile.minecraftVersion} · {activeProfile.loader}</span></div><b>{visibleInstalled.length} files</b></div>
          <div className={`jar-drop-zone ${dropActive ? 'active' : ''}`} onDragOver={(event) => { event.preventDefault(); setDropActive(true); }} onDragLeave={() => setDropActive(false)} onDrop={(event) => void dropFiles(event)}><FileArrowUp size={21} /><span><strong>Drop mod JARs here</strong><small>Files are hashed, cached, identified, verified, and linked into this profile.</small></span><button className="secondary-button" onClick={() => void chooseFiles()}>Choose files</button></div>
          {inventoryLoading ? <LoadingRows /> : visibleInstalled.length ? <div className="mod-results">{visibleInstalled.map((item) => (
            <article className={`mod-result ${item.enabled ? '' : 'disabled'}`} key={item.id}>
              <div className="catalog-icon"><Package size={24} weight="fill" /></div>
              <div className="mod-result-copy"><div><h3>{item.name}</h3><span className={`source-badge ${item.source || 'local'}`}><i />{item.source || 'local'}</span></div><p>{item.description || item.fileName}</p><small>{item.version ? `Version ${item.version} · ` : ''}{(item.size / 1024 / 1024).toFixed(2)} MB · SHA-1 {item.sha1.slice(0, 10)}…</small></div>
              <button className="icon-action" aria-label={`${item.enabled ? 'Disable' : 'Enable'} ${item.name}`} onClick={() => void toggleFile(item)}>{item.enabled ? <ToggleRight size={26} weight="fill" /> : <ToggleLeft size={26} />}</button>
            </article>
          ))}</div> : <EmptyInstalled onBrowse={() => setView('browse')} />}
          <div className="prototype-note"><WarningCircle size={18} /><span><strong>Local inventory</strong> Required dependency resolution and catalog downloads remain disabled until the version picker is connected.</span></div>
        </div>
      ) : (
        <>
          <div className="mods-toolbar">
            <select aria-label="Content type" value={view === 'modpacks' ? 'modpack' : contentType} disabled={view === 'modpacks'} onChange={(event) => setContentType(event.target.value as ContentType)}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <label><MagnifyingGlass size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${view === 'modpacks' ? 'modpacks' : typeLabels[contentType].toLowerCase()}`} /></label>
            <select aria-label="Sort results" value={sort} onChange={(event) => setSort(event.target.value as ModSort)}><option value="downloads">Most downloaded</option><option value="relevance">Relevance</option><option value="updated">Recently updated</option><option value="newest">Newest</option></select>
          </div>
          <div className="mods-context"><span><PuzzlePiece size={16} weight="fill" /> Target profile <strong>{activeProfile.name}</strong></span><span>{activeProfile.minecraftVersion} · {activeProfile.loader}</span></div>
          <div className="mods-workspace">
            <div className="mod-results-shell">
              {result.warnings.map((warning) => <div className="catalog-warning" key={warning}><WarningCircle size={17} /><span>{warning}</span></div>)}
              {error && <div className="catalog-warning error"><WarningCircle size={17} /><span>{error}</span></div>}
              {loading ? <LoadingRows /> : result.items.length ? <div className="mod-results">{result.items.map((item) => <ModRow key={`${item.source}:${item.id}`} item={item} onView={() => setSelected(item)} onInstall={() => item.downloadable ? setInstallTarget(item) : window.flashDesktop?.openExternal(item.pageUrl)} />)}</div> : <div className="mods-empty"><MagnifyingGlass size={32} /><h2>No compatible results</h2><p>Try a broader search or another source for {activeProfile.minecraftVersion}.</p></div>}
            </div>
            <aside className="mods-filter-panel">
              <h3><FadersHorizontal size={17} /> Filters</h3>
              <span>Source</span>
              {(['all', 'modrinth', 'curseforge'] as const).map((value) => <button key={value} className={source === value ? 'active' : ''} onClick={() => setSource(value)}><i className={`source-dot ${value}`} />{value === 'all' ? 'All catalogs' : value[0].toUpperCase() + value.slice(1)}<small>{value === 'all' ? result.total : result.items.filter((item) => item.source === value).length}</small></button>)}
              <span>Compatibility</span><div className="compat-card"><strong>{activeProfile.minecraftVersion}</strong><small>{activeProfile.loader} · client</small><Check size={16} /></div>
              <span>Catalog status</span><StatusRow label="Modrinth" status={result.sourceStatus.modrinth} /><StatusRow label="CurseForge" status={result.sourceStatus.curseforge} /><button className="curseforge-key-trigger" onClick={() => setKeyDialogOpen(true)}>{curseForgeKeyConfigured ? 'Manage CurseForge key' : 'Add CurseForge key'}</button>
            </aside>
          </div>
        </>
      )}

      <AnimatePresence>{selected && <DetailSheet item={selected} onClose={() => setSelected(null)} onInstall={() => { setInstallTarget(selected); setSelected(null); }} />}</AnimatePresence>
      <AnimatePresence>{installTarget && <InstallModal item={installTarget} profiles={compatibleProfiles} selectedProfileId={targetProfileId} onProfileChange={setTargetProfileId} onClose={() => setInstallTarget(null)} onConfirm={() => void confirmInstall()} versions={versionOptions} selectedVersionId={selectedVersionId} onVersionChange={setSelectedVersionId} installing={installing} error={installError} />}</AnimatePresence>
      <AnimatePresence>{keyDialogOpen && <CurseForgeKeyDialog configured={curseForgeKeyConfigured} onConfigured={setCurseForgeKeyConfigured} onClose={() => setKeyDialogOpen(false)} />}</AnimatePresence>
    </section>
  );
}

function ModIcon({ item }: { item: ModSearchItem }) { return <div className="catalog-icon">{item.iconUrl ? <img src={item.iconUrl} alt="" /> : <Package size={24} weight="fill" />}</div>; }
function SourceBadge({ source }: { source: ModSource }) { return <span className={`source-badge ${source}`}><i />{source === 'modrinth' ? 'Modrinth' : 'CurseForge'}</span>; }
function StatusRow({ label, status }: { label: string; status: string }) { return <div className="source-status"><i className={status} /><span>{label}</span><small>{status}</small></div>; }

function CurseForgeKeyDialog({ configured, onConfigured, onClose }: { configured: boolean; onConfigured: (value: boolean) => void; onClose: () => void }) {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    if (!window.flashDesktop || !key.trim()) return;
    setBusy(true); setError('');
    try { const status = await window.flashDesktop.saveCurseForgeKey(key); onConfigured(status.configured); setKey(''); onClose(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save the key.'); }
    finally { setBusy(false); }
  };
  const clear = async () => {
    if (!window.flashDesktop) return;
    setBusy(true); setError('');
    try { const status = await window.flashDesktop.clearCurseForgeKey(); onConfigured(status.configured); onClose(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not remove the key.'); }
    finally { setBusy(false); }
  };
  return <motion.div className="sheet-scrim centered" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}><section className="curseforge-key-dialog" role="dialog" aria-modal="true" aria-label="CurseForge API key" onMouseDown={(event) => event.stopPropagation()}><header><div><h2>CurseForge API key</h2><p>{configured ? 'A key is stored in Windows encrypted user data.' : 'Enable CurseForge catalog access with your API key.'}</p></div><button className="icon-action" onClick={onClose} aria-label="Close"><X size={20} /></button></header><label>API key<input type="password" autoComplete="off" spellCheck={false} value={key} onChange={(event) => setKey(event.target.value)} placeholder="Paste a new CurseForge key" /></label><small>The key is checked with CurseForge, then encrypted on this computer. It is never written to project files.</small>{error && <div className="catalog-warning error"><WarningCircle size={17} />{error}</div>}<footer>{configured && <button className="secondary-button" disabled={busy} onClick={() => void clear()}>Remove key</button>}<button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={busy || !key.trim()} onClick={() => void save()}>{busy ? 'Checking…' : 'Save key'}</button></footer></section></motion.div>;
}

function ModRow({ item, onView, onInstall }: { item: ModSearchItem; onView: () => void; onInstall: () => void }) {
  return <article className="mod-result"><ModIcon item={item} /><div className="mod-result-copy"><div><h3>{item.name}</h3><SourceBadge source={item.source} /></div><p>{item.summary}</p><small>by {item.author} · {compactNumber.format(item.downloads)} downloads · {item.categories.slice(0, 2).join(' · ') || 'community'}</small></div><button className="secondary-button" onClick={onView}>Details</button><button className="primary-button" onClick={onInstall}>{item.downloadable ? <><DownloadSimple size={16} /> Install</> : <><ArrowSquareOut size={16} /> Open</>}</button></article>;
}

function LoadingRows() { return <div className="mod-results">{[0, 1, 2, 3].map((index) => <div className="mod-skeleton" key={index}><i /><span /><span /></div>)}</div>; }
function EmptyInstalled({ onBrowse }: { onBrowse: () => void }) { return <div className="mods-empty"><Package size={34} /><h2>No content recorded yet</h2><p>Browse the catalog and add a compatible project to this profile.</p><button className="primary-button" onClick={onBrowse}>Browse content</button></div>; }

function DetailSheet({ item, onClose, onInstall }: { item: ModSearchItem; onClose: () => void; onInstall: () => void }) {
  return <motion.div className="sheet-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}><motion.aside className="mod-detail-sheet" initial={{ x: 28, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 28, opacity: 0 }} onMouseDown={(event) => event.stopPropagation()}><header><ModIcon item={item} /><div><SourceBadge source={item.source} /><h2>{item.name}</h2><span>by {item.author}</span></div><button className="icon-action" onClick={onClose} aria-label="Close details"><X size={20} /></button></header><p>{item.summary}</p><dl><div><dt>Downloads</dt><dd>{compactNumber.format(item.downloads)}</dd></div><div><dt>Updated</dt><dd>{item.updated ? new Date(item.updated).toLocaleDateString() : 'Unknown'}</dd></div><div><dt>Loaders</dt><dd>{item.loaders.slice(0, 4).join(', ') || 'Any'}</dd></div><div><dt>Versions</dt><dd>{item.versions.slice(0, 6).join(', ') || 'Any'}</dd></div></dl><div className="detail-tags">{item.categories.map((tag) => <span key={tag}>{tag}</span>)}</div><footer><button className="secondary-button" onClick={() => window.flashDesktop?.openExternal(item.pageUrl)}><ArrowSquareOut size={16} /> Project page</button><button className="primary-button" onClick={onInstall}>{item.downloadable ? <><DownloadSimple size={16} /> Choose profile</> : 'Open on CurseForge'}</button></footer></motion.aside></motion.div>;
}

function InstallModal({ item, profiles, selectedProfileId, onProfileChange, onClose, onConfirm, versions, selectedVersionId, onVersionChange, installing, error }: { item: ModSearchItem; profiles: VersionProfile[]; selectedProfileId: string; onProfileChange: (id: string) => void; onClose: () => void; onConfirm: () => void; versions: ModrinthVersionOption[]; selectedVersionId: string; onVersionChange: (id: string) => void; installing: boolean; error: string }) {
  return <motion.div className="sheet-scrim centered" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}><motion.div className="install-modal" initial={{ y: 12, scale: .98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 8, scale: .98 }} onMouseDown={(event) => event.stopPropagation()}><header><div><span>Install content</span><h2>{item.name}</h2></div><button className="icon-action" onClick={onClose} aria-label="Close install dialog"><X size={20} /></button></header><p>Choose a compatible isolated profile and exact file. Downloads and required dependencies are verified before entering the shared cache.</p><div className="install-profile-list">{profiles.map((profile) => <button key={profile.id} className={selectedProfileId === profile.id ? 'active' : ''} onClick={() => onProfileChange(profile.id)}><span><strong>{profile.name}</strong><small>{profile.minecraftVersion} · {profile.loader}</small></span>{selectedProfileId === profile.id && <Check size={18} weight="bold" />}</button>)}</div>{item.source === 'modrinth' && profiles.length > 0 && <label className="version-picker"><span>File version</span><select value={selectedVersionId} onChange={(event) => onVersionChange(event.target.value)} disabled={!versions.length}>{versions.length ? versions.map((version) => <option key={version.id} value={version.id}>{version.versionNumber} · {version.fileName}</option>) : <option>Loading compatible files…</option>}</select></label>}{error && <div className="catalog-warning error"><WarningCircle size={17} />{error}</div>}{!profiles.length && <div className="catalog-warning error"><WarningCircle size={17} />No compatible profiles are available.</div>}<footer><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={installing || !profiles.length || !profiles.some((profile) => profile.id === selectedProfileId) || (item.source === 'modrinth' && !selectedVersionId)} onClick={onConfirm}>{installing ? <SpinnerGap size={16} className="spin" /> : <DownloadSimple size={16} />} {installing ? 'Installing…' : 'Install verified file'}</button></footer></motion.div></motion.div>;
}
