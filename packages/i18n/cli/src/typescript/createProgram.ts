import * as ts from 'typescript';
import { dirname, resolve } from 'path';

export function createProgram(tsConfigSearchPath: string): ts.Program {
	const configPath = ts.findConfigFile(
		tsConfigSearchPath,
		ts.sys.fileExists,
		'tsconfig.json'
	);

	const parseConfigHost: ts.ParseConfigHost = {
		fileExists: ts.sys.fileExists,
		readFile: ts.sys.readFile,
		readDirectory: ts.sys.readDirectory,
		useCaseSensitiveFileNames: true,
	};

	if (!configPath) {
		throw new Error();
	}

	const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

	const compilerOptions = ts.parseJsonConfigFileContent(
		configFile.config,
		parseConfigHost,
		resolve(dirname(configPath))
	);
	const host = ts.createCompilerHost(compilerOptions.options, true);
	const prog = ts.createProgram(
		compilerOptions.fileNames,
		compilerOptions.options,
		host
	);
	return prog;
}
