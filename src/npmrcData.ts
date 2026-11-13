import definitions from "@npmcli/config/lib/definitions/definitions.js";


// Keys are inferred from the upstream object, not a manually maintained union.
export type NpmConfigKey = keyof typeof definitions;
export type PackageManager = "npm" | "pnpm";

/** Provider-facing documentation, not npm's raw values or nopt constructors. */
export interface NpmrcConfigEntry<K extends NpmConfigKey = NpmConfigKey> {
    key: K;
    default: string;
    type: string;
    description: string;
    packageManager: PackageManager[];
    deprecated?: boolean;
    removedIn?: number;
    since?: number;
    /** A closed set of .npmrc spellings, used by both completions and diagnostics. */
    validValues?: string[];
}

interface NpmConfigMetadata {
    packageManager?: PackageManager[];
    since?: number;
    removedIn?: number;
    note?: string;
}

// Only extension-specific metadata lives here. Object-property completion omits
// keys already present, and misspelled/upstream-removed keys fail type checking.
// npm owns defaults, type descriptions, documentation, and deprecation status.
const npmConfigMetadata: Partial<Record<NpmConfigKey, NpmConfigMetadata>> = {
    _auth: {
        packageManager: [ "npm", "pnpm" ],
        note: "> 🔒 Sensitive credential — keep in `.npmrc`, not in `pnpm-workspace.yaml`."
    },
    all: { since: 9 },
    call: { since: 9 },
    cpu: { since: 9 },
    diff: { since: 9 },
    "diff-dst-prefix": { since: 9 },
    "diff-ignore-all-space": { since: 9 },
    "diff-name-only": { since: 9 },
    "diff-no-prefix": { since: 9 },
    "diff-src-prefix": { since: 9 },
    "diff-text": { since: 9 },
    "diff-unified": { since: 9 },
    "expect-result-count": { since: 10 },
    "expect-results": { since: 10 },
    "foreground-scripts": { since: 9 },
    "format-package-lock": { since: 9 },
    include: { since: 9 },
    "include-workspace-root": { since: 9 },
    "install-links": { since: 9 },
    "install-strategy": { since: 10 },
    libc: { since: 10 },
    location: { since: 9 },
    "lockfile-version": { since: 9 },
    "logs-dir": { since: 9 },
    omit: { since: 9 },
    "omit-lockfile-registry-resolved": { since: 10 },
    os: { since: 9 },
    "pack-destination": { since: 9 },
    package: { since: 9 },
    "prefer-dedupe": { since: 9 },
    provenance: { since: 10 },
    "provenance-file": { since: 10 },
    registry: { packageManager: [ "npm", "pnpm" ] },
    "replace-registry-host": { since: 9 },
    "save-peer": { since: 9 },
    "sbom-format": { since: 10 },
    "sbom-type": { since: 10 },
    "strict-peer-deps": { since: 9 },
    "user-agent": { since: 9 },
    workspace: { since: 9 },
    workspaces: { since: 9 },
    "workspaces-update": { since: 9 }
};

/** Safely narrow dynamic document keys and Object.keys() results. */
export function isNpmConfigKey(key: string): key is NpmConfigKey {
    return Object.prototype.hasOwnProperty.call(definitions, key);
}

/** Remove template-string indentation without flattening Markdown/code blocks. */
function normalizeMarkdown(text: string): string {
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    const nonempty = lines.filter((line) => line.trim().length > 0);
    const indent = Math.min(...nonempty.map((line) => line.search(/\S/)));
    return lines.map((line) => line.slice(Number.isFinite(indent) ? indent : 0)).join("\n").trim();
}

function inlineDescription(text: string): string {
    return normalizeMarkdown(text).replace(/\s+/g, " ").replace(/`/g, "");
}

/** nopt combines literal alternatives, constructors, and an Array repeat marker. */
function getValidValues(type: unknown): string[] | undefined {
    const alternatives: readonly unknown[] = Array.isArray(type) ? type : [ type ];
    const values: string[] = [];
    for (const alternative of alternatives) {
        if (alternative === Array) {
            continue;
        }
        if (alternative === Boolean) {
            values.push("true", "false");
        } else if (alternative === null) {
            values.push("null");
        } else if ([ "string", "number", "boolean" ].includes(typeof alternative)) {
            values.push(String(alternative));
        } else {
            // String, Number, Date, URL, path and custom types accept non-enum input.
            // In particular, ['npmjs', 'never', 'always', String] is NOT a closed enum.
            return undefined;
        }
    }
    return values.length ? [ ...new Set(values) ] : undefined;
}

function createConfigEntry<K extends NpmConfigKey>(key: K): NpmrcConfigEntry<K> {
    // Definition's JS constructor uses Object.assign for these fields. Validate
    // that boundary instead of depending on a hand-written .d.ts in node_modules.
    const definition: unknown = definitions[key];
    if (
        !definition
        || typeof definition !== "object"
        || !("default" in definition)
        || !("type" in definition)
        || !("description" in definition)
        || typeof definition.description !== "string"
        || !("defaultDescription" in definition)
        || typeof definition.defaultDescription !== "string"
        || !("typeDescription" in definition)
        || typeof definition.typeDescription !== "string"
    ) {
        throw new TypeError(`Unsupported npm config definition: ${key}`);
    }

    const metadata = npmConfigMetadata[key];
    const deprecation = "deprecated" in definition && typeof definition.deprecated === "string"
        ? normalizeMarkdown(definition.deprecated) :
        "";
    const description = normalizeMarkdown(definition.description)
        // npm's docs use root-relative links, which VS Code cannot resolve itself.
        .replace(/\]\((\/(?!\/)[^)]+)\)/g, "](https://docs.npmjs.com/cli/latest$1)");
    const defaultDescription = inlineDescription(definition.defaultDescription);

    return {
        key,
        default: defaultDescription || (Array.isArray(definition.default)
            ? JSON.stringify(definition.default) :
            String(definition.default)),
        type: inlineDescription(definition.typeDescription),
        description: [
            deprecation && `**Deprecated**: ${deprecation}`,
            description,
            metadata?.note
        ]
            .filter(Boolean)
            .join("\n\n"),
        packageManager: [ ...(metadata?.packageManager ?? [ "npm" ]) ],
        deprecated: Boolean(deprecation),
        since: metadata?.since,
        removedIn: metadata?.removedIn,
        // This definition enumerates interfaces on the extension host, not all
        // addresses valid on the machine where the user's .npmrc will be used.
        validValues: definition.typeDescription === "IP Address"
            ? undefined :
            getValidValues(definition.type)
    };
}

// Exhaustive by construction: an upstream addition requires no copied entry.
export const npmrcConfigs: NpmrcConfigEntry[] = Object
    .keys(definitions)
    .filter(isNpmConfigKey)
    .sort()
    .map((key) => createConfigEntry(key));

/** `${packageManager}:${key}` → documentation, including shared npm/pnpm keys. */
export const npmrcConfigMap: Map<string, NpmrcConfigEntry> = new Map(
    npmrcConfigs.flatMap((entry) =>
        entry.packageManager.map((pm) => [ `${pm}:${entry.key}`, entry ] as [string, NpmrcConfigEntry])
    )
);

export function lookupConfig<K extends NpmConfigKey>(key: K, pm?: PackageManager): NpmrcConfigEntry<K> | undefined;
export function lookupConfig(key: string, pm?: PackageManager): NpmrcConfigEntry | undefined;
export function lookupConfig(key: string, pm?: PackageManager): NpmrcConfigEntry | undefined {
    // Repeated INI values use keys such as include[]=dev and ca[]=certificate.
    const configKey = key.replace(/\[\]$/, "");
    return pm
        ? npmrcConfigMap.get(`${pm}:${configKey}`)
        : npmrcConfigMap.get(`npm:${configKey}`) ?? npmrcConfigMap.get(`pnpm:${configKey}`);
}

/** Filtering does not remove the other package-manager badges from shared keys. */
export function getConfigsForPM(pm: PackageManager): NpmrcConfigEntry[] {
    return npmrcConfigs.filter((entry) => entry.packageManager.includes(pm));
}
