import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../services/tools.ts', import.meta.url), 'utf8');

const declarationMatch = source.match(/export const toolDeclarations:[\s\S]*?=\s*\[(?<body>[\s\S]*?)\n\];/);
const availableMatch = source.match(/export const availableTools:[\s\S]*?=\s*\{(?<body>[\s\S]*?)\n\};/);

if (!declarationMatch?.groups?.body || !availableMatch?.groups?.body) {
  console.error('Could not parse tools.ts for tool declarations/implementations.');
  process.exit(1);
}

const declarationNames = Array.from(
  declarationMatch.groups.body.matchAll(/\bname:\s*'([^']+)'/g),
  (m) => m[1],
);

const implementationNames = Array.from(
  availableMatch.groups.body.matchAll(/\n\s*([A-Za-z0-9_]+)\s*:/g),
  (m) => m[1],
);

const declarationSet = new Set(declarationNames);
const implementationSet = new Set(implementationNames);

const missingImplementations = declarationNames.filter((name) => !implementationSet.has(name));
const missingDeclarations = implementationNames.filter((name) => !declarationSet.has(name));

if (missingImplementations.length || missingDeclarations.length) {
  if (missingImplementations.length) {
    console.error('Declared tools without implementations:', missingImplementations.join(', '));
  }
  if (missingDeclarations.length) {
    console.error('Implemented tools missing declarations:', missingDeclarations.join(', '));
  }
  process.exit(1);
}

console.log(`Validated ${declarationNames.length} tools: declarations and implementations are aligned.`);
