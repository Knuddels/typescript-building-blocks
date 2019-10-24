import ts = require('typescript');
import { resolve } from 'path';

export function findTsConfigFile(tsConfigSearchPath: string): string {
	const configPath = ts.findConfigFile(
		tsConfigSearchPath,
		ts.sys.fileExists,
		'tsconfig.json'
	);
	if (!configPath) {
		throw new Error("Could not find a valid 'tsconfig.json'.");
	}
	const path = resolve(configPath);
	return path;
}
