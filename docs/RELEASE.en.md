# Release Process

This is a TypeScript (Vite + React 19) static site, not a Go project.
The release bundle contains pre-built static assets + deployment CLI (`toolboxctl`) + nginx/systemd templates.

## Version Source of Truth

Single source: `deploy/binary/VERSION` (`0.0.6`). All other locations (bundle filename, `manifest.json`, `/healthz`, git tag) derive from it.

## Release Flow (Auto via CI)

Pushing a `v*` tag triggers `.github/workflows/release.yml`: install → `pnpm build:ssg` → `build-bundle.sh --skip-build` → create Release with 5 attachments (`tar.gz` + `.sha256` + `latest.txt` + `index.json` + `install.sh`).

Bundle: `toolbox-0.0.6-linux-amd64.tar.gz` (798 tools, 2026-10-22).

## Known Limitations

- Dual-language uses client-side switch (no `/en` route); first-frame inline script prevents flash.
- Static deployment requires `chmod -R u=rwX,go=rX` after upgrade (nginx worker needs read access).
- 102 planned tools (11.3%) not yet implemented (mainly `visualization`, `automation`, `web3`, `online`, `life`, `office` categories).
