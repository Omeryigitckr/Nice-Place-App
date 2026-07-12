#!/usr/bin/env node
/**
 * Verifies that all locale JSON files share the same key structure.
 * Exit 0 on success, 1 on missing/extra keys or invalid JSON.
 */

const fs = require('fs');
const path = require('path');

const RESOURCES_DIR = path.join(__dirname, '..', 'src', 'i18n', 'resources');
const LOCALES = ['en', 'tr', 'es', 'de', 'ru'];

function flattenKeys(value, prefix = '', out = []) {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      const next = prefix ? `${prefix}.${key}` : key;
      flattenKeys(child, next, out);
    }
    return out;
  }
  out.push(prefix);
  return out;
}

function loadLocale(code) {
  const filePath = path.join(RESOURCES_DIR, `${code}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing translation file: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${code}.json: ${error.message}`);
  }
  return { filePath, keys: new Set(flattenKeys(parsed)) };
}

function main() {
  const loaded = {};
  const errors = [];

  for (const code of LOCALES) {
    try {
      loaded[code] = loadLocale(code);
    } catch (error) {
      errors.push(error.message);
    }
  }

  if (errors.length > 0) {
    for (const message of errors) {
      console.error(`✗ ${message}`);
    }
    process.exit(1);
  }

  const reference = loaded.en.keys;
  let failed = false;

  for (const code of LOCALES) {
    if (code === 'en') {
      continue;
    }

    const keys = loaded[code].keys;
    const missing = [...reference].filter((key) => !keys.has(key)).sort();
    const extra = [...keys].filter((key) => !reference.has(key)).sort();

    if (missing.length === 0 && extra.length === 0) {
      console.log(`✓ ${code}.json matches en.json (${keys.size} keys)`);
      continue;
    }

    failed = true;
    console.error(`✗ ${code}.json differs from en.json`);
    if (missing.length > 0) {
      console.error(`  Missing (${missing.length}):`);
      for (const key of missing) {
        console.error(`    - ${key}`);
      }
    }
    if (extra.length > 0) {
      console.error(`  Extra (${extra.length}):`);
      for (const key of extra) {
        console.error(`    + ${key}`);
      }
    }
  }

  if (failed) {
    process.exit(1);
  }

  console.log(`✓ All ${LOCALES.length} locales share ${reference.size} keys`);
}

main();
