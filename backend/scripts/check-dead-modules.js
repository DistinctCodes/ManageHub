#!/usr/bin/env node
/**
 * Fails when a non-test module under `src/` is imported by nothing but its
 * own spec file (issue #1949).
 *
 * Why not ts-prune: ts-prune reports unused *exports*, including symbols
 * that are exported purely for use inside their own module ("used in
 * module"). That is a different, much broader concern than the one this
 * issue raises — a module that exists but is never wired into the running
 * application. This check is deliberately scoped to the acceptance
 * criterion: every non-test module must be reachable from the application
 * (or from another non-test module), not just referenced by a spec.
 *
 * The following are treated as entrypoints and never reported:
 *  - `src/main.ts`               (the Nest bootstrap)
 *  - `src/database/data-source.ts` (the TypeORM CLI entrypoint)
 *  - `src/database/migrations/**`  (discovered by the CLI, not imported)
 *  - `src/**​/testing/**`           (shared test doubles/support)
 *
 * Exits 0 when clean, 1 when a dead module is found.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SOURCE_ROOT = path.resolve(__dirname, '..', 'src');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

const rel = (file) => path.relative(SOURCE_ROOT, file).split(path.sep).join('/');
const moduleOf = (file) => rel(file).replace(/\.ts$/, '');

const isSpec = (file) => file.endsWith('.spec.ts');
const isDeclaration = (file) => file.endsWith('.d.ts');

const ENTRYPOINT_PATTERNS = [
  /^main$/,
  /^database\/data-source$/,
  /^database\/migrations\//,
  /(^|\/)testing\//,
];

const isAllowedEntrypoint = (modulePath) =>
  ENTRYPOINT_PATTERNS.some((pattern) => pattern.test(modulePath));

/**
 * Resolves a relative import specifier to a module path relative to
 * `src/`, mirroring TypeScript resolution for the forms this codebase uses:
 * `./foo`, `./foo.ts`, and `./foo/index.ts` (directory imports).
 */
function resolveImport(fromFile, specifier, moduleSet) {
  if (!specifier.startsWith('.')) return null;

  const fromDir = path.dirname(moduleOf(fromFile));
  const base = path.posix.normalize(path.posix.join(fromDir, specifier));

  for (const candidate of [base, `${base}/index`]) {
    if (moduleSet.has(candidate)) return candidate;
  }
  return null;
}

function collectModules() {
  const allFiles = walk(SOURCE_ROOT);
  const sourceFiles = allFiles.filter(
    (file) => !isSpec(file) && !isDeclaration(file),
  );
  const specFiles = allFiles.filter(isSpec);
  const moduleSet = new Set(sourceFiles.map(moduleOf));
  return { sourceFiles, specFiles, moduleSet };
}

function moduleImportedBy(sourceFiles, specFiles, moduleSet) {
  const importers = new Map();
  for (const modulePath of moduleSet) importers.set(modulePath, []);

  const scan = (files, isSpecImporter) => {
    for (const file of files) {
      const contents = fs.readFileSync(file, 'utf8');
      const importRe = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRe.exec(contents)) !== null) {
        const target = resolveImport(file, match[1], moduleSet);
        if (target) {
          importers.get(target).push({
            file: moduleOf(file),
            spec: isSpecImporter,
          });
        }
      }
    }
  };

  scan(sourceFiles, false);
  scan(specFiles, true);
  return importers;
}

function main() {
  const { sourceFiles, specFiles, moduleSet } = collectModules();
  const importers = moduleImportedBy(sourceFiles, specFiles, moduleSet);

  const dead = [];
  for (const [modulePath, entries] of importers) {
    if (isAllowedEntrypoint(modulePath)) continue;
    const nonSpecImporters = entries.filter((entry) => !entry.spec);
    if (nonSpecImporters.length === 0) {
      const specOnly = entries.length > 0;
      dead.push({ modulePath, specOnly });
    }
  }

  if (dead.length === 0) {
    console.log('No dead backend modules found.');
    return;
  }

  dead.sort((a, b) => a.modulePath.localeCompare(b.modulePath));
  console.error(
    `Found ${dead.length} dead module(s) under src/ (imported by nothing ` +
      'but their own spec, if at all):',
  );
  for (const { modulePath, specOnly } of dead) {
    console.error(`  src/${modulePath}.ts${specOnly ? ' (spec-only)' : ''}`);
  }
  console.error(
    '\nWire them into the call path or delete them and their spec ' +
      '(see issue #1949).',
  );
  process.exitCode = 1;
}

main();
