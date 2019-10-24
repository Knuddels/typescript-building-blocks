import ts = require('typescript');

export function findTsConfigFile(tsConfigSearchPath: string): string {
	const configPath = ts.findConfigFile(
		tsConfigSearchPath,
		ts.sys.fileExists,
		'tsconfig.json'
	);
	if (!configPath) {
		throw new Error("Could not find a valid 'tsconfig.json'.");
	}
	return configPath;
}
