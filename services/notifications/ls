/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : ls
 *  Module        : Development Utilities
 *  Type          : Directory Tree Utility
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Provides a command-line utility for recursively displaying the project's
 *  directory and file structure in a readable tree format.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Read directories from the local file system
 *  - Recursively traverse project directories
 *  - Ignore excluded directories such as node_modules and .git
 *  - Sort directories before files
 *  - Sort entries alphabetically within their groups
 *  - Generate tree branches for files and directories
 *  - Print the project structure from the current working directory
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import fs from "node:fs";
import path from "node:path";

// ignore the below listed folders
const ignored = new Set(["node_modules", ".git"]);

function printTree(dir, prefix = "") {
    const entries = fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((entry) => !ignored.has(entry.name))
        .sort((a, b) => {
            // Directories first, then files
            if (a.isDirectory() !== b.isDirectory()) {
                return a.isDirectory() ? -1 : 1;
            }

            return a.name.localeCompare(b.name);
        });

    entries.forEach((entry, index) => {
        const isLast = index === entries.length - 1;
        const branch = isLast ? "└── " : "├── ";

        console.log(prefix + branch + entry.name);

        if (entry.isDirectory()) {
            printTree(
                path.join(dir, entry.name),
                prefix + (isLast ? "    " : "│   ")
            );
        }
    });
}

console.log(".");
printTree(process.cwd());