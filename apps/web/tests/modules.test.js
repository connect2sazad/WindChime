// Source-structure checks for module boundaries and import cycles.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as espree from 'espree';
const root = fileURLToPath(new URL('../src/', import.meta.url));
function collect(dir) {
    return fs
        .readdirSync(dir, { withFileTypes: true })
        .flatMap((entry) =>
            entry.isDirectory()
                ? collect(path.join(dir, entry.name))
                : [path.join(dir, entry.name)],
        );
}
const sources = collect(root).filter((file) => /\.(js|jsx)$/.test(file));
const graph = new Map();
for (const file of sources) {
    const ast = espree.parse(fs.readFileSync(file, 'utf8'), {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
    });
    const imports = ast.body
        .filter(
            (node) =>
                node.source &&
                ['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(
                    node.type,
                ),
        )
        .map((node) => node.source.value)
        .filter((value) => value.startsWith('.'))
        .map((value) => path.resolve(path.dirname(file), value));
    graph.set(file, imports);
}

test('every local frontend module import resolves', () => {
    for (const [file, imports] of graph)
        for (const imported of imports)
            assert.ok(
                fs.existsSync(imported),
                path.relative(root, file) + ' imports missing ' + path.relative(root, imported),
            );
});
test('shared UI and utilities never depend on feature modules or app composition', () => {
    for (const [file, imports] of graph)
        if (file.startsWith(path.join(root, 'shared') + path.sep))
            for (const imported of imports)
                assert.ok(
                    imported.startsWith(path.join(root, 'shared') + path.sep),
                    'Shared dependency violation: ' + path.relative(root, file),
                );
});
test('frontend JavaScript import graph has no circular dependencies', () => {
    const visited = new Set(),
        active = new Set();
    function visit(file) {
        if (visited.has(file) || !graph.has(file)) return;
        assert.ok(!active.has(file), 'Circular module dependency at ' + path.relative(root, file));
        active.add(file);
        for (const imported of graph.get(file)) visit(imported);
        active.delete(file);
        visited.add(file);
    }
    for (const file of graph.keys()) visit(file);
});
