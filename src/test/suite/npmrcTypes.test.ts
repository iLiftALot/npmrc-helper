import * as assert from "assert";
import * as path from "path";

import ts from "typescript";


suite("npmrc catalog typing", function () {
    this.timeout(30000);

    const root = path.resolve(__dirname, "../../..");
    const sourcePath = path.join(root, "src/npmrcData.ts");
    const isLocalShim = (file: string): boolean =>
        /@npmcli\/config\/lib\/definitions\/definition\.d\.ts$/.test(file.replace(/\\/g, "/"));

    function compilerOptions(): ts.CompilerOptions {
        const config = ts.readConfigFile(path.join(root, "tsconfig.json"), ts.sys.readFile);
        assert.strictEqual(config.error, undefined);
        const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
        assert.deepStrictEqual(parsed.errors, []);
        return { ...parsed.options, noEmit: true };
    }

    test("builds with the unmodified JS dependency and rejects unknown keys", () => {
        const options = compilerOptions();
        const host = ts.createCompilerHost(options);
        const readFile = host.readFile.bind(host);
        const fileExists = host.fileExists.bind(host);
        const original = ts.sys.readFile(sourcePath)!;
        const checks = `
      const literalEntry: NpmrcConfigEntry<'registry'> | undefined = lookupConfig('registry');
      // @ts-expect-error npm keys must not widen to string/any on clean installs.
      const badKey: NpmConfigKey = 'not-a-real-npm-key';
      // @ts-expect-error metadata cannot contain unknown keys.
      const badMetadata: Partial<Record<NpmConfigKey, NpmConfigMetadata>> = { nonexistent: {} };
    `;
        host.fileExists = (file) => !isLocalShim(file) && fileExists(file);
        host.readFile = (file) =>
            isLocalShim(file) ?
                undefined
                : file === sourcePath
                    ? original + checks
                    : readFile(file);
        const program = ts.createProgram([ sourcePath ], options, host);
        const diagnostics = ts.getPreEmitDiagnostics(program);
        assert.deepStrictEqual(diagnostics.map((diag) => ts.flattenDiagnosticMessageText(diag.messageText, "\n")), []);
        assert.ok(!program.getSourceFiles().some((file) => isLocalShim(file.fileName)));
    });

    test("suggests unused metadata keys and valid lookup keys without the local shim", () => {
        const options = compilerOptions();
        const original = ts.sys.readFile(sourcePath)!;
        const ast = ts.createSourceFile(sourcePath, original, ts.ScriptTarget.Latest, true);
        const declaration = ast.statements
            .filter(ts.isVariableStatement)
            .flatMap((statement) => [ ...statement.declarationList.declarations ])
            .find((entry) => entry.name.getText(ast) === "npmConfigMetadata");
        assert.ok(declaration?.initializer);
        const position = declaration.initializer.end - 1;
        let source = original.slice(0, position) + "\n  " + original.slice(position);
        let version = 0;
        const service = ts.createLanguageService({
            getCompilationSettings: () => options,
            getScriptFileNames: () => [ sourcePath ],
            getScriptVersion: () => String(version),
            getCurrentDirectory: () => root,
            getDefaultLibFileName: ts.getDefaultLibFilePath,
            fileExists: (file) => !isLocalShim(file) && ts.sys.fileExists(file),
            readFile: (file) => isLocalShim(file) ? undefined : ts.sys.readFile(file),
            getScriptSnapshot: (file) => {
                const text = file === sourcePath ? source : isLocalShim(file) ? undefined : ts.sys.readFile(file);
                return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
            }
        });
        try {
            const keys =
                service.getCompletionsAtPosition(sourcePath, position + 3, {})?.entries.map((entry) => entry.name)
                    ?? [];
            assert.ok(keys.includes("audit"));
            assert.ok(keys.includes("color"));
            assert.ok(!keys.includes("registry"));
            assert.ok(!keys.includes("_auth"));
            source = original + "\nlookupConfig('');";
            version++;
            const lookupKeys =
                service.getCompletionsAtPosition(sourcePath, source.length - 3, {})?.entries.map((entry) => entry.name)
                    ?? [];
            assert.ok(lookupKeys.includes("registry"));
            assert.ok(lookupKeys.includes("audit"));
        } finally {
            service.dispose();
        }
    });
});
