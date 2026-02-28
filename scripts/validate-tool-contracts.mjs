import { readFileSync } from 'node:fs';
import ts from 'typescript';

const filePath = new URL('../services/tools.ts', import.meta.url);
const source = readFileSync(filePath, 'utf8');
const sourceFile = ts.createSourceFile(filePath.pathname, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

function getExportedVariable(name) {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;

    const hasExportModifier = statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!hasExportModifier) continue;

    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === name && declaration.initializer) {
        return declaration.initializer;
      }
    }
  }

  return null;
}

function readToolDeclarations(initializer) {
  if (!ts.isArrayLiteralExpression(initializer)) {
    throw new Error('toolDeclarations is not an array literal.');
  }

  const names = [];

  for (const element of initializer.elements) {
    if (!ts.isObjectLiteralExpression(element)) continue;

    const nameProperty = element.properties.find((property) => {
      if (!ts.isPropertyAssignment(property)) return false;
      if (!ts.isIdentifier(property.name) && !ts.isStringLiteral(property.name)) return false;
      return property.name.text === 'name';
    });

    if (!nameProperty || !ts.isPropertyAssignment(nameProperty) || !ts.isStringLiteral(nameProperty.initializer)) {
      continue;
    }

    names.push(nameProperty.initializer.text);
  }

  return names;
}

function readAvailableTools(initializer) {
  if (!ts.isObjectLiteralExpression(initializer)) {
    throw new Error('availableTools is not an object literal.');
  }

  const names = [];

  for (const property of initializer.properties) {
    if (!ts.isPropertyAssignment(property) && !ts.isMethodDeclaration(property)) continue;

    if (ts.isComputedPropertyName(property.name)) continue;

    if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) {
      names.push(property.name.text);
    }
  }

  return names;
}

const toolDeclarationsInitializer = getExportedVariable('toolDeclarations');
const availableToolsInitializer = getExportedVariable('availableTools');

if (!toolDeclarationsInitializer || !availableToolsInitializer) {
  console.error('Could not locate exported toolDeclarations/availableTools in services/tools.ts.');
  process.exit(1);
}

let declarationNames;
let implementationNames;

try {
  declarationNames = readToolDeclarations(toolDeclarationsInitializer);
  implementationNames = readAvailableTools(availableToolsInitializer);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

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
