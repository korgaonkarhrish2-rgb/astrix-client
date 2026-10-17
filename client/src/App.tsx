import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpenText,
  CaretDown,
  ChatCircle,
  Check,
  GameController,
  GearSix,
  GlobeHemisphereWest,
  Headset,
  House,
  Lightning,
  MagnifyingGlass,
  Megaphone,
  Minus,
  Package,
  Plus,
  RocketLaunch,
  SquaresFour,
  Storefront,
  TerminalWindow,
  UsersThree,
  X,
} from '@phosphor-icons/react';
import { useEffect, useMemo, useState, type ComponentType } from 'react';
import logo from './assets/astrix-logo.png';
import { LaunchPreflight } from './LaunchPreflight';
import { readLaunchSettings, type LaunchSettings } from './launch-model';
import { ModsPage } from './ModsPage';
import { SettingsPage } from './SettingsPage';
import { ServersPage } from './ServersPage';
import { VersionsPage } from './VersionsPage';
import {
  ACTIVE_PROFILE_STORAGE_KEY,
  PROFILE_STORAGE_KEY,
  defaultProfiles,
  readActiveProfileId,
  readStoredProfiles,
  type VersionProfile,
} from './version-model';

type Icon = ComponentType<{ size?: number; weight?: 'regular' | 'fill' | 'bold'; className?: string }>;
type RouteId =
  | 'home'
  | 'versions'
  | 'mods'
  | 'servers'
  | 'friends'
  | 'news'
  | 'flash-plus'
  | 'mission-control'
  | 'settings';

type Route = { id: RouteId; label: string; description: string; icon: Icon };

const routes: Route[] = [
  { id: 'home', label: 'Launchpad', description: 'Launch the game and view your home screen', icon: RocketLaunch },
  { id: 'versions', label: 'Versions', description: 'Browse and manage versions and profiles', icon: GameController },
  { id: 'mods', label: 'Explore', description: 'Discover mods, resource packs, shaders and more', icon: Package },
  { id: 'servers', label: 'Servers', description: 'Find and join multiplayer servers', icon: GlobeHemisphereWest },
  { id: 'friends', label: 'Friends', description: 'See friends, messages and hosted sessions', icon: Headset },
  { id: 'news', label: 'News', description: 'Read Astrix updates', icon: Megaphone },
  { id: 'flash-plus', label: 'Astrix+', description: 'Hosted Worlds and membership benefits', icon: Storefront },
  { id: 'mission-control', label: 'Mission Control', description: 'Inspect console output and instance tools', icon: TerminalWindow },
  { id: 'settings', label: 'Settings', description: 'Open launcher settings', icon: GearSix },
];

const newsCards = [
  ['Astrix begins here', 'A focused launcher shell built for fast profile switching.'],
  ['Version isolation by default', 'Every profile keeps its own mods, config and resource packs.'],
  ['Hosted Worlds', 'A simple path from a local save to a shareable session.'],
  ['Fabric first', 'The prototype targets supported releases from 1.16.5 onward.'],
  ['Unified mod discovery', 'Modrinth and CurseForge will appear in one search experience.'],
  ['Astrix+ preview', 'The membership space is reserved for launcher-first benefits.'],
];

function WindowButton({ label, onClick, children }: { label: string; onClick?: () => void; children: React.ReactNode }) {
  return <button className="window-button" aria-label={label} title={label} onClick={onClick}>{children}</button>;
}

function Splash() {
  return (
    <motion.div className="splash" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <motion.img
        src={logo}
        alt="Astrix"
        initial={{ opacity: 0, scale: 0.86 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      />
      <div className="splash-wordmark">Astrix</div>
      <div className="splash-loader"><span /></div>
    </motion.div>
  );
}

function Rail({ route, setRoute }: { route: RouteId; setRoute: (id: RouteId) => void }) {
  const primary = routes.slice(0, 7);
  const secondary = routes.slice(7);
  const renderItem = (item: Route) => {
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        className={`rail-button ${route === item.id ? 'active' : ''}`}
        onClick={() => setRoute(item.id)}
        aria-label={item.label}
        title={item.label}
      >
        <Icon size={23} weight={route === item.id ? 'fill' : 'regular'} />
        <span className="rail-tooltip">{item.label}</span>
      </button>
    );
  };
  return (
    <aside className="rail" aria-label="Primary navigation">
      <div className="rail-brand"><img src={logo} alt="" /></div>
      <nav>{primary.map(renderItem)}</nav>
      <div className="rail-bottom">
        <div className="rail-divider" />
        <button className="rail-button" aria-label="New instance" title="New instance"><Plus size={23} weight="bold" /><span className="rail-tooltip">New instance</span></button>
        {secondary.map(renderItem)}
      </div>
    </aside>
  );
}

function TopBar({ current, onSearch }: { current: Route; onSearch: () => void }) {
  const [notifications, setNotifications] = useState(false);
  const [account, setAccount] = useState(false);
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="brand-switcher"><img src={logo} alt="" /><span>Astrix</span><CaretDown size={12} weight="bold" /></button>
        <button className="top-icon" aria-label="Go back"><ArrowLeft size={17} /></button>
        <button className="top-icon" aria-label="Go forward"><ArrowRight size={17} /></button>
        <span className="breadcrumb">{current.label}</span>
      </div>
      <div className="topbar-right">
        <button className="top-icon" aria-label="Search" onClick={onSearch}><MagnifyingGlass size={19} /></button>
        <div className="popover-anchor">
          <button className="top-icon" aria-label="Notifications" onClick={() => setNotifications(!notifications)}><Bell size={19} /></button>
          <AnimatePresence>{notifications && <motion.div className="popover notifications" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}><div className="popover-title"><strong>Inbox</strong><Check size={17} /></div><div className="popover-empty">No notifications</div></motion.div>}</AnimatePresence>
        </div>
        <div className="popover-anchor">
          <button className="account-chip" onClick={() => setAccount(!account)}><span className="avatar">FC</span><span>Player</span><i /><CaretDown size={12} /></button>
          <AnimatePresence>{account && <motion.div className="popover account-menu" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>{['Change status', 'Switch account', 'Change skin / cape', 'Screenshots', 'Account settings', 'Sign out'].map((label) => <button key={label}>{label}</button>)}</motion.div>}</AnimatePresence>
        </div>
        <button className="instances-chip">0 Instances running</button>
        <div className="window-controls">
          <WindowButton label="Minimize" onClick={() => window.flashDesktop?.minimize()}><Minus size={17} /></WindowButton>
          <WindowButton label="Maximize" onClick={() => window.flashDesktop?.maximize()}><SquaresFour size={15} /></WindowButton>
          <WindowButton label="Close" onClick={() => window.flashDesktop?.close()}><X size={17} /></WindowButton>
        </div>
      </div>
    </header>
  );
}

function HomePage({ activeProfile, onLaunch }: { activeProfile: VersionProfile; onLaunch: () => void }) {
  return (
    <div className="home-layout">
      <section className="home-main">
        <div className="greeting"><div>Welcome back, <strong>Player</strong></div><span><i /> Ready to play</span></div>
        <div className="hero-card">
          <div className="hero-glow" />
          <img className="hero-logo" src={logo} alt="" />
          <div className="hero-copy"><span>Your game, your way</span><h1>Ready when you are.</h1><button className="launch-button" onClick={onLaunch}><RocketLaunch size={23} weight="fill" /><span><strong>Launch game</strong><small>{activeProfile.minecraftVersion} · {activeProfile.loader}</small></span><CaretDown size={13} /></button></div>
          <button className="hero-settings" aria-label="Profile settings"><GearSix size={19} /></button>
        </div>
        <div className="quick-strip" aria-label="Quick launch"><span>Quick launch</span>{['SKY', 'SMP', 'PVP', 'BUILD', 'HOST'].map((label, index) => <button key={label} title={label}><span>{index + 1}</span>{label}</button>)}</div>
        <div className="section-heading"><div><h2>Latest news</h2><span>6 updates</span></div><button>View all <ArrowRight size={15} /></button></div>
        <div className="news-grid">{newsCards.map(([title, text], index) => <article className="news-card" key={title}><div className={`news-art art-${index + 1}`}><img src={logo} alt="" /><span>{String(index + 1).padStart(2, '0')}</span></div><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
      </section>
      <aside className="friends-rail"><div className="section-heading"><div><h2>Friends</h2><span>0 online</span></div><button aria-label="Open friends"><ArrowRight size={16} /></button></div><div className="friends-empty"><div className="empty-orbit"><UsersThree size={32} /></div><h3>Your party starts here</h3><p>Add friends to see when they are online and what they are playing.</p><button className="secondary-button"><Plus size={16} /> Add your first friend</button></div><div className="plus-promo"><div><Lightning size={19} weight="fill" /><strong>Astrix+</strong></div><p>More Hosted Worlds time and profile sync.</p><button>Explore Astrix+</button></div></aside>
    </div>
  );
}

function EmptyPanel({ icon: Icon, title, copy, action }: { icon: Icon; title: string; copy: string; action: string }) {
  return <div className="large-empty"><div><Icon size={38} /></div><h2>{title}</h2><p>{copy}</p><button className="secondary-button"><Plus size={16} /> {action}</button></div>;
}

function FriendsPage() { return <PageFrame title="Friends" subtitle="Friends and direct messages share one focused space."><div className="friends-panel"><aside><div className="segmented"><button className="active">Friends</button><button>Chats</button></div><div className="mini-search"><MagnifyingGlass size={17} /><span>Search friends</span><button><Plus size={16} /></button></div></aside><EmptyPanel icon={ChatCircle} title="Select a conversation" copy="Choose a friend or group chat to start messaging." action="Add friend" /></div></PageFrame>; }
function NewsPage() { return <PageFrame title="News" subtitle="Product updates, supported versions and community notes."><div className="news-grid expanded">{newsCards.map(([title, text], index) => <article className="news-card" key={title}><div className={`news-art art-${index + 1}`}><img src={logo} alt="" /></div><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></PageFrame>; }
function FlashPlusPage() { return <PageFrame title="Astrix+" subtitle="Launcher-first membership benefits."><div className="plus-hero"><img src={logo} alt="" /><div><span>Astrix+</span><h2>More room for the worlds you host.</h2><p>Hosted Worlds capacity, longer sessions, early version support and profile sync belong here in a later milestone.</p><button className="primary-button">Join the waitlist</button></div></div></PageFrame>; }
function MissionControlPage() { return <PageFrame title="Mission Control" subtitle="Per-instance tools, prepared for live launch output."><div className="console-shell"><div className="console-toolbar"><button>Latest <CaretDown size={13} /></button><span><MagnifyingGlass size={17} /> Search logs</span><button><GearSix size={18} /></button></div><div className="console-empty"><TerminalWindow size={38} /><p>No logs found. Launch a game to generate some.</p></div></div></PageFrame>; }
function PageFrame({ title, subtitle, actions, children }: { title: string; subtitle: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return <section className="page-frame"><div className="page-heading"><div><h1>{title}</h1><p>{subtitle}</p></div>{actions}</div>{children}</section>;
}

function CommandPalette({ open, close, setRoute }: { open: boolean; close: () => void; setRoute: (route: RouteId) => void }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => routes.filter((route) => `${route.label} ${route.description}`.toLowerCase().includes(query.toLowerCase())), [query]);
  useEffect(() => { if (!open) setQuery(''); }, [open]);
  return <AnimatePresence>{open && <motion.div className="modal-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={close}><motion.div className="command-modal" initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }} onMouseDown={(event) => event.stopPropagation()}><div className="command-search"><MagnifyingGlass size={21} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pages, settings and more" /></div><span className="eyebrow">Suggestions</span><div className="command-results">{filtered.map((route, index) => { const Icon = route.icon; return <button key={route.id} className={index === 0 ? 'selected' : ''} onClick={() => { setRoute(route.id); close(); }}><Icon size={21} /><span><strong>{route.label}</strong><small>{route.description}</small></span>{index === 0 && <kbd>↵</kbd>}</button>; })}</div><footer><span><kbd>↑</kbd><kbd>↓</kbd> Navigate <kbd>↵</kbd> Open</span><span><kbd>esc</kbd> Close</span></footer></motion.div></motion.div>}</AnimatePresence>;
}

function CurrentPage({ route, profiles, activeProfileId, setProfiles, setActiveProfileId, launchSettings, setLaunchSettings, onLaunch }: { route: RouteId; profiles: VersionProfile[]; activeProfileId: string; setProfiles: (profiles: VersionProfile[]) => void; setActiveProfileId: (id: string) => void; launchSettings: LaunchSettings; setLaunchSettings: (settings: LaunchSettings) => void; onLaunch: (profile: VersionProfile) => void }) {
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) || profiles[0];
  switch (route) {
    case 'home': return <HomePage activeProfile={activeProfile} onLaunch={() => onLaunch(activeProfile)} />;
    case 'versions': return <VersionsPage profiles={profiles} activeProfileId={activeProfileId} onProfilesChange={setProfiles} onActiveProfileChange={setActiveProfileId} />;
    case 'mods': return <ModsPage profiles={profiles} activeProfile={activeProfile} />;
    case 'servers': return <ServersPage />;
    case 'friends': return <FriendsPage />;
    case 'news': return <NewsPage />;
    case 'flash-plus': return <FlashPlusPage />;
    case 'mission-control': return <MissionControlPage />;
    case 'settings': return <SettingsPage settings={launchSettings} onSettingsChange={setLaunchSettings} />;
  }
}

export function App() {
  const [route, setRoute] = useState<RouteId>('home');
  const [searchOpen, setSearchOpen] = useState(false);
  const [splash, setSplash] = useState(true);
  const [profiles, setProfiles] = useState<VersionProfile[]>(() => window.flashDesktop ? defaultProfiles : readStoredProfiles());
  const [activeProfileId, setActiveProfileId] = useState(() => readActiveProfileId(profiles));
  const [launchSettings, setLaunchSettings] = useState<LaunchSettings>(readLaunchSettings);
  const [launchProfile, setLaunchProfile] = useState<VersionProfile | null>(null);
  const [profileStoreReady, setProfileStoreReady] = useState(!window.flashDesktop);
  const current = routes.find((item) => item.id === route)!;

  useEffect(() => {
    if (!window.flashDesktop) return;
    let cancelled = false;
    void window.flashDesktop.loadProfiles(readStoredProfiles()).then((stored) => {
      if (cancelled || !stored.length) return;
      setProfiles(stored);
      setActiveProfileId((current) => stored.some((profile) => profile.id === current) ? current : stored[0].id);
    }).finally(() => { if (!cancelled) setProfileStoreReady(true); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (window.flashDesktop) {
      if (profileStoreReady) void window.flashDesktop.saveProfiles(profiles);
    } else localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
  }, [profiles, profileStoreReady]);
  useEffect(() => { localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, activeProfileId); }, [activeProfileId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSplash(false), 1200);
    const handleKeys = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(true); }
      if ((event.ctrlKey || event.metaKey) && event.key === ',') { event.preventDefault(); setRoute('settings'); }
      if (event.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', handleKeys);
    return () => { window.clearTimeout(timer); window.removeEventListener('keydown', handleKeys); };
  }, []);

  return (
    <>
      <AnimatePresence>{splash && <Splash />}</AnimatePresence>
      <div className="app-shell">
        <TopBar current={current} onSearch={() => setSearchOpen(true)} />
        <Rail route={route} setRoute={setRoute} />
        <main className="content"><AnimatePresence mode="wait"><motion.div key={route} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}><CurrentPage route={route} profiles={profiles} activeProfileId={activeProfileId} setProfiles={setProfiles} setActiveProfileId={setActiveProfileId} launchSettings={launchSettings} setLaunchSettings={setLaunchSettings} onLaunch={setLaunchProfile} /></motion.div></AnimatePresence></main>
      </div>
      <CommandPalette open={searchOpen} close={() => setSearchOpen(false)} setRoute={setRoute} />
      <LaunchPreflight profile={launchProfile} settings={launchSettings} onClose={() => setLaunchProfile(null)} onOpenSettings={() => { setLaunchProfile(null); setRoute('settings'); }} />
    </>
  );
}
