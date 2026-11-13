# npmrc Helper

[![VS Marketplace Version](https://vsmarketplacebadges.dev/version/xlaoyu.npmrc-helper.svg)](https://marketplace.visualstudio.com/items?itemName=xlaoyu.npmrc-helper)
[![VS Marketplace Installs](https://vsmarketplacebadges.dev/installs/xlaoyu.npmrc-helper.svg)](https://marketplace.visualstudio.com/items?itemName=xlaoyu.npmrc-helper)
[![CI:test](https://github.com/Yuliang-Lee/npmrc-helper/actions/workflows/ci.yml/badge.svg)](https://github.com/Yuliang-Lee/npmrc-helper/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A VSCode extension that provides **IntelliSense** for package manager configuration files — hover documentation, auto-completion, and diagnostics — supporting:

- **`.npmrc`** — npm (bundled `@npmcli/config` definitions) and pnpm (v10 / v11) **auth + registry only**
- **`pnpm-workspace.yaml`** — pnpm v11+ everything else (camelCase keys, catalogs, overrides, workspace fields, per-subproject `packageConfigs`)
- **`.yarnrc.yml`** — Yarn Berry (v2 / v3 / v4)

> **Why both `.npmrc` and `pnpm-workspace.yaml`?** Starting with **pnpm v11**, `.npmrc` is reduced to **auth + registry** (tokens, scoped registries, `always-auth`). Every other setting (`hoistPattern`, `nodeLinker`, `saveExact`, proxies, SSL, …) lives in `pnpm-workspace.yaml` using **camelCase** keys. Per-subproject overrides previously placed in nested `.npmrc` files now go under `packageConfigs["<project-name>"]`. See [pnpm settings](https://pnpm.io/settings), [pnpm-workspace.yaml](https://pnpm.io/pnpm-workspace_yaml), and [pnpm .npmrc](https://pnpm.io/npmrc).

---

## Features

### 🔍 Hover Documentation

Hover over any config key to see a rich popup with:

- **Type** and **default value**
- **Allowed values** (for enum-type keys)
- **Package manager badge** — `npm` or `pnpm` for `.npmrc`, `yarn berry` for `.yarnrc.yml`
- **Version badge** — `since vX` for keys added in newer versions, `removed in vX` for removed keys
- Full description
- Direct link to the official docs

### ✅ Auto-completion

**`.npmrc`**

- **Key completion**: Start typing to get suggestions filtered to the active package manager (npm or pnpm, auto-detected)
- **Value completion**: After `key=`, suggestions for keys with a fixed set of valid values (e.g. `loglevel`, `access`, `audit-level`)
- Deprecated and removed keys appear at the bottom with a strikethrough

**`pnpm-workspace.yaml`**

- **Key completion**: All workspace fields (`packages`, `catalog`, `overrides`, `packageConfigs`, `allowBuilds`, …) plus all pnpm settings in **camelCase** (`nodeLinker`, `hoistPattern`, `autoInstallPeers`, `saveExact`, …)
- **Value completion**: After `key:`, suggestions for keys with a fixed set of valid values (e.g. `nodeLinker`, `packageImportMethod`, `resolutionMode`)

**`.yarnrc.yml`**

- **Key completion**: All Yarn Berry configuration keys with docs
- **Value completion**: After `key:`, suggestions for enum-type keys (e.g. `nodeLinker`, `pnpMode`, `cacheMigrationMode`)

### ⚠️ Diagnostics

**`.npmrc`**

- Unknown config keys → warning squiggle
- Keys absent from the bundled npm definitions → unknown-key warning
- Deprecated keys (e.g. `production`, `cache-max`) → hint + strikethrough
- Values that don't match the allowed set → warning
- Lines missing `=` → warning
- Scoped entries (`@scope:registry=…`, `//host/:_authToken=…`) are correctly skipped

**`pnpm-workspace.yaml`**

- Unknown top-level keys → warning squiggle
- **Migration hints**: kebab-case keys (e.g. `node-linker`) are flagged with the camelCase replacement (`nodeLinker`)
- **`allowBuilds` migration**: `onlyBuiltDependencies`, `neverBuiltDependencies`, `ignoredBuiltDependencies`, `onlyBuiltDependenciesFile` are flagged with a hint to use `allowBuilds: { <pkg>: true | false }`
- Deprecated keys → hint + strikethrough
- Invalid enum values → warning
- Nested keys (e.g. `catalog` entries) are skipped — only top-level keys are validated

**`.yarnrc.yml`**

- Unknown config keys → warning squiggle
- Deprecated keys → hint + strikethrough
- Invalid enum values → warning

### 🤖 Auto-detection: npm vs pnpm

For `.npmrc` files, the extension automatically determines whether the project uses **npm** or **pnpm** by looking for `pnpm-lock.yaml` or `pnpm-workspace.yaml` in the directory tree. Completions and diagnostics are scoped accordingly.

In pnpm v11+ projects, `.npmrc` is reserved for **auth + registry** only (`_authToken`, `//registry.../:_authToken`, `@scope:registry`, `_auth`, `always-auth`, `registry`). Move everything else — including proxies and SSL — to **`pnpm-workspace.yaml`**.

### 📸 Preview — `pnpm-workspace.yaml`

Hover documentation, camelCase key completion, enum value suggestions, and migration diagnostics for kebab-case keys:

![pnpm-workspace.yaml IntelliSense](images/pnpm.png)

---

## Supported Configurations

### npm

Keys, defaults, type descriptions, documentation, deprecations, and enum values are derived from the bundled `@npmcli/config` definitions. Updating that dependency updates the catalog automatically; it does not inspect the user's installed npm version. Some definitions are command-specific or CLI-only, as noted in their hover documentation.

| Key | Type | Default | Notes |
| ----- | ------ | --------- | ------- |
| `registry` | URL | `https://registry.npmjs.org/` | |
| `loglevel` | String | `notice` | |
| `audit-level` | String | `null` | |
| `install-strategy` | String | `hoisted` | Added in v10 |
| `sbom-format` | String | `null` | Added in v10 |
| `omit` | String | — | Added in v9 |
| `production` | Boolean | — | ⚠️ Deprecated → use `--omit=dev` |
| `cache-max` | Number | `Infinity` | ⚠️ Deprecated → use `--prefer-online` |
| … | … | … | |

### pnpm (v10 / v11)

pnpm reads two files:

- **`.npmrc`** — **auth + registry only** (`registry`, `_auth`, `_authToken`, `always-auth`, `@scope:registry=…`, `//host/:_authToken=…`).
- **`pnpm-workspace.yaml`** — **everything else** (camelCase keys).

#### Workspace-only fields

| Key | Type | Notes |
| ----- | ------ | ------- |
| `packages` | String[] | Workspace package globs |
| `catalog` / `catalogs` | Object | Versioned catalogs (pnpm v9+) |
| `overrides` | Object | Force resolutions of any dep |
| `patchedDependencies` | Object | Managed by `pnpm patch` |
| `packageExtensions` | Object | Extend dep manifests |
| `peerDependencyRules` | Object | Suppress / allow peer warnings |
| `allowBuilds` | `Record<String, Boolean>` | **pnpm v11**: replaces `onlyBuiltDependencies`, `neverBuiltDependencies`, `ignoredBuiltDependencies`, `onlyBuiltDependenciesFile` |
| `packageConfigs` | Object | **pnpm v11**: per-subproject overrides (replaces nested `.npmrc` files) |
| `requiredScripts` | String[] | Scripts every workspace package must define |
| `auditConfig` | Object | `pnpm audit` ignore-list |

#### Selected camelCase settings (formerly kebab-case in `.npmrc`)

| Key | Type | Default | Notes |
| ----- | ------ | --------- | ------- |
| `nodeLinker` | String | `isolated` | `isolated` / `hoisted` / `pnp` |
| `hoistPattern` / `publicHoistPattern` | String[] | — | |
| `shamefullyHoist` | Boolean | `false` | |
| `autoInstallPeers` | Boolean | `true` | |
| `preferFrozenLockfile` | Boolean | `true` | |
| `blockExoticSubdeps` | Boolean | `false` (v10) / `true` (v11) | |
| `useNodeVersion` | semver | `""` | |
| `saveExact` / `savePrefix` | — | — | |
| `httpsProxy` / `httpProxy` / `proxy` / `noproxy` | URL / String | — | Migrated from `.npmrc` |
| `strictSsl` / `ca` / `cafile` / `cert` / `key` | — | — | Migrated from `.npmrc` |
| … | … | … | |

#### Example

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"

nodeLinker: isolated
autoInstallPeers: true
saveExact: true

allowBuilds:
  esbuild: true
  "@swc/core": true
  canvas: false

packageConfigs:
  "@my-org/web":
    nodeLinker: hoisted
    publicHoistPattern:
      - "*types*"
```

```ini
# .npmrc — auth + registry only
registry=https://registry.npmjs.org/
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
@my-org:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${GH_TOKEN}
```

### Yarn Berry (v2 / v3 / v4)

All keys from the [Yarn Berry yarnrc.yml docs](https://yarnpkg.com/configuration/yarnrc), including:

| Key | Type | Default | npm equivalent |
| ----- | ------ | --------- | --------------- |
| `npmRegistryServer` | String | `https://registry.yarnpkg.com` | `registry` |
| `npmAuthToken` | String | — | `_authToken` |
| `nodeLinker` | String | `pnp` | — |
| `enableStrictSsl` | Boolean | `true` | `strict-ssl` |
| `httpsProxy` | String | — | `https-proxy` |
| `httpsCaFilePath` | path | — | `cafile` |
| `enableScripts` | Boolean | `true` | `ignore-scripts` |
| `enableGlobalCache` | Boolean | `true` | — |
| `enableImmutableInstalls` | Boolean | `false` | — |
| `defaultSemverRangePrefix` | String | `^` | `save-prefix` |
| … | … | … | |

---

## Getting Started

### Development

```bash
git clone <repo>
cd npmrc-helper
npm install
# Open in VSCode and press F5 to launch the Extension Development Host
```

### Build & Package

```bash
npm run compile        # compile TypeScript
npm run lint           # run ESLint
npm run package        # produce npmrc-helper-x.x.x.vsix
```

### Maintaining npm configuration support

`src/npmrcData.ts` adapts upstream definitions to the string-based documentation interface used by the providers. Raw defaults and nopt constructors are not passed to Markdown rendering. Full descriptions and code examples are preserved; only display formatting and relative documentation links are normalized.

Only extension-specific package-manager support, existing version badges, and notes live in `npmConfigMetadata`. Its keyed object is checked against `NpmConfigKey`, so IntelliSense excludes keys already present and unknown keys are rejected. New upstream definitions need no local entry. Boolean and closed-enum values support completion and diagnostics; free-form strings, paths, numbers, and host-local IP addresses are not restricted to an enum list.

No generated declaration in `node_modules` is required. The compiler/IntelliSense regression tests explicitly hide the local `definition.d.ts` helper file. Production dependencies must remain included in the VSIX because the catalog is read at runtime.

### Install from VSIX

```
Extensions panel → ··· → Install from VSIX…
```

---

## Requirements

- VSCode `^1.85.0`
- For development, a Node.js version supported by `@npmcli/config` (currently `^22.22.2 || ^24.15.0 || >=26.0.0`)

## Extension Settings

This extension has no configurable settings at this time.

## License

MIT
