# Astrix remaining work

Last updated: 2026-10-03

This is the durable backlog for everything described in the supplied product specification that is not fully implemented yet. Completed milestones remain listed for context, but unchecked items are the source of truth for later work.

## Waiting on user or external credentials

- [ ] Confirm redistribution rights for the supplied Minecraft promotional artwork and provide the individual source images; the supplied collages are reference material, and placeholder art stays until approval is documented
- [ ] Rotate the CurseForge key shared in chat, then enter the replacement in Explore → Add CurseForge key
- [x] Register Astrix in Microsoft Entra's Default Directory for personal Microsoft accounts. Application (client) ID: `639240c2-8738-489a-a074-621ec81ceb93`. No client secret or paid Azure subscription was created.
- [x] Enable **Allow public client flows** in Entra → Astrix → Authentication → Settings for the planned device-code flow. Saved and verified after reload on 2026-10-03.
- [ ] Complete an interactive sign-in with an entitled Minecraft test account once OAuth and secure token storage are implemented. The earlier `AADSTS50020` portal issue no longer blocks app registration.

## Completed foundation

- [x] Milestone 1: Electron, React, TypeScript and Vite shell
- [x] Milestone 1: frameless window controls, navigation rail, top bar and routing
- [x] Milestone 1: Astrix logo treatment, splash screen, command palette and design tokens
- [x] Milestone 2: 1.16.5+ profile catalog and active profile selection
- [x] Milestone 2: Flash, Modpacks and Vanilla tabs
- [x] Milestone 2: three-step profile wizard with local persistence and image selection

## Milestone 2 follow-ups

- [ ] Replace placeholder version artwork with approved official Minecraft promotional art
- [x] Move profile persistence from renderer localStorage into Electron-managed files
- [x] Create physical isolated profile directories for `mods/`, `config/`, `resourcepacks/`, `shaderpacks/`, `saves/` and logs
- [x] Add profile edit, duplicate, export, import and delete actions
- [ ] Add real modpack import from `.mrpack`, `.zip` and `.lcpack`
- [ ] Add migration from Modrinth, CurseForge, Prism, MultiMC, GDLauncher, ATLauncher and Dawn/Feather

## Milestone 3: mods and content

- [x] Live Modrinth search with compatibility filtering and origin metadata
- [x] Optional CurseForge search path with a clear unavailable state when no API key is configured
- [x] Browse, Installed and Modpacks navigation with content-type switching
- [x] Local install registry prototype with per-profile enable and disable controls
- [x] Mod detail sheet with summary, versions, loaders, tags and creator
- [x] Compatible profile picker prototype
- [x] Graceful `Open on CurseForge` path for projects that disallow third-party downloads
- [x] Installed mods inventory loaded from each profile directory
- [x] Enable and disable installed mods without deleting their files
- [x] Drag-and-drop `.jar` import
- [x] Inspect imported jars and identify projects by Modrinth SHA-1 or CurseForge MurmurHash2
- [x] CurseForge API key entry, validation and encrypted per-user storage
- [ ] Full filter set: category, loader, game version and environment
- [x] File-version picker and real install confirmation for Modrinth projects
- [x] Recursive required-dependency resolution for Modrinth projects
- [x] Content-addressed shared cache keyed by verified hash
- [x] Post-download hash verification
- [x] Copy or link cached artifacts into an isolated profile
- [ ] Inline missing and conflicting dependency warnings
- [ ] Curated Fabric performance bundle management
- [ ] One-click curated modpack installation
- [ ] Download queue, progress, retry, cancel and recovery states

## Milestone 4: accounts and game launch

- [x] Launch preflight with explicit profile, Java, account and game-file readiness checks
- [x] Java runtime discovery through custom path, `JAVA_HOME` and system `PATH`
- [x] Persistent launcher-wide RAM, resolution, fullscreen, Java path and custom JVM settings
- [x] Account-readiness screen documenting the Microsoft, Xbox and entitlement stages
- [ ] Microsoft OAuth and Xbox/Minecraft entitlement flow
- [ ] Secure token storage and account switching
- [ ] Skin and cape management
- [ ] Integrate `minecraft-launcher-core`
- [ ] Mojang version manifest, assets, libraries and JVM argument construction
- [ ] Fabric loader installation and version resolution
- [ ] Managed Java runtime download and version-specific selection
- [ ] Apply persisted launch settings to the real Minecraft process
- [ ] Per-profile and per-version launch overrides
- [ ] Launch progress, cancellation, process lifecycle and crash handling
- [ ] Instance count and current process status in the top bar
- [ ] Production-ready console streaming into Mission Control

## Milestone 5: servers and social

- [x] Favorite servers can be added, searched and removed, with Electron-managed per-device persistence and an honest empty state
- [x] Live Java Edition status checks for favorites: online state, player count, version and ping latency
- [ ] Scope favorites to the signed-in Microsoft account and handle migration from per-device favorites
- [ ] Favorite servers persisted per account
- [ ] Join a favorite server after authenticated game launching is available
- [ ] Friends-playing-here indicators
- [ ] Microsoft/Flash friend graph and presence states
- [ ] Add friend by username
- [ ] Direct messages and conversation history
- [ ] Satellite Friends/Chat window with its own title bar
- [ ] Game invites and deep links into servers or hosted sessions

## Milestone 6: Hosted Worlds

- [ ] World picker and Minecraft-version detection
- [ ] Bundled dedicated server resolution and EULA flow
- [ ] Start a child server process against the selected save
- [ ] UPnP and NAT-PMP automatic port mapping
- [ ] CGNAT relay or tunnel fallback
- [ ] Invite code and copy/share sheet
- [ ] Friend invite integration
- [ ] Clean stop, port unmapping and tunnel teardown
- [ ] Recovery after launcher or server crashes

## Milestone 7: supporting surfaces

- [ ] Real news feed and unread state
- [ ] Notifications for friends, messages, updates, installs and crashes
- [ ] Mission Control Notes persistence
- [ ] Mission Control screenshot discovery, sorting, favorites and sharing
- [ ] Mission Control instance-mod management
- [ ] Settings search and all General, Account, Storage, Notifications, Discord and Privacy controls
- [ ] Log retention, cache cleanup and profile-storage analysis
- [ ] Astrix+ subscription backend and entitlements
- [ ] Astrix+ Hosted Worlds caps, session duration and cross-device profile sync
- [ ] Ads and subscription prompts policy

## Packaging, security and release

- [ ] Windows installer and update channel
- [ ] Installer icon and signed Windows binaries
- [ ] Auto-update delivery and rollback
- [ ] macOS support and packaging
- [ ] Content security policy and renderer hardening audit
- [ ] Validate all IPC payloads and restrict external navigation
- [ ] Dependency and downloaded-artifact security scanning
- [ ] Crash reporting, diagnostics export and privacy controls
- [ ] Automated unit, integration and Electron end-to-end tests
- [ ] Accessibility audit including keyboard-only and screen-reader flows
- [ ] Performance budget and slow-network testing
- [ ] Licensing and approval for Minecraft promotional artwork
