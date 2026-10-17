# Astrix

Astrix is a Windows-first Minecraft launcher prototype built with Electron, React, TypeScript and Vite. It currently includes local profile management, Modrinth content browsing and installation, an optional CurseForge integration, favorite-server management with live Java Edition status checks in the desktop app, settings, and launch preflight checks. Game launching and Microsoft account sign-in are still in development.

## Run locally

Requires Node.js and pnpm.

```powershell
pnpm install
pnpm dev
```

To build and run the production-mode desktop app:

```powershell
pnpm build
pnpm start
```

CurseForge API access is optional and requires your own approved third-party API key. Do not commit API keys or other credentials to this repository.

The Microsoft Entra app registration for personal Microsoft accounts has application (client) ID `7c9793c8-f1ef-4c25-8207-d38a3c089ec9`. This is a public identifier, not a secret. Confirm public client flows in Entra before device-code sign-in; OAuth, secure token storage, and Minecraft entitlement checks still need implementation.

See [REMAINING_WORK.md](REMAINING_WORK.md) for the current development backlog.
