import * as path from "path";

import logger from "@dev-md/ts-log";
import { runTests } from "@vscode/test-electron";


async function main(): Promise<void> {
    // VS Code executable path
    const vscodeExecutablePath = path.resolve(
        __dirname,
        "../../.vscode-test/vscode-darwin-arm64-1.146.0/Visual Studio Code.app/Contents/MacOS/Code"
    );
    // The folder containing the Extension Manifest package.json
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");
    // The path to the extension test runner script
    const extensionTestsPath = path.resolve(__dirname, "./suite/index.js");

    try {
        // Download VS Code, unzip it and run the integration test
        await runTests({ vscodeExecutablePath, extensionDevelopmentPath, extensionTestsPath });
    } catch (err) {
        logger.error(
            `Failed to run tests: ${err}\n`,
            `- script directory: ${__dirname}\n`,
            `- vscodeExecutablePath: ${vscodeExecutablePath}\n`,
            `- extensionDevelopmentPath: ${extensionDevelopmentPath}\n`,
            `- extensionTestsPath: ${extensionTestsPath}\n`,
            `- current working directory: ${process.cwd()}\n`
        );
        process.exit(1);
    }
}

main();
