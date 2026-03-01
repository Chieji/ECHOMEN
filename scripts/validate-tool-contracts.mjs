import { readFileSync } from 'node:fs';
import ts from 'typescript';

const TOOLS_PATH = new URL('../services/tools.ts', import.meta.url).pathname;
const sourceCode = readFileSync(TOOLS_PATH, 'utf8');
const sourceFile = ts.createSourceFile(TOOLS_PATH, sourceCode, ts.ScriptTarget.Latest, true);

/**
 * Robustly finds an exported variable by name, even if it's assigned from another identifier.
 */
function getExportedVariableInitializer(sourceFile, name) {
  let initializer = null;

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isVariableStatement(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.name.text === name) {
          initializer = decl.initializer;
          
          // If it's just an identifier, try to find the actual initializer it refers to
          if (initializer && ts.isIdentifier(initializer)) {
            const referredName = initializer.text;
            initializer = findLocalVariableInitializer(sourceFile, referredName) || initializer;
          }
        }
      }
    }
  });

  return initializer;
}

function findLocalVariableInitializer(sourceFile, name) {
  let initializer = null;
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.name.text === name) {
          initializer = decl.initializer;
        }
      }
    }
  });
  return initializer;
}

/**
 * Extracts tool names from the toolDeclarations array.
 */
function readToolDeclarations(initializer) {
  if (!initializer || !ts.isArrayLiteralExpression(initializer)) return [];
  
  const names = [];
  for (const element of initializer.elements) {
    if (!ts.isObjectLiteralExpression(element)) continue;
    
    for (const prop of element.properties) {
      if (ts.isPropertyAssignment(prop) && 
          ts.isIdentifier(prop.name) && 
          prop.name.text === 'name' && 
          ts.isStringLiteral(prop.initializer)) {
        names.push(prop.initializer.text);
      }
    }
  }
  return names;
}

/**
 * Extracts tool names from the availableTools object literal.
 * Handles PropertyAssignment, MethodDeclaration, and ShorthandPropertyAssignment.
 */
function readAvailableTools(initializer) {
  if (!initializer || !ts.isObjectLiteralExpression(initializer)) return [];
  
  const names = [];
  for (const property of initializer.properties) {
    // 1. PropertyAssignment: { myTool: ... }
    if (ts.isPropertyAssignment(property)) {
      if (ts.isIdentifier(property.name)) {
        names.push(property.name.text);
      } else if (ts.isStringLiteral(property.name)) {
        names.push(property.name.text);
      }
    } 
    // 2. MethodDeclaration: { myTool() { ... } }
    else if (ts.isMethodDeclaration(property)) {
      if (ts.isIdentifier(property.name)) {
        names.push(property.name.text);
      }
    }
    // 3. ShorthandPropertyAssignment: { myTool }
    else if (ts.isShorthandPropertyAssignment(property)) {
      names.push(property.name.text);
    }
  }
  return names;
}

const declarationsInitializer = getExportedVariableInitializer(sourceFile, 'toolDeclarations');
const implementationsInitializer = getExportedVariableInitializer(sourceFile, 'availableTools');

const declarationNames = readToolDeclarations(declarationsInitializer);
const implementationNames = readAvailableTools(implementationsInitializer);

if (declarationNames.length === 0 || implementationNames.length === 0) {
  console.error('Could not find toolDeclarations or availableTools exports in services/tools.ts');
  process.exit(1);
}

const declarationSet = new Set(declarationNames);
const implementationSet = new Set(implementationNames);

const missingImplementations = declarationNames.filter(name => !implementationSet.has(name));
const missingDeclarations = implementationNames.filter(name => !declarationSet.has(name));

let hasError = false;

if (missingImplementations.length > 0) {
  console.error('\x1b[31mError: Declared tools without implementations:\x1b[0m', missingImplementations.join(', '));
  hasError = true;
}

if (missingDeclarations.length > 0) {
  console.error('\x1b[31mError: Implemented tools missing declarations:\x1b[0m', missingDeclarations.join(', '));
  hasError = true;
}

if (hasError) {
  process.exit(1);
}

console.log(`\x1b[32mSuccess: Validated ${declarationNames.length} tools. All declarations have matching implementations.\x1b[0m`);
