import { ArrowClockwise, GlobeHemisphereWest, MagnifyingGlass, Plus, Trash, X } from '@phosphor-icons/react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import logo from './assets/astrix-logo.png';
import { FAVORITE_SERVERS_STORAGE_KEY, normalizeBrowserServerAddress, readBrowserFavoriteServers, type FavoriteServer, type ServerStatus } from './server-model';

export function ServersPage() {
  const [servers, setServers] = useState<FavoriteServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, ServerStatus>>({});
  const [checking, setChecking] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    const load = window.flashDesktop ? window.flashDesktop.loadFavoriteServers() : Promise.resolve(readBrowserFavoriteServers());
    void load.then((items) => { if (!cancelled) { setServers(items); void checkAll(items, () => cancelled); } }).catch((reason: unknown) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : 'Could not load favorite servers.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const visible = useMemo(() => servers.filter((server) =>
    `${server.name} ${server.address}`.toLowerCase().includes(query.trim().toLowerCase())), [servers, query]);

  async function checkStatus(id: string) {
    if (!window.flashDesktop) return;
    setChecking((current) => ({ ...current, [id]: true }));
    try {
      const result = await window.flashDesktop.serverStatus(id);
      setStatuses((current) => ({ ...current, [id]: result }));
    } catch {
      setStatuses((current) => ({ ...current, [id]: {
        online: false, playersOnline: null, playersMax: null, version: null, latencyMs: null,
        checkedAt: Date.now(), error: 'Status check failed.',
      } }));
    } finally {
      setChecking((current) => ({ ...current, [id]: false }));
    }
  }

  async function checkAll(items: FavoriteServer[], isCancelled = () => false) {
    if (!window.flashDesktop) return;
    for (let index = 0; index < items.length && !isCancelled(); index += 4) {
      await Promise.all(items.slice(index, index + 4).map((server) => checkStatus(server.id)));
    }
  }

  function statusLabel(server: FavoriteServer) {
    if (checking[server.id]) return 'Checking server…';
    const status = statuses[server.id];
    if (!status) return window.flashDesktop ? 'Not checked yet' : 'Live status requires the desktop app';
    if (!status.online) return status.error || 'Offline or unreachable';
    const players = status.playersOnline === null ? 'Online' : `${status.playersOnline}${status.playersMax === null ? '' : `/${status.playersMax}`} players online`;
    return `${players}${status.latencyMs === null ? '' : ` · ${status.latencyMs} ms`}${status.version ? ` · ${status.version}` : ''}`;
  }

  async function addServer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const next = window.flashDesktop ? await window.flashDesktop.addFavoriteServer(name, address) : (() => {
        const trimmedName = name.trim();
        if (!trimmedName || trimmedName.length > 48) throw new Error('Server name must be 1–48 characters.');
        const normalized = normalizeBrowserServerAddress(address);
        if (servers.some((server) => server.address === normalized)) throw new Error('That server is already in your favorites.');
        if (servers.length >= 100) throw new Error('You can save up to 100 servers.');
        const result = [...servers, { id: crypto.randomUUID(), name: trimmedName, address: normalized, createdAt: Date.now() }];
        localStorage.setItem(FAVORITE_SERVERS_STORAGE_KEY, JSON.stringify(result));
        return result;
      })();
      setServers(next);
      const added = next.find((server) => !servers.some((existing) => existing.id === server.id));
      if (added) void checkStatus(added.id);
      setName('');
      setAddress('');
      setShowAdd(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save the server.');
    } finally {
      setBusy(false);
    }
  }

  async function removeServer(id: string) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const next = window.flashDesktop ? await window.flashDesktop.removeFavoriteServer(id) : servers.filter((server) => server.id !== id);
      if (!window.flashDesktop) localStorage.setItem(FAVORITE_SERVERS_STORAGE_KEY, JSON.stringify(next));
      setServers(next);
      setStatuses((current) => { const updated = { ...current }; delete updated[id]; return updated; });
      setRemovingId(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not remove the server.');
    } finally {
      setBusy(false);
    }
  }

  return <section className="page-frame servers-page">
    <div className="page-heading"><div><h1>Servers</h1><p>Your favorite Java Edition servers, saved on this device until account sign-in is connected.</p></div><div className="server-heading-actions">{servers.length > 0 && window.flashDesktop && <button className="secondary-button" disabled={Object.values(checking).some(Boolean)} onClick={() => void checkAll(servers)}><ArrowClockwise size={16} /> Refresh status</button>}<button className="primary-button" onClick={() => { setError(''); setShowAdd((open) => !open); }}>{showAdd ? <X size={16} /> : <Plus size={16} />}{showAdd ? 'Cancel' : 'Add server'}</button></div></div>
    {showAdd && <form className="server-add-form" onSubmit={addServer}>
      <div><label htmlFor="server-name">Server name</label><input id="server-name" autoFocus maxLength={48} value={name} onChange={(event) => setName(event.target.value)} placeholder="My favorite server" required /></div>
      <div><label htmlFor="server-address">Address</label><input id="server-address" maxLength={255} value={address} onChange={(event) => setAddress(event.target.value)} placeholder="play.example.com:25565" spellCheck={false} required /></div>
      <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save favorite'}</button>
    </form>}
    {error && <div className="server-error" role="alert">{error}</div>}
    {servers.length > 0 && <div className="server-search"><MagnifyingGlass size={18} /><input aria-label="Search favorite servers" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your favorites" /><span>{visible.length} of {servers.length}</span></div>}
    {loading ? <div className="server-empty">Loading favorite servers…</div> : servers.length === 0 ? <div className="server-empty"><div className="server-empty-icon"><GlobeHemisphereWest size={34} /></div><h2>No favorite servers yet</h2><p>Add a server address to keep it handy. Live status is available in the desktop app; joining will arrive with the launch core.</p><button className="secondary-button" onClick={() => setShowAdd(true)}><Plus size={16} /> Add your first server</button></div> : visible.length === 0 ? <div className="server-empty"><h2>No matching servers</h2><p>Try searching by a different name or address.</p></div> : <div className="server-grid">{visible.map((server) => <article className="server-card" key={server.id}>
      <div className="server-art"><img src={logo} alt="" /><span>FAVORITE</span></div>
      <div className="server-card-details"><span className="server-icon"><GlobeHemisphereWest size={18} /></span><div className="server-card-copy"><h3>{server.name}</h3><p>{server.address}</p><small className={statuses[server.id]?.online ? 'server-status-online' : ''} role="status">{statusLabel(server)}</small></div></div>
      <div className="server-card-actions">{removingId === server.id ? <><span>Remove this favorite?</span><button onClick={() => void removeServer(server.id)} disabled={busy}>Remove</button><button onClick={() => setRemovingId(null)}>Cancel</button></> : <>{window.flashDesktop && <button aria-label={`Refresh status for ${server.name}`} title="Refresh status" disabled={!!checking[server.id]} onClick={() => void checkStatus(server.id)}><ArrowClockwise size={17} /></button>}<button className="secondary-button" disabled title="Game launch is not connected yet">Join server</button><button className="server-remove" aria-label={`Remove ${server.name}`} title="Remove favorite" onClick={() => setRemovingId(server.id)}><Trash size={18} /></button></>}</div>
    </article>)}</div>}
  </section>;
}
