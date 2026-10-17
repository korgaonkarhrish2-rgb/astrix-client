# Astrix

A Windows-first Minecraft Java launcher prototype, continuing the Flash Client project.

Website: https://astrix-client.lofty-horse-8823.chatgpt.site

## Repository

- `client/`: Electron, React, TypeScript and Vite desktop launcher source.
- `docs/`: Static website, logo and client source download. Ready for GitHub Pages from the main branch's /docs folder.

## Run the client

Requires Node.js and pnpm.

```sh
cd client
pnpm install
pnpm dev
```

## Current status

Profiles, Modrinth browsing and supported mod installs, server favorites and status checks, settings and launch readiness checks are implemented. Microsoft sign-in, Minecraft entitlement verification and actual game launching are unfinished. No packaged playable release is available.

CurseForge access requires an approved third-party API key. Never commit credentials.

Astrix is an independent project and is not approved by or associated with Mojang or Microsoft.
