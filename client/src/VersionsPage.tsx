import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  CaretDown,
  Check,
  CheckCircle,
  Copy,
  DownloadSimple,
  FolderSimple,
  Export,
  GameController,
  GearSix,
  Image,
  Lightning,
  MagnifyingGlass,
  Package,
  PencilSimple,
  Play,
  Plus,
  ShieldCheck,
  Sparkle,
  Stack,
  UploadSimple,
  Trash,
  X,
} from '@phosphor-icons/react';
import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import logo from './assets/astrix-logo.png';
import hero from './assets/flash-hero.png';
import {
  supportedVersions,
  type LoaderId,
  type VersionChannel,
  type VersionProfile,
} from './version-model';

type Props = {
  profiles: VersionProfile[];
  activeProfileId: string;
  onProfilesChange: (profiles: VersionProfile[]) => void;
  onActiveProfileChange: (id: string) => void;
};

const channelLabels: Record<VersionChannel, string> = {
  flash: 'Astrix',
  modpacks: 'Modpacks',
  vanilla: 'Vanilla',
};

const loaders: { id: LoaderId; label: string }[] = [
  { id: 'fabric', label: 'Fabric' },
  { id: 'vanilla', label: 'Vanilla' },
  { id: 'forge', label: 'Forge' },
  { id: 'quilt', label: 'Quilt' },
  { id: 'neoforge', label: 'NeoForge' },
];

function VersionArtwork({ profile }: { profile: VersionProfile }) {
  const custom = profile.background || (profile.channel === 'flash' ? hero : undefined);
  return (
    <div className={`catalog-art catalog-art-${profile.channel}`} style={custom ? { backgroundImage: `linear-gradient(180deg, transparent, #08080bd9), url(${custom})` } : undefined}>
      {profile.channel === 'flash' && <img className="catalog-bolt" src={logo} alt="" />}
      {profile.icon && <img className="catalog-custom-icon" src={profile.icon} alt="" />}
      <span>{profile.minecraftVersion}</span>
    </div>
  );
}

function ProfileCard({ profile, selected, active, onSelect, onActivate }: { profile: VersionProfile; selected: boolean; active: boolean; onSelect: () => void; onActivate: () => void }) {
  return (
    <article className={`catalog-card ${selected ? 'selected' : ''}`} onClick={onSelect}>
      <VersionArtwork profile={profile} />
      <div className="catalog-card-copy">
        <div>
          <strong>{profile.name}</strong>
          <span><i className={`loader-mark loader-${profile.loader}`} /> {profile.loader}</span>
        </div>
        <button aria-label={`Use ${profile.name}`} title={`Use ${profile.name}`} onClick={(event) => { event.stopPropagation(); onActivate(); }}>
          {active ? <Check size={17} weight="bold" /> : <Play size={17} weight="fill" />}
        </button>
      </div>
    </article>
  );
}

function DetailPanel({ profile, active, onActivate, onEdit, onDuplicate, onExport, onOpenFolder, onDelete }: { profile: VersionProfile; active: boolean; onActivate: () => void; onEdit: () => void; onDuplicate: () => void; onExport: () => void; onOpenFolder: () => void; onDelete: () => void }) {
  return (
    <aside className="profile-detail">
      <div className="profile-detail-art"><VersionArtwork profile={profile} /></div>
      <div className="profile-detail-body">
        <div className="detail-title"><div><span>Selected profile</span><h2>{profile.name}</h2></div><button aria-label="Edit profile" title="Edit profile" onClick={onEdit}><GearSix size={19} /></button></div>
        <p>{profile.description || 'A clean isolated profile ready for its own mods, configuration and resource packs.'}</p>
        <button className="text-link">Read more <ArrowRight size={14} /></button>
        <div className="detail-divider" />
        <dl className="profile-facts">
          <div><dt>Version</dt><dd>{profile.minecraftVersion}</dd></div>
          <div><dt>Loader</dt><dd><i className={`loader-mark loader-${profile.loader}`} /> {profile.loader}</dd></div>
          <div><dt>Storage</dt><dd><FolderSimple size={15} /> Isolated</dd></div>
        </dl>
        <div className="detail-callout"><ShieldCheck size={20} /><span><strong>Profile isolation enabled</strong><small>Mods, config and saves stay separate.</small></span></div>
        <div className="profile-actions" aria-label="Profile actions">
          <button onClick={onEdit}><PencilSimple size={15} /> Edit</button>
          <button onClick={onDuplicate}><Copy size={15} /> Duplicate</button>
          <button onClick={onOpenFolder}><FolderSimple size={15} /> Folder</button>
          <button onClick={onExport}><Export size={15} /> Export</button>
          <button className="danger" onClick={onDelete}><Trash size={15} /> Delete</button>
        </div>
        <button className="detail-launch" onClick={onActivate}>{active ? <CheckCircle size={20} weight="fill" /> : <Play size={20} weight="fill" />}<span><strong>{active ? 'Current profile' : 'Use this profile'}</strong><small>{active ? 'Ready on Launchpad' : 'Set as your Launchpad profile'}</small></span></button>
      </div>
    </aside>
  );
}

function EditProfileDialog({ profile, onClose, onSave }: { profile: VersionProfile; onClose: () => void; onSave: (profile: VersionProfile) => void }) {
  const [name, setName] = useState(profile.name);
  const [description, setDescription] = useState(profile.description);
  return <motion.div className="profile-wizard-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}><section className="profile-edit-dialog" role="dialog" aria-modal="true" aria-label="Edit profile" onMouseDown={(event) => event.stopPropagation()}><header><div><span>Profile settings</span><h2>Edit {profile.name}</h2></div><button aria-label="Close" onClick={onClose}><X size={20} /></button></header><label>Name<input autoFocus maxLength={64} value={name} onChange={(event) => setName(event.target.value)} /></label><label>Description<textarea maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} /></label><footer><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={!name.trim()} onClick={() => onSave({ ...profile, name: name.trim(), description: description.trim() })}>Save changes</button></footer></section></motion.div>;
}

function DeleteProfileDialog({ profile, onClose, onConfirm }: { profile: VersionProfile; onClose: () => void; onConfirm: () => void }) {
  return <motion.div className="profile-wizard-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}><section className="profile-delete-dialog" role="alertdialog" aria-modal="true" aria-label="Delete profile" onMouseDown={(event) => event.stopPropagation()}><Trash size={28} /><h2>Delete {profile.name}?</h2><p>This permanently removes its isolated mods, configuration, saves, and logs from this computer.</p><footer><button className="secondary-button" onClick={onClose}>Keep profile</button><button className="danger-button" onClick={onConfirm}>Delete profile</button></footer></section></motion.div>;
}

type Draft = Pick<VersionProfile, 'name' | 'description' | 'minecraftVersion' | 'loader' | 'isolated' | 'icon' | 'background'>;
const initialDraft: Draft = { name: '', description: '', minecraftVersion: '1.21.8', loader: 'fabric', isolated: true };

function ImagePicker({ label, copy, value, onChange, wide = false }: { label: string; copy: string; value?: string; onChange: (value?: string) => void; wide?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => onChange(typeof reader.result === 'string' ? reader.result : undefined);
    reader.readAsDataURL(file);
  };
  return (
    <div className={`image-picker ${wide ? 'wide' : ''}`}>
      <div><strong>{label}</strong><span>{copy}</span></div>
      <button style={value ? { backgroundImage: `linear-gradient(#0004, #0008), url(${value})` } : undefined} onClick={() => input.current?.click()}>
        {value ? <Image size={28} /> : <UploadSimple size={28} />}
        <span>{value ? 'Replace image' : 'Choose image'}</span>
      </button>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" onChange={selectFile} hidden />
    </div>
  );
}

function ProfileWizard({ onClose, onCreate }: { onClose: () => void; onCreate: (profile: VersionProfile) => void }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const steps = ['Information', 'Game version', 'Images'];
  const valid = draft.name.trim().length > 0;
  const finish = () => onCreate({
    ...draft,
    id: `profile-${Date.now()}`,
    name: draft.name.trim(),
    description: draft.description.trim(),
    channel: draft.loader === 'vanilla' ? 'vanilla' : 'flash',
    createdAt: Date.now(),
  });
  return (
    <motion.div className="profile-wizard-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.section className="profile-wizard" initial={{ opacity: 0, y: 12, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: .985 }} onMouseDown={(event) => event.stopPropagation()} aria-modal="true" role="dialog" aria-label="Create new profile">
        <aside className="wizard-steps">
          {steps.map((label, index) => <button key={label} className={`${index === step ? 'active' : ''} ${index < step ? 'complete' : ''}`} onClick={() => valid || index === 0 ? setStep(index) : undefined}><span>{index < step ? <Check size={16} weight="bold" /> : index + 1}</span>{label}</button>)}
          <div className="wizard-note"><ShieldCheck size={18} /><span><strong>Isolated by default</strong><small>Your profile gets separate mods and config folders.</small></span></div>
        </aside>
        <div className="wizard-main">
          <button className="wizard-close" aria-label="Close" onClick={onClose}><X size={21} /></button>
          {step === 0 && <div className="wizard-page"><header><GameController size={25} /><div><h2>Profile information</h2><p>Name your profile and add an optional description.</p></div></header><label>Name <b>*</b><input autoFocus maxLength={32} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="My Fabric profile" /><small>{32 - draft.name.length} characters remaining</small></label><label>Description<textarea maxLength={300} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="What is this profile for?" /><small>{300 - draft.description.length} characters remaining</small></label><label className="check-line"><input type="checkbox" checked={draft.isolated} onChange={(event) => setDraft({ ...draft, isolated: event.target.checked })} /><span><strong>Isolate profile</strong><small>Use separate game, mod and configuration directories.</small></span></label></div>}
          {step === 1 && <div className="wizard-page"><header><Stack size={25} /><div><h2>Select game version</h2><p>Choose a supported Minecraft version and loader.</p></div></header><span className="field-label">Minecraft version</span><div className="version-choice-grid">{supportedVersions.map((version) => <button key={version} className={draft.minecraftVersion === version ? 'selected' : ''} onClick={() => setDraft({ ...draft, minecraftVersion: version })}><span>{version}</span>{draft.minecraftVersion === version && <Check size={16} weight="bold" />}</button>)}</div><span className="field-label">Loader</span><div className="loader-choice-grid">{loaders.map(({ id, label }) => <button key={id} disabled={id !== 'fabric' && id !== 'vanilla'} className={draft.loader === id ? 'selected' : ''} onClick={() => setDraft({ ...draft, loader: id })}><i className={`loader-mark loader-${id}`} /><span>{label}</span>{id !== 'fabric' && id !== 'vanilla' && <small>Later</small>}</button>)}</div></div>}
          {step === 2 && <div className="wizard-page"><header><Image size={25} /><div><h2>Select images</h2><p>Give the profile a recognizable icon and background.</p></div></header><div className="image-picker-grid"><ImagePicker label="Icon" copy="128 × 128 recommended" value={draft.icon} onChange={(icon) => setDraft({ ...draft, icon })} /><ImagePicker wide label="Background" copy="515 × 232 recommended" value={draft.background} onChange={(background) => setDraft({ ...draft, background })} /></div><div className="file-hint"><Image size={16} /> PNG, JPEG or WebP, maximum 5 MB</div></div>}
          <footer><button className="wizard-back" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft size={16} /> Back</button>{step < 2 ? <button className="primary-button" disabled={!valid} onClick={() => setStep(step + 1)}>Continue <ArrowRight size={16} /></button> : <button className="primary-button" onClick={finish}><Sparkle size={17} weight="fill" /> Create profile</button>}</footer>
        </div>
      </motion.section>
    </motion.div>
  );
}

export function VersionsPage({ profiles, activeProfileId, onProfilesChange, onActiveProfileChange }: Props) {
  const [channel, setChannel] = useState<VersionChannel>('flash');
  const [query, setQuery] = useState('');
  const [sortNewest, setSortNewest] = useState(true);
  const [wizard, setWizard] = useState(false);
  const [editing, setEditing] = useState<VersionProfile | null>(null);
  const [deleting, setDeleting] = useState<VersionProfile | null>(null);
  const visible = useMemo(() => profiles
    .filter((profile) => profile.channel === channel)
    .filter((profile) => `${profile.name} ${profile.minecraftVersion} ${profile.loader}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sortNewest ? b.createdAt - a.createdAt : a.minecraftVersion.localeCompare(b.minecraftVersion)), [profiles, channel, query, sortNewest]);
  const [selectedId, setSelectedId] = useState(activeProfileId);
  const selected = profiles.find((profile) => profile.id === selectedId) || visible[0];
  const createProfile = (profile: VersionProfile) => {
    onProfilesChange([profile, ...profiles]);
    onActiveProfileChange(profile.id);
    setSelectedId(profile.id);
    setChannel(profile.channel);
    setWizard(false);
  };
  const duplicateProfile = (profile: VersionProfile) => {
    const copy = { ...profile, id: `profile-${Date.now()}`, name: `${profile.name} copy`, createdAt: Date.now() };
    void window.flashDesktop?.duplicateProfile(profile.id, copy);
    onProfilesChange([copy, ...profiles]);
    setSelectedId(copy.id);
  };
  const deleteProfile = (profile: VersionProfile) => {
    const remaining = profiles.filter((item) => item.id !== profile.id);
    if (!remaining.length) return;
    void window.flashDesktop?.deleteProfile(profile.id);
    onProfilesChange(remaining);
    if (activeProfileId === profile.id) onActiveProfileChange(remaining[0].id);
    setSelectedId(remaining[0].id);
    setDeleting(null);
  };
  const importProfile = async () => {
    const result = await window.flashDesktop?.importProfile(profiles.map((profile) => profile.id));
    if (!result || result.canceled) return;
    onProfilesChange([result.profile, ...profiles]);
    setSelectedId(result.profile.id);
    setChannel(result.profile.channel);
  };
  return (
    <section className="versions-page">
      <header className="versions-heading"><div><span>Versions</span><b>/</b>{(['flash', 'modpacks', 'vanilla'] as VersionChannel[]).map((item) => <button key={item} className={channel === item ? 'active' : ''} onClick={() => setChannel(item)}>{channelLabels[item]}</button>)}</div><div className="versions-heading-actions"><button className="secondary-button" disabled={!window.flashDesktop} onClick={() => void importProfile()}><UploadSimple size={16} /> Import profile</button><button className="primary-button" onClick={() => setWizard(true)}><Plus size={17} weight="bold" /> New profile</button></div></header>
      <div className="versions-toolbar"><button className="channel-control"><Lightning size={17} weight="fill" /> {channelLabels[channel]} <CaretDown size={13} /></button><label><MagnifyingGlass size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${channelLabels[channel].toLowerCase()} profiles`} /></label><button onClick={() => setSortNewest(!sortNewest)}>{sortNewest ? 'Newest' : 'Version'} <CaretDown size={13} /></button><div className="active-profile-chip"><CheckCircle size={17} weight="fill" /><span>{profiles.find((profile) => profile.id === activeProfileId)?.name}</span></div></div>
      <div className="versions-workspace">
        <div className="catalog-pane">
          {channel === 'modpacks' && visible.length === 0 ? <div className="catalog-empty"><Package size={36} /><h2>No modpacks yet</h2><p>Community and curated modpacks will appear here. You can still create a custom Fabric profile now.</p><button className="secondary-button" onClick={() => setWizard(true)}><Plus size={16} /> Create profile</button></div> : visible.length ? <div className="catalog-grid">{visible.map((profile) => <ProfileCard key={profile.id} profile={profile} selected={selected?.id === profile.id} active={activeProfileId === profile.id} onSelect={() => setSelectedId(profile.id)} onActivate={() => onActiveProfileChange(profile.id)} />)}</div> : <div className="catalog-empty"><MagnifyingGlass size={34} /><h2>No matching profiles</h2><p>Try another name, version or loader.</p><button className="secondary-button" onClick={() => setQuery('')}>Clear search</button></div>}
        </div>
        {selected && selected.channel === channel ? <DetailPanel profile={selected} active={selected.id === activeProfileId} onActivate={() => onActiveProfileChange(selected.id)} onEdit={() => setEditing(selected)} onDuplicate={() => duplicateProfile(selected)} onExport={() => void window.flashDesktop?.exportProfile(selected)} onOpenFolder={() => void window.flashDesktop?.openProfileFolder(selected.id)} onDelete={() => setDeleting(selected)} /> : <aside className="profile-detail empty"><DownloadSimple size={34} /><h2>Select a profile</h2><p>Profile information and launch controls will appear here.</p></aside>}
      </div>
      <AnimatePresence>{wizard && <ProfileWizard onClose={() => setWizard(false)} onCreate={createProfile} />}</AnimatePresence>
      <AnimatePresence>{editing && <EditProfileDialog profile={editing} onClose={() => setEditing(null)} onSave={(updated) => { onProfilesChange(profiles.map((profile) => profile.id === updated.id ? updated : profile)); setEditing(null); }} />}</AnimatePresence>
      <AnimatePresence>{deleting && <DeleteProfileDialog profile={deleting} onClose={() => setDeleting(null)} onConfirm={() => deleteProfile(deleting)} />}</AnimatePresence>
    </section>
  );
}
