#!/usr/bin/env node
// Lavateinn - Tiny and flexible microservice framework.
// SPDX-License-Identifier: BSD-3-Clause (https://ncurl.xyz/s/mI23sevHR)

// Import modules
import stream from "node:stream";
import util from "node:util";
import fs from "node:fs";

import got from "got";
import unzipper from "unzipper";
import inquirer from "inquirer";

// Define the root path
const rootPath = process.cwd();

// Print the greeting messages
console.info("Lævateinn - Tiny and flexible microservice framework.");
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

// Ask for the project name and working directory
const {
    projectName,
    projectDescription,
    workingDir,
} = await inquirer.prompt([{
    type: "input",
    name: "projectName",
    message: "Enter the project name:",
    validate: (input) => {
        // Check if the input format is valid
        if (!input.match(/^[a-z0-9-]+$/)) {
            return "The project name must be in lowercase and alphanumeric characters.";
        }

        // Return true if the input is valid
        return true;
    }
}, {
    type: "input",
    name: "projectDescription",
    message: "Enter the project description:",
    default: "Awesome microservice powered by Lævateinn.",
}, {
    type: "input",
    name: "workingDir",
    message: "Enter the working directory:",
    default: "microservice",
}]).catch((error) => {
    console.error(error);
    process.exit(1);
});

// Initialization Checking
{
    // Check "src/init/const.mjs" exists
    const constPath = new URL(
        "./src/init/const.mjs",
        `file://${rootPath}/${workingDir}/`,
    );
    if (fs.existsSync(constPath)) {
        console.error("Lævateinn has already been initialized.");
        const {LAV_VERSION} = await import(constPath);
        console.info(`Current Revision: ${LAV_VERSION}`);
        process.exit(1);
    }
}

// Download and extract the framework
{
    // Promisify stream.pipeline
    const streamPipeline = util.promisify(stream.pipeline);

    // Define framework download URL
    const fileUrl = "https://api.github.com/repos/star-inc/lavateinn/zipball/main";

    // Create a stream for the downloaded file
    const fileStream = got.stream(fileUrl);

    // Define decompression and transformation streams
    const decompress = unzipper.Parse;
    const transform = new stream.Transform({
        objectMode: true,
        transform(chunk, _encoding, callback) {
        // Remove the root directory and append the working directory
            const filenames = chunk.path.split("/");
            filenames[0] = workingDir;

            // Restore the filename
            const filename = filenames.join("/");

            // Skip empty filenames
            if (!filename) {
                callback();
                return;
            }

            // Create a directory
            if (chunk.type === "Directory") {
                fs.mkdir(filename, callback);
                return;
            }

            // Create a file
            const fileStream = fs.createWriteStream(filename);
            chunk.pipe(fileStream).on("finish", callback);
        },
    });

    // Pipeline the streams
    await streamPipeline(fileStream, decompress(), transform);
}

// Modify the project details
{
    // Replace the project name to "package.json"
    const packagePath = new URL(
        "./package.json",
        `file://${rootPath}/${workingDir}/`,
    );
    const packageJson = JSON.parse(fs.readFileSync(packagePath, {
        encoding: "utf8",
    }));
    packageJson.name = projectName;
    packageJson.description = projectDescription;
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2), {
        encoding: "utf8",
    });

    // Replace the APP_NAME to "const.mjs"
    const constPath = new URL(
        "./src/init/const.mjs",
        `file://${rootPath}/${workingDir}/`,
    );
    let constContent = fs.readFileSync(constPath, {
        encoding: "utf8",
    });
    constContent = constContent.replace(
        /APP_NAME\s*=\s*".*"/, `APP_NAME = "${projectName}"`,
    );
    constContent = constContent.replace(
        /APP_DESCRIPTION\s*=\s*".*"/, `APP_DESCRIPTION = "${projectDescription}"`,
    );
    fs.writeFileSync(constPath, constContent, {
        encoding: "utf8",
    });
}

// Print the success message
console.info();
console.info("Lævateinn has been initialized successfully.");
console.info(`Project Name: ${projectName}`);
console.info(`Project Description: ${projectDescription}`);
console.info(`Working Directory: ${workingDir}`);
console.info();
