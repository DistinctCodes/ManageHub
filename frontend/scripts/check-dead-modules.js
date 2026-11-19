#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EXTENSIONS = ['.ts', '.tsx'];
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'coverage',
  'test-results',
  'playwright-report',
]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) out.push(...walk(full));
    } else if (entry.isFile() && EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/');
const moduleOf = (file) => rel(file).replace(/\.(ts|tsx)$/, '');
const isTest = (file) =>
  /(^|\/)(__tests__|e2e)\//.test(file) || /\.(test|spec)\.(ts|tsx)$/.test(file);
const isEntrypoint = (file) =>
  /(^|\/)(page|layout|route|loading|error|global-error|template|default|not-found|manifest|robots|sitemap|instrumentation)\.(ts|tsx)$/.test(file) ||
  file === 'middleware.ts' ||
  file === 'vitest.setup.ts' ||
  file.endsWith('.config.ts') ||
  file.startsWith('scripts/');

function normalizeSpecifier(specifier) {
  return specifier.replace(/\.(ts|tsx)$/, '');
}

function resolveImport(fromFile, specifier, moduleSet) {
  let base;
  if (specifier.startsWith('@/')) {
    base = normalizeSpecifier(specifier.slice(2));
  } else if (specifier.startsWith('.')) {
    base = path.posix.normalize(
      path.posix.join(path.posix.dirname(moduleOf(fromFile)), normalizeSpecifier(specifier)),
    );
  } else {
    return null;
  }
  for (const candidate of [base, `${base}/index`]) {
    if (moduleSet.has(candidate)) return candidate;
  }
  return null;
}

function main() {
  const allFiles = walk(ROOT).map(rel);
  const sourceFiles = allFiles.filter((file) => !isTest(file));
  const moduleSet = new Set(sourceFiles.map(moduleOf));
  const importers = new Map();
  for (const modulePath of moduleSet) importers.set(modulePath, []);

  const importRe = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;
  for (const file of allFiles) {
    const contents = fs.readFileSync(path.join(ROOT, file), 'utf8');
    let match;
    while ((match = importRe.exec(contents)) !== null) {
      const target = resolveImport(file, match[1], moduleSet);
      if (target && importers.has(target)) {
        importers.get(target).push({ file, spec: isTest(file) });
      }
    }
  }

  const dead = [];
  for (const [modulePath, entries] of importers) {
    const file = `${modulePath}.tsx`;
    if (isEntrypoint(file) || isEntrypoint(`${modulePath}.ts`)) continue;
    const nonSpecImporters = entries.filter((entry) => !entry.spec);
    if (nonSpecImporters.length === 0) {
      dead.push({ modulePath, specOnly: entries.length > 0 });
    }
  }

  if (dead.length === 0) {
    console.log('No dead frontend modules found.');
    return;
  }

  dead.sort((a, b) => a.modulePath.localeCompare(b.modulePath));
  console.error(
    `Found ${dead.length} dead module(s) under frontend/ (imported by nothing ` +
      'but tests, if at all):',
  );
  for (const { modulePath, specOnly } of dead) {
    console.error(`  frontend/${modulePath}${specOnly ? ' (spec-only)' : ''}`);
  }
  console.error('\nWire them into the call path or delete them (issue #2134).');
  process.exitCode = 1;
}

main();
