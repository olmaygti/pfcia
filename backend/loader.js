import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve as resolvePath, dirname, extname } from 'node:path';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRootPath = resolvePath(__dirname, 'src');
const srcRoot = pathToFileURL(srcRootPath).href + '/';

// Load @babel/core via require (it's CJS) to transform source files at runtime
const require = createRequire(import.meta.url);
const babel = require('@babel/core');

/**
 * Resolve a filesystem path to a concrete .js file:
 * - If the path is a directory, try index.js inside it
 * - If the path has no extension, try appending .js
 * Returns the resolved path string, or null if nothing was found.
 */
function resolveToFile(fsPath) {
	if (existsSync(fsPath)) {
		if (statSync(fsPath).isDirectory()) {
			const idx = resolvePath(fsPath, 'index.js');
			return existsSync(idx) ? idx : null;
		}
		return fsPath;
	}
	if (!extname(fsPath)) {
		const withExt = fsPath + '.js';
		return existsSync(withExt) ? withExt : null;
	}
	return null;
}

export function resolve(specifier, context, nextResolve) {
	// @/ alias → src/
	if (specifier.startsWith('@/')) {
		const fsPath = resolvePath(srcRootPath, specifier.slice(2));
		const resolved = resolveToFile(fsPath);
		if (resolved) {
			return nextResolve(pathToFileURL(resolved).href, context);
		}
	}

	// Extensionless or directory relative imports from within src/
	if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL) {
		const parentPath = fileURLToPath(context.parentURL);
		if (parentPath.startsWith(srcRootPath)) {
			const fsPath = resolvePath(dirname(parentPath), specifier);
			const resolved = resolveToFile(fsPath);
			if (resolved) {
				return nextResolve(pathToFileURL(resolved).href, context);
			}
		}
	}

	return nextResolve(specifier, context);
}

export function load(url, context, nextLoad) {
	// Only transform our own src/ files (skip node_modules, loader itself, etc.)
	if (url.startsWith(srcRoot) && url.endsWith('.js')) {
		const filePath = fileURLToPath(url);
		const source = readFileSync(filePath, 'utf8');
		const result = babel.transformSync(source, {
			filename: filePath,
			configFile: false, // don't load babel.config.json here
			babelrc: false,
			plugins: [
				['@babel/plugin-proposal-decorators', { legacy: true }],
			],
			// Keep output as ESM — Node 24 handles everything else natively
			sourceType: 'module',
		});
		return { format: 'module', source: result.code, shortCircuit: true };
	}
	return nextLoad(url, context);
}
