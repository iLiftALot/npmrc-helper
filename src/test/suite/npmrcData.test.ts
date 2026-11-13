import * as assert from "assert";

import definitions from "@npmcli/config/lib/definitions/definitions.js";

import {
    NpmrcConfigEntry,
    getConfigsForPM,
    isNpmConfigKey,
    lookupConfig,
    npmrcConfigMap,
    npmrcConfigs
} from "../../npmrcData";


suite("npmrc config catalog", () => {
    test("contains every key from the installed npm definitions", () => {
        assert.deepStrictEqual(
            npmrcConfigs.map((entry) => entry.key).sort(),
            Object.keys(definitions).sort()
        );
    });

    test("does not contain duplicate keys", () => {
        const keys = npmrcConfigs.map((entry) => entry.key);
        assert.strictEqual(new Set(keys).size, keys.length);
    });

    test("includes metadata and enum values for newly covered keys", () => {
        const entry = lookupConfig("allow-directory", "npm");
        assert.ok(entry);
        assert.strictEqual(entry.default, definitions["allow-directory"].defaultDescription.trim());
        assert.strictEqual(entry.type, definitions["allow-directory"].typeDescription.trim());
        assert.deepStrictEqual(entry.validValues, [ "all", "none", "root" ]);
        assert.deepStrictEqual(entry.packageManager, [ "npm" ]);
    });

    test("exposes documentation strings instead of raw constructors and values", () => {
        for (const entry of npmrcConfigs) {
            assert.strictEqual(typeof entry.default, "string", entry.key);
            assert.strictEqual(typeof entry.type, "string", entry.key);
            assert.strictEqual(typeof entry.description, "string", entry.key);
            assert.ok(entry.type.length > 0, entry.key);
            assert.ok(entry.description.length > 0, entry.key);
            assert.ok(!entry.type.includes("[native code]"), entry.key);
            assert.strictEqual(npmrcConfigMap.get(`npm:${entry.key}`), entry);
        }
        assert.strictEqual(lookupConfig("_auth")?.default, "null");
        assert.strictEqual(lookupConfig("audit")?.default, "true");
        assert.strictEqual(lookupConfig("include")?.default, "[]");
        assert.strictEqual(lookupConfig("init-author-email")?.default, '""');
    });

    test("uses upstream defaults and enum members rather than stale copied values", () => {
        assert.ok(lookupConfig("access")?.validValues?.includes("private"));
        assert.ok(!lookupConfig("loglevel")?.validValues?.includes("timing"));
        assert.ok(lookupConfig("depth")?.default.includes("Infinity"));
        assert.ok(lookupConfig("cache")?.default.includes("%LocalAppData%"));
    });

    test("preserves full descriptions, Markdown examples, and deprecation guidance", () => {
        const ca = lookupConfig("ca")!;
        assert.ok(ca.description.includes("```ini\nca="));
        assert.ok(ca.description.includes("ca[]="));
        assert.ok(!ca.description.startsWith(" "));
        assert.ok(lookupConfig("allow-unused-patches")?.description.includes("only honored"));
        assert.ok(lookupConfig("audit")?.description.includes("https://docs.npmjs.com/cli/latest/commands/npm-audit"));
        const deprecated = lookupConfig("cache-max")!;
        assert.strictEqual(deprecated.deprecated, true);
        assert.ok(deprecated.description.startsWith("**Deprecated**:"));
        assert.ok(deprecated.description.includes("--prefer-online"));
        assert.strictEqual(lookupConfig("registry")?.deprecated, false);
    });

    test("derives boolean and numeric literal values without duplicates", () => {
        assert.deepStrictEqual(lookupConfig("audit")?.validValues, [ "true", "false" ]);
        assert.deepStrictEqual(lookupConfig("color")?.validValues, [ "always", "true", "false" ]);
        assert.deepStrictEqual(lookupConfig("lockfile-version")?.validValues, [ "null", "1", "2", "3" ]);
        assert.deepStrictEqual(lookupConfig("include")?.validValues, [ "prod", "dev", "optional", "peer" ]);
    });

    test("does not treat open-ended types or host addresses as closed enums", () => {
        for (
            const key of [ "registry", "cafile", "before", "fetch-retries", "replace-registry-host", "local-address" ]
        ) {
            assert.strictEqual(lookupConfig(key)?.validValues, undefined, key);
        }
    });

    test("preserves metadata and shared badges when filtering by package manager", () => {
        assert.strictEqual(lookupConfig("install-strategy")?.since, 10);
        assert.deepStrictEqual(getConfigsForPM("pnpm").map((entry) => entry.key), [ "_auth", "registry" ]);
        assert.deepStrictEqual(lookupConfig("registry", "pnpm")?.packageManager, [ "npm", "pnpm" ]);
        assert.strictEqual(lookupConfig("audit", "pnpm"), undefined);
        assert.strictEqual(lookupConfig("registry"), lookupConfig("registry", "npm"));
        assert.strictEqual(getConfigsForPM("npm").length, npmrcConfigs.length);
    });

    test("narrows dynamic keys and preserves literal lookup types", () => {
        assert.strictEqual(isNpmConfigKey("registry"), true);
        for (const key of [ "made-up-key", "toString", "__proto__" ]) {
            assert.strictEqual(isNpmConfigKey(key), false);
            assert.strictEqual(lookupConfig(key), undefined);
        }
        const entry: NpmrcConfigEntry<"registry"> | undefined = lookupConfig("registry");
        assert.ok(entry);
        const key: "registry" = entry.key;
        assert.strictEqual(key, "registry");
        // @ts-expect-error Keys remain a literal union, not string or any.
        const invalid: NpmrcConfigEntry<"not-an-npm-key"> | undefined = undefined;
        assert.strictEqual(invalid, undefined);
    });
});
