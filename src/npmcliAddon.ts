import fs from "fs";

import logger from "@dev-md/ts-log";


const DEFINITIONS_FILE_PATH = "node_modules/@npmcli/config/lib/definitions/definition.d.ts";
const FILE_CONTENT = `declare const Definition: {
    new<
        const K extends string,
        const D extends {
            default: unknown;
            type: unknown;
            description: string;
        },
    >(key: K, options: D): D & {
        key: K;
        envExport: boolean;
        defaultDescription: string;
        typeDescription: string;
        hint: string;
        usage: string;
        validate(): void;
        describe(): string;
    };
};

export = Definition;
`;

function getDefinitionFileContent() {
    if (!fs.existsSync(DEFINITIONS_FILE_PATH)) {
        return "";
    }
    return fs.readFileSync(DEFINITIONS_FILE_PATH, "utf-8");
}

export function writeDefinitionFileContent() {
    const existing = getDefinitionFileContent();
    if (existing !== FILE_CONTENT) {
        fs.writeFileSync(DEFINITIONS_FILE_PATH, FILE_CONTENT, {
            encoding: "utf-8",
            mode: fs.constants.S_IRUSR | fs.constants.S_IWUSR
        });
    }
}

if (require.main === module) {
    logger.info("Writing definition file content to %s", DEFINITIONS_FILE_PATH);
    writeDefinitionFileContent();
}
