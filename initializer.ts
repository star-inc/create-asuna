#!/usr/bin/env bun
/// <reference types="bun" />
// Asuna - A blazing-fast, progressive microservice framework.
// SPDX-License-Identifier: BSD-3-Clause (https://ncurl.xyz/s/mI23sevHR)

// Import modules (no node: deps)
import { unzipSync } from "fflate";

// Current directory (for display only)
const rootPath = Bun.env.PWD ?? ".";

// Print the greeting messages
console.info("Asuna - A blazing-fast, progressive microservice framework.");
console.info("SPDX-License-Identifier: BSD-3-Clause (https://ncurl.xyz/s/mI23sevHR)");
console.info();

// Print the initialization information
console.info(`Current Directory: ${rootPath}`);
console.info(`Date: ${new Date().toString()}`);
console.info();

// Print the initialization message
console.info("This script will initialize the framework for your awesome project.");
console.info("Please answer the following questions to proceed.");
console.info();

// Minimal prompt utilities using Web Streams
const decoder = new TextDecoderStream();
const inputStream = Bun.stdin.stream().pipeThrough(decoder);
const inputReader = inputStream.getReader();
let inputBuffer = "";

async function readLine(): Promise<string | null> {
    while (true) {
        const idx = inputBuffer.indexOf("\n");
        if (idx !== -1) {
            const line = inputBuffer.slice(0, idx).replace(/\r$/, "");
            inputBuffer = inputBuffer.slice(idx + 1);
            return line;
        }
        const { done, value } = await inputReader.read();
        if (done) {
            if (inputBuffer.length === 0) return null;
            const last = inputBuffer;
            inputBuffer = "";
            return last;
        }
        inputBuffer += value ?? "";
    }
}

async function ask(message: string, def?: string): Promise<string> {
    const promptMsg = def ? `${message} (${def}): ` : `${message}: `;
    await Bun.write(Bun.stdout, promptMsg);
    const line = (await readLine()) ?? "";
    const ans = line.trim();
    return ans || def || "";
}

let projectName = "";
while (!projectName) {
    const val = await ask("Enter the project name", "");
    if (!val.match(/^[a-z0-9-]+$/)) {
        console.error("The project name must be in lowercase and alphanumeric characters.");
        continue;
    }
    projectName = val;
}

const projectDescription = await ask(
    "Enter the project description",
    "Awesome microservice powered by Asuna.",
);

const workingDir = await ask("Enter the working directory", "microservice");

// Close stdin reader so the process can exit cleanly
try {
    await inputReader.cancel();
} catch {}
try {
    inputReader.releaseLock();
} catch {}

// Initialization Checking
{
    // Check "src/init/const.ts" exists
    const constPath = `${workingDir}/src/init/const.ts`;
    if (await Bun.file(constPath).exists()) {
        console.error("Asuna has already been initialized.");
        // Try to read LAV_VERSION from file content without importing
        const text = await Bun.file(constPath).text();
        const m = text.match(/LAV_VERSION\s*=\s*"([^"]+)"/);
        if (m) console.info(`Current Revision: ${m[1]}`);
        throw new Error("Already initialized");
    }
}

// Download and extract the framework
{
    // Define framework download URL
    const fileUrl = "https://api.github.com/repos/star-inc/asuna/zipball/main";

    // Download zip via fetch
    const res = await fetch(fileUrl, {
        headers: {
            "User-Agent": "create-asuna",
        },
    });
    if (!res.ok) throw new Error(`Failed to download framework: ${res.status} ${res.statusText}`);
    const arrayBuffer = await res.arrayBuffer();
    const zipData = new Uint8Array(arrayBuffer);

    // Unzip with fflate (sync for simplicity)
    const entries = unzipSync(zipData);

    // Write each file, stripping the first path segment and replacing with workingDir
    for (const [entryName, content] of Object.entries(entries as Record<string, Uint8Array>) as Array<[string, Uint8Array]>) {
        // Skip directory entries (fflate usually returns files only)
        if (!entryName || entryName.endsWith("/")) continue;

        const parts = entryName.split("/");
        if (parts.length === 0) continue;
        parts[0] = workingDir; // replace repo root with workingDir
        const relativePath = parts.join("/");

        // Build file:// URL under cwd, then write using Bun.write
    const filePath = relativePath;
    await Bun.write(filePath, content, { createPath: true });
    }
}

// Modify the project details
{
    // Replace the project name to "package.json"
    const packagePath = `${workingDir}/package.json`;
    const packageText = await Bun.file(packagePath).text();
    const packageJson = JSON.parse(packageText);
    packageJson.name = projectName;
    packageJson.description = projectDescription;
    await Bun.write(packagePath, JSON.stringify(packageJson, null, 2) + "\n", { createPath: true });

    // Replace the APP_NAME to "const.ts"
    const constPath2 = `${workingDir}/src/init/const.ts`;
    let constContent = await Bun.file(constPath2).text();
    constContent = constContent.replace(
        /APP_NAME\s*=\s*".*"/, `APP_NAME = "${projectName}"`,
    );
    constContent = constContent.replace(
        /APP_DESCRIPTION\s*=\s*".*"/, `APP_DESCRIPTION = "${projectDescription}"`,
    );
    await Bun.write(constPath2, constContent);
}

// Correct file permissions
{
    // Repair .husky scripts
    const huskyPath = `${workingDir}/.husky`;
    // Make files executable recursively if exists (via system chmod)
    if (await Bun.file(huskyPath).exists()) {
        const proc = Bun.spawn(["chmod", "-R", "755", huskyPath]);
        await proc.exited;
    }
}

// Print the success message
console.info();
console.info("Asuna has been initialized successfully.");
console.info(`Project Name: ${projectName}`);
console.info(`Project Description: ${projectDescription}`);
console.info(`Working Directory: ${workingDir}`);
console.info();
